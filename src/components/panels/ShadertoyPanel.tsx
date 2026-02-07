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
];

export function ShadertoyPanel() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const {
    setCustomShaderCode,
    setActiveTemplate,
    resetUniformOverrides,
  } = useStudioStore();

  const handleImport = useCallback(() => {
    if (!code.trim()) {
      setError('Paste a Shadertoy shader to import');
      return;
    }

    const validation = validateGLSL(code);
    if (!validation.valid) {
      setError(validation.error || 'Invalid shader code');
      return;
    }

    setError(null);
    const converted = convertShadertoyShader(code);
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
  }, [code, setCustomShaderCode, setActiveTemplate, resetUniformOverrides]);

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
        Supports <code className="text-indigo-400">iTime</code>,{' '}
        <code className="text-indigo-400">iResolution</code>,{' '}
        <code className="text-indigo-400">iFrame</code>.
      </p>

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
        className="code-editor flex-1 min-h-[250px]"
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
    </div>
  );
}
