'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useStudioStore } from '@/store/store';
import { ShaderRenderer } from '@/lib/renderer';
import { buildSVGTransform, buildSVGFilter } from '@/lib/svg-renderer';

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShaderRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shaderError, setShaderError] = useState<string | null>(null);

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
        const err = renderer.getLastError();
        console.error('Failed to compile shader:', err);
        setShaderError(err || 'Unknown compilation error');
      } else {
        setShaderError(null);
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
      {shaderError && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-900/90 border-t border-red-500/50 p-3 max-h-32 overflow-y-auto">
          <div className="flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-red-300 text-xs font-semibold mb-1">Shader Compilation Error</p>
              <pre className="text-red-200/80 text-[10px] leading-relaxed whitespace-pre-wrap font-mono">{shaderError}</pre>
            </div>
            <button
              onClick={() => setShaderError(null)}
              className="text-red-400 hover:text-red-200 flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in': return t * t;
    case 'ease-out': return t * (2 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'linear': return t;
    default: return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}

function SVGPreview() {
  const { activeSVGAnimation, isPlaying, currentTime, duration, setCurrentTime } = useStudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<{ wall: number; offset: number }>({ wall: 0, offset: 0 });

  // Animate when playing
  useEffect(() => {
    if (!activeSVGAnimation || !isPlaying) return;

    startRef.current = { wall: performance.now() / 1000, offset: currentTime };

    const tick = () => {
      const now = performance.now() / 1000;
      const t = startRef.current.offset + (now - startRef.current.wall);
      setCurrentTime(t);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [activeSVGAnimation, isPlaying, setCurrentTime]);

  // Interpolate keyframes at current time
  const props = useMemo(() => {
    if (!activeSVGAnimation) return {};
    const dur = activeSVGAnimation.duration || duration || 1;
    const normalizedTime = dur > 0 ? (currentTime % dur) / dur : 0;
    const kfs = activeSVGAnimation.keyframes;
    if (!kfs || kfs.length === 0) return {};

    if (kfs.length === 1) return kfs[0].properties as Record<string, number>;

    let prevKf = kfs[0];
    let nextKf = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (normalizedTime >= kfs[i].time && normalizedTime <= kfs[i + 1].time) {
        prevKf = kfs[i];
        nextKf = kfs[i + 1];
        break;
      }
    }

    const segLen = nextKf.time - prevKf.time;
    const segT = segLen > 0 ? (normalizedTime - prevKf.time) / segLen : 0;
    const easedT = applyEasing(segT, activeSVGAnimation.easing);

    const result: Record<string, number> = {};
    const allKeys = new Set([
      ...Object.keys(prevKf.properties),
      ...Object.keys(nextKf.properties),
    ]);
    for (const key of allKeys) {
      const a = (prevKf.properties[key] as number) ?? 0;
      const b = (nextKf.properties[key] as number) ?? a;
      result[key] = lerp(a, b, easedT);
    }
    return result;
  }, [activeSVGAnimation, currentTime, duration]);

  if (!activeSVGAnimation) return null;

  const transform = buildSVGTransform(props as Record<string, number>);
  const filter = buildSVGFilter(props as Record<string, number>);
  const opacity = (props as Record<string, number>).opacity ?? 1;

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center rounded-lg overflow-hidden"
      style={{ backgroundColor: activeSVGAnimation.backgroundColor || '#000' }}
    >
      <div
        style={{
          width: '50%',
          height: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform,
          filter: filter || undefined,
          opacity,
          transition: 'none',
          transformOrigin: 'center center',
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: activeSVGAnimation.svgContent }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </div>
    </div>
  );
}
