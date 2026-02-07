'use client';

import React, { useState, useCallback } from 'react';
import { useStudioStore } from '@/store/store';
import { SHADERTOY_TEMPLATE } from '@/shaders/templates';
import { extractCustomUniforms, validateGLSL } from '@/lib/shadertoy';
import type { AnimationTemplate, ShaderUniform } from '@/types';

export function CodeEditorPanel() {
  const {
    customShaderCode,
    setCustomShaderCode,
    setActiveTemplate,
    resetUniformOverrides,
  } = useStudioStore();

  const [error, setError] = useState<string | null>(null);

  const handleApply = useCallback(() => {
    const code = customShaderCode.trim();
    if (!code) {
      setError('No shader code to compile');
      return;
    }

    const validation = validateGLSL(code);
    if (!validation.valid) {
      setError(validation.error || 'Invalid shader code');
      return;
    }

    setError(null);

    // Extract uniforms to create sliders
    const extractedUniforms = extractCustomUniforms(code);
    const uniforms: ShaderUniform[] = extractedUniforms.map((u) => ({
      name: u.name,
      type: u.type as ShaderUniform['type'],
      value: u.type === 'float' ? 0.5 : 0,
      min: 0,
      max: u.type === 'float' ? 5.0 : 10,
      step: 0.01,
      label: u.name.replace(/^u_/, '').replace(/_/g, ' '),
    }));

    const template: AnimationTemplate = {
      id: 'custom-' + Date.now(),
      name: 'Custom Shader',
      category: 'custom',
      description: 'User-written custom shader',
      fragmentShader: code,
      uniforms,
      duration: 10,
      fps: 30,
    };

    resetUniformOverrides();
    setActiveTemplate(template);
  }, [customShaderCode, setActiveTemplate, resetUniformOverrides]);

  const handleLoadTemplate = () => {
    setCustomShaderCode(SHADERTOY_TEMPLATE);
  };

  return (
    <div className="p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-studio-text">GLSL Editor</h2>
        <button
          onClick={handleLoadTemplate}
          className="text-xs px-2 py-1 rounded bg-studio-border text-studio-text-dim hover:text-studio-text transition-colors"
        >
          Load Template
        </button>
      </div>

      <p className="text-xs text-studio-text-dim mb-2">
        Write GLSL fragment shaders. Use <code className="text-indigo-400">iTime</code>,{' '}
        <code className="text-indigo-400">iResolution</code> as built-in uniforms.
        Add custom <code className="text-indigo-400">uniform float</code> declarations
        for auto-generated sliders.
      </p>

      <textarea
        className="code-editor flex-1 min-h-[300px]"
        value={customShaderCode}
        onChange={(e) => setCustomShaderCode(e.target.value)}
        placeholder="// Write your GLSL shader here...
precision highp float;
uniform float iTime;
uniform vec2 iResolution;

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
  gl_FragColor = vec4(col, 1.0);
}"
        spellCheck={false}
      />

      {error && (
        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleApply}
        className="mt-2 w-full py-2 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
      >
        Compile & Preview
      </button>
    </div>
  );
}
