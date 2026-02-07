'use client';

import React, { useCallback } from 'react';
import { useStudioStore } from '@/store/store';
import { captureHighResFrame } from '@/lib/renderer';

export function Toolbar() {
  const {
    activeTemplate,
    customShaderCode,
    uniformOverrides,
    currentTime,
    exportSettings,
    activeTab,
  } = useStudioStore();

  const getShaderCode = () => {
    if (customShaderCode) return customShaderCode;
    if (activeTemplate) return activeTemplate.fragmentShader;
    return '';
  };

  const getUniformValues = () => {
    const values: Record<string, number | number[] | string> = {};
    if (activeTemplate) {
      for (const u of activeTemplate.uniforms) {
        values[u.name] = uniformOverrides[u.name] ?? u.value;
      }
    }
    return values;
  };

  const handleQuickCapture = useCallback(async () => {
    const shaderCode = getShaderCode();
    if (!shaderCode) return;

    try {
      const blob = await captureHighResFrame(
        shaderCode,
        getUniformValues(),
        currentTime,
        exportSettings.resolution.width,
        exportSettings.resolution.height,
        activeTemplate?.vertexShader,
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shader-frame-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Quick capture failed:', err);
    }
  }, [activeTemplate, uniformOverrides, customShaderCode, currentTime, exportSettings]);

  return (
    <div className="h-10 bg-studio-panel border-b border-studio-border px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-xs text-studio-text-dim">
        {activeTemplate && (
          <>
            <span className="text-studio-text font-medium">{activeTemplate.name}</span>
            <span className="text-studio-text-dim/40">|</span>
            <span>{activeTemplate.category}</span>
          </>
        )}
        {!activeTemplate && activeTab !== 'svg' && (
          <span>No shader loaded</span>
        )}
        {activeTab === 'svg' && <span>SVG Animation Mode</span>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-studio-text-dim">
          {exportSettings.resolution.width}x{exportSettings.resolution.height}
        </span>
        <button
          onClick={handleQuickCapture}
          disabled={!getShaderCode() && activeTab !== 'svg'}
          className="px-2.5 py-1 text-xs rounded bg-studio-border text-studio-text-dim hover:text-studio-text disabled:opacity-40 transition-colors"
          title="Quick capture current frame at export resolution"
        >
          Capture Frame
        </button>
      </div>
    </div>
  );
}
