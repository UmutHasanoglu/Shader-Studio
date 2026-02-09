'use client';

import React, { useState, useCallback } from 'react';
import { useStudioStore } from '@/store/store';
import { convertShadertoyShader, extractCustomUniforms, validateGLSL } from '@/lib/shadertoy';
import type { AnimationTemplate, ShaderUniform } from '@/types';

const EXAMPLE_SHADERS = [
  {
    name: 'Rainbow Spiral',
    code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  float spiral = sin(angle * 5.0 + radius * 10.0 - iTime * 3.0);
  float hue = fract(angle / 6.2832 + iTime * 0.1);
  vec3 col = 0.5 + 0.5 * cos(6.2832 * (hue + vec3(0.0, 0.33, 0.67)));
  col *= smoothstep(0.0, 0.02, spiral * 0.5 + 0.5);
  col *= smoothstep(1.0, 0.3, radius);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Metaballs',
    code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime;
  float v = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 pos = vec2(
      0.5 + 0.3 * sin(t * (0.5 + fi * 0.2) + fi),
      0.5 + 0.3 * cos(t * (0.4 + fi * 0.15) + fi * 2.0)
    );
    v += 0.01 / pow(length(uv - pos), 2.0);
  }
  vec3 col = vec3(0.0);
  col += vec3(0.2, 0.5, 1.0) * smoothstep(0.9, 1.1, v * 0.01);
  col += vec3(1.0, 0.3, 0.5) * smoothstep(1.5, 2.0, v * 0.01);
  col += vec3(1.0, 0.9, 0.5) * smoothstep(3.0, 4.0, v * 0.01);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Warp Speed',
    code: `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float t = iTime;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 80; i++) {
    float fi = float(i);
    float z = fract(fi * 0.0137 + t * 0.3);
    float size = mix(0.01, 0.001, z);
    vec2 pos = vec2(hash(vec2(fi, 0.0)) - 0.5, hash(vec2(0.0, fi)) - 0.5);
    pos /= z;
    float d = length(uv - pos);
    float star = size / d;
    star *= smoothstep(1.0, 0.3, z);
    col += vec3(0.6, 0.8, 1.0) * star;
  }
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Noise Texture (iChannel)',
    code: `// Uses iChannel0 noise texture
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime;

  // Sample noise texture at different scales
  vec3 n1 = texture(iChannel0, uv * 1.0 + t * 0.05).rgb;
  vec3 n2 = texture(iChannel0, uv * 2.0 - t * 0.03).rgb;
  vec3 n3 = texture(iChannel0, uv * 4.0 + vec2(t * 0.02, -t * 0.04)).rgb;

  float fbm = n1.r * 0.5 + n2.g * 0.3 + n3.b * 0.2;

  vec3 col = 0.5 + 0.5 * cos(fbm * 6.0 + iTime * 0.5 + vec3(0, 2, 4));
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Raymarched Terrain',
    code: `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

float terrain(vec2 p) {
  float h = 0.0; float a = 0.5; float f = 1.0;
  for(int i=0;i<6;i++){h+=a*noise(p*f);f*=2.0;a*=0.5;}
  return h;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5*iResolution.xy) / iResolution.y;
  float t = iTime * 0.3;

  vec3 ro = vec3(t, 1.5, t*0.5);
  vec3 rd = normalize(vec3(uv.x, uv.y-0.1, 1.0));

  // Raymarch terrain
  float dist = 0.0;
  for(int i=0; i<80; i++) {
    vec3 p = ro + rd * dist;
    float h = terrain(p.xz * 0.3) * 2.0;
    float d = p.y - h;
    if(d < 0.01 || dist > 50.0) break;
    dist += d * 0.5;
  }

  vec3 col;
  if(dist < 50.0) {
    vec3 p = ro + rd * dist;
    float h = terrain(p.xz * 0.3);
    vec2 e = vec2(0.01, 0.0);
    vec3 n = normalize(vec3(
      terrain((p.xz+e.xy)*0.3) - terrain((p.xz-e.xy)*0.3),
      0.02,
      terrain((p.xz+e.yx)*0.3) - terrain((p.xz-e.yx)*0.3)
    ));
    float sun = max(dot(n, normalize(vec3(0.8,0.4,0.2))), 0.0);
    col = mix(vec3(0.2,0.4,0.1), vec3(0.5,0.4,0.3), smoothstep(0.5,0.8,h));
    col *= 0.2 + 0.8 * sun;
    col = mix(col, vec3(0.5,0.6,0.7), 1.0-exp(-dist*0.04));
  } else {
    col = vec3(0.5,0.6,0.7) - rd.y*0.3;
  }
  col = pow(col, vec3(0.45));
  fragColor = vec4(col,1.0);
}`,
  },
];

