'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/store/store';
import { SHADER_TEMPLATES } from '@/shaders/templates';
import type { AnimationTemplate } from '@/types';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'particles', label: 'Particles' },
  { id: 'waves', label: 'Waves' },
  { id: 'geometry', label: 'Geometry' },
  { id: 'noise', label: 'Noise' },
  { id: 'gradient', label: 'Gradient' },
];

export function TemplatePanel() {
  const [category, setCategory] = useState('all');
  const { setActiveTemplate, activeTemplate, resetUniformOverrides, setCustomShaderCode } =
    useStudioStore();

  const templates =
    category === 'all'
      ? SHADER_TEMPLATES
      : SHADER_TEMPLATES.filter((t) => t.category === category);

  const handleSelect = (template: AnimationTemplate) => {
    setActiveTemplate(template);
    resetUniformOverrides();
    setCustomShaderCode('');
  };

  return (
    <div className="p-3">
      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              category === cat.id
                ? 'bg-indigo-500 text-white'
                : 'bg-studio-border text-studio-text-dim hover:text-studio-text'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="space-y-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              activeTemplate?.id === template.id
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-studio-border hover:border-studio-border/80 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-studio-text">{template.name}</h3>
              <span className="text-xs px-1.5 py-0.5 rounded bg-studio-border text-studio-text-dim">
                {template.category}
              </span>
            </div>
            <p className="text-xs text-studio-text-dim leading-relaxed">
              {template.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-studio-text-dim/60">
              <span>{template.uniforms.length} controls</span>
              <span>{template.duration}s default</span>
              <span>{template.fps} fps</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
