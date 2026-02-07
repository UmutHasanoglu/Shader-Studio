'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/store/store';
import { ShaderRenderer } from '@/lib/renderer';

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShaderRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    activeTemplate,
    isPlaying,
    setPlaying,
    currentTime,
    setCurrentTime,
    uniformOverrides,
    customShaderCode,
    activeSVGAnimation,
    activeTab,
  } = useStudioStore();

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new ShaderRenderer(canvasRef.current);
    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Compile shader when template changes
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    let shaderCode = '';
    if (customShaderCode && (activeTab === 'editor' || activeTab === 'shadertoy')) {
      shaderCode = customShaderCode;
    } else if (activeTemplate) {
      shaderCode = activeTemplate.fragmentShader;
    }

    if (shaderCode) {
      const success = renderer.compileShader(shaderCode, activeTemplate?.vertexShader);
      if (!success) {
        console.error('Failed to compile shader');
      }
    }
  }, [activeTemplate, customShaderCode, activeTab]);

  // Build uniform values
  const getUniformValues = useCallback(() => {
    const values: Record<string, number | number[] | string> = {};
    if (activeTemplate) {
      for (const u of activeTemplate.uniforms) {
        values[u.name] = uniformOverrides[u.name] ?? u.value;
      }
    }
    return values;
  }, [activeTemplate, uniformOverrides]);

  // Animation loop
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !activeTemplate) return;
    if (activeTab === 'svg') return;

    let animId: number;
    let startOffset = currentTime;
    let startWall = performance.now() / 1000;

    const render = () => {
      const now = performance.now() / 1000;
      let t: number;

      if (isPlaying) {
        t = startOffset + (now - startWall);
        setCurrentTime(t);
      } else {
        t = currentTime;
      }

      renderer.renderFrame(t, getUniformValues());
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeTemplate, isPlaying, uniformOverrides, activeTab, getUniformValues]);

  // Resize canvas to fit container while maintaining aspect ratio
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      const aspect = 16 / 9;
      let w = rect.width;
      let h = rect.height;

      if (w / h > aspect) {
        w = h * aspect;
      } else {
        h = w / aspect;
      }

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * window.devicePixelRatio);
      canvas.height = Math.round(h * window.devicePixelRatio);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      {activeTab === 'svg' && activeSVGAnimation ? (
        <SVGPreview />
      ) : (
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-2xl"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      )}
      {!activeTemplate && activeTab !== 'svg' && !customShaderCode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-studio-text-dim text-lg">Select a template to start</p>
            <p className="text-studio-text-dim/50 text-sm mt-1">
              Choose from Templates, paste Shadertoy code, or use AI Chat
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SVGPreview() {
  const { activeSVGAnimation, isPlaying, currentTime, duration } = useStudioStore();
  const containerRef = useRef<HTMLDivElement>(null);

  if (!activeSVGAnimation) return null;

  const normalizedTime = duration > 0 ? (currentTime % duration) / duration : 0;

  // Simple CSS-based preview (the actual export uses canvas rendering)
  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center rounded-lg overflow-hidden"
      style={{ backgroundColor: activeSVGAnimation.backgroundColor || '#000' }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: activeSVGAnimation.svgContent }}
        style={{
          width: '50%',
          height: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </div>
  );
}
