'use client';

import React from 'react';
import { useStudioStore } from '@/store/store';

export function ControlPanel() {
  const {
    activeTemplate,
    uniformOverrides,
    setUniformOverride,
    resetUniformOverrides,
    duration,
    setDuration,
    fps,
    setFps,
  } = useStudioStore();

  if (!activeTemplate) {
    return (
      <div className="p-4 text-center text-studio-text-dim text-sm">
        <p>No template selected</p>
        <p className="text-xs mt-1 text-studio-text-dim/50">
          Select a template or write custom shader code
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-studio-text">Controls</h2>
        <button
          onClick={resetUniformOverrides}
          className="text-xs px-2 py-1 rounded bg-studio-border text-studio-text-dim hover:text-studio-text transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Animation settings */}
      <div className="mb-4 pb-3 border-b border-studio-border">
        <h3 className="text-xs font-medium text-studio-text-dim mb-2 uppercase tracking-wider">
          Animation
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-studio-text-dim">Duration</label>
              <span className="text-xs text-studio-text font-mono">{duration}s</span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-studio-text-dim">FPS</label>
              <span className="text-xs text-studio-text font-mono">{fps}</span>
            </div>
            <input
              type="range"
              min={15}
              max={60}
              step={1}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Shader uniforms */}
      <h3 className="text-xs font-medium text-studio-text-dim mb-2 uppercase tracking-wider">
        Shader Parameters
      </h3>
      <div className="space-y-3">
        {activeTemplate.uniforms.map((uniform) => {
          const value =
            (uniformOverrides[uniform.name] as number) ?? (uniform.value as number);
          return (
            <div key={uniform.name}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-studio-text-dim">
                  {uniform.label || uniform.name}
                </label>
                <span className="text-xs text-studio-text font-mono">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </span>
              </div>
              <input
                type="range"
                min={uniform.min ?? 0}
                max={uniform.max ?? 1}
                step={uniform.step ?? 0.01}
                value={value}
                onChange={(e) =>
                  setUniformOverride(uniform.name, Number(e.target.value))
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