export function ShadertoyPanel() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [lastImported, setLastImported] = useState<AnimationTemplate | null>(null);
  const {
    setCustomShaderCode,
    setActiveTemplate,
    resetUniformOverrides,
    savedTemplates,
    saveTemplate,
    removeSavedTemplate,
  } = useStudioStore();

  const doImport = useCallback((shaderCode: string): AnimationTemplate | null => {
    const validation = validateGLSL(shaderCode);
    if (!validation.valid) {
      setError(validation.error || 'Invalid shader code');
      return null;
    }

    setError(null);
    const converted = convertShadertoyShader(shaderCode);
    setCustomShaderCode(converted);

    const extractedUniforms = extractCustomUniforms(converted);
    const uniforms: ShaderUniform[] = extractedUniforms.map((u) => ({
      name: u.name,
      type: u.type as ShaderUniform['type'],
      value: u.type === 'float' ? 0.5 : 0,
      min: 0,
      max: 5.0,
      step: 0.01,
      label: u.name.replace(/^u_/, '').replace(/_/g, ' '),
    }));

    const template: AnimationTemplate = {
      id: 'shadertoy-' + Date.now(),
      name: 'Imported Shadertoy',
      category: 'custom',
      description: 'Imported from Shadertoy',
      fragmentShader: converted,
      uniforms,
      duration: 10,
      fps: 30,
    };

    resetUniformOverrides();
    setActiveTemplate(template);
    return template;
  }, [setCustomShaderCode, setActiveTemplate, resetUniformOverrides]);

  const handleImport = useCallback(() => {
    if (!code.trim()) {
      setError('Paste a Shadertoy shader to import');
      return;
    }
    const template = doImport(code);
    if (template) {
      setLastImported(template);
      setShowSave(false);
    }
  }, [code, doImport]);

  const handleSaveAsTemplate = useCallback(() => {
    if (!lastImported) return;
    const name = templateName.trim() || 'Custom Shader';
    const saved: AnimationTemplate = {
      ...lastImported,
      id: 'saved-' + Date.now(),
      name,
      description: 'Saved custom template',
    };
    saveTemplate(saved);
    setShowSave(false);
    setTemplateName('');
  }, [lastImported, templateName, saveTemplate]);

  const handleLoadSaved = (template: AnimationTemplate) => {
    setCustomShaderCode(template.fragmentShader);
    resetUniformOverrides();
    setActiveTemplate(template);
    setLastImported(template);
  };

  const handleLoadExample = (exampleCode: string) => {
    setCode(exampleCode);
  };

  return (
    <div className="p-3 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-studio-text mb-2">Shadertoy Import</h2>

      <p className="text-xs text-studio-text-dim mb-3">
        Paste shader code from{' '}
        <span className="text-indigo-400">shadertoy.com</span>. The converter handles{' '}
        <code className="text-indigo-400">mainImage()</code> format automatically.
        Supports all Shadertoy uniforms:{' '}
        <code className="text-indigo-400">iTime</code>,{' '}
        <code className="text-indigo-400">iResolution</code>,{' '}
        <code className="text-indigo-400">iFrame</code>,{' '}
        <code className="text-indigo-400">iMouse</code>,{' '}
        <code className="text-indigo-400">iDate</code>,{' '}
        <code className="text-indigo-400">iChannel0-3</code> (noise textures).
      </p>

      {/* Saved templates */}
      {savedTemplates.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-studio-text-dim mb-1.5">Saved templates:</p>
          <div className="flex flex-wrap gap-1.5">
            {savedTemplates.map((t) => (
              <div key={t.id} className="flex items-center gap-0.5">
                <button
                  onClick={() => handleLoadSaved(t)}
                  className="px-2 py-1 text-xs rounded bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 transition-colors border border-indigo-500/20"
                >
                  {t.name}
                </button>
                <button
                  onClick={() => removeSavedTemplate(t.id)}
                  className="p-0.5 text-studio-text-dim hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example shaders */}
      <div className="mb-3">
        <p className="text-xs text-studio-text-dim mb-1.5">Quick examples:</p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_SHADERS.map((ex) => (
            <button
              key={ex.name}
              onClick={() => handleLoadExample(ex.code)}
              className="px-2 py-1 text-xs rounded bg-studio-border text-studio-text-dim hover:text-studio-text hover:bg-studio-border/80 transition-colors"
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="code-editor flex-1 min-h-[200px]"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="// Paste your Shadertoy shader code here...
// Supports mainImage(out vec4 fragColor, in vec2 fragCoord) format

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
  fragColor = vec4(col, 1.0);
}"
        spellCheck={false}
      />

      {error && (
        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleImport}
        className="mt-2 w-full py-2 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
      >
        Import & Preview
      </button>

      {/* Save as Template */}
      {lastImported && (
        <div className="mt-2">
          {showSave ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name..."
                className="flex-1 px-2 py-1.5 text-xs bg-studio-bg border border-studio-border rounded text-studio-text outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAsTemplate();
                }}
                autoFocus
              />
              <button
                onClick={handleSaveAsTemplate}
                className="px-3 py-1.5 text-xs rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowSave(false)}
                className="px-2 py-1.5 text-xs rounded bg-studio-border text-studio-text-dim hover:text-studio-text transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="w-full py-1.5 rounded-lg text-xs font-medium bg-studio-border hover:bg-studio-border/80 text-studio-text-dim hover:text-studio-text transition-colors flex items-center justify-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save as Template
            </button>
          )}
        </div>
      )}
    </div>
  );
}
