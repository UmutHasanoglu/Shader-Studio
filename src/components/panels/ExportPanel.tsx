'use client';

import React, { useCallback } from 'react';
import { useStudioStore } from '@/store/store';
import { exportVideo, captureHighResFrame } from '@/lib/renderer';
import { exportSVGVideo, renderSVGFrame } from '@/lib/svg-renderer';
import { RESOLUTIONS } from '@/types';

export function ExportPanel() {
  const {
    activeTemplate,
    uniformOverrides,
    customShaderCode,
    exportSettings,
    setExportSettings,
    isExporting,
    setExporting,
    exportProgress,
    setExportProgress,
    currentTime,
    activeTab,
    activeSVGAnimation,
    duration,
    fps,
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

  const handleExportVideo = useCallback(async () => {
    setExporting(true);
    setExportProgress(0);

    try {
      let blob: Blob;

      if (activeTab === 'svg' && activeSVGAnimation) {
        blob = await exportSVGVideo(
          activeSVGAnimation,
          exportSettings.resolution.width,
          exportSettings.resolution.height,
          exportSettings.fps,
          duration,
          setExportProgress,
        );
      } else {
        const shaderCode = getShaderCode();
        if (!shaderCode) {
          alert('No shader code to export');
          setExporting(false);
          return;
        }

        blob = await exportVideo(
          shaderCode,
          getUniformValues(),
          { ...exportSettings, duration, fps: exportSettings.fps },
          setExportProgress,
          activeTemplate?.vertexShader,
        );
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shader-studio-${Date.now()}.${exportSettings.format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err as Error).message);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }, [activeTemplate, uniformOverrides, customShaderCode, exportSettings, duration, activeTab, activeSVGAnimation]);

  const handleCaptureFrame = useCallback(async () => {
    try {
      let blob: Blob;

      if (activeTab === 'svg' && activeSVGAnimation) {
        const normalizedTime = duration > 0 ? (currentTime % duration) / duration : 0;
        const canvas = await renderSVGFrame(
          activeSVGAnimation,
          normalizedTime,
          exportSettings.resolution.width,
          exportSettings.resolution.height,
        );
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Failed'))),
            'image/png',
            1.0,
          );
        });
      } else {
        const shaderCode = getShaderCode();
        if (!shaderCode) {
          alert('No shader code to capture');
          return;
        }

        blob = await captureHighResFrame(
          shaderCode,
          getUniformValues(),
          currentTime,
          exportSettings.resolution.width,
          exportSettings.resolution.height,
          activeTemplate?.vertexShader,
        );
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shader-studio-frame-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Capture failed:', err);
      alert('Capture failed: ' + (err as Error).message);
    }
  }, [activeTemplate, uniformOverrides, customShaderCode, currentTime, exportSettings, activeTab, activeSVGAnimation, duration]);

  return (
    <div className="p-3">
      <h2 className="text-sm font-semibold text-studio-text mb-3">Export Settings</h2>

      {/* Resolution */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5">Resolution</label>
        <div className="space-y-1.5">
          {RESOLUTIONS.map((res) => (
            <button
              key={res.label}
              onClick={() => setExportSettings({ resolution: res })}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                exportSettings.resolution.width === res.width
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim hover:text-studio-text'
              }`}
            >
              <div className="flex justify-between">
                <span>{res.label}</span>
                <span className="text-studio-text-dim/50">
                  {res.width}x{res.height}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5">Export FPS</label>
        <div className="flex gap-2">
          {[24, 30, 60].map((f) => (
            <button
              key={f}
              onClick={() => setExportSettings({ fps: f })}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                exportSettings.fps === f
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim'
              }`}
            >
              {f} fps
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5">Format</label>
        <div className="flex gap-2">
          {(['webm', 'mp4'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setExportSettings({ format: fmt })}
              className={`flex-1 py-1.5 text-xs rounded-lg uppercase transition-colors ${
                exportSettings.format === fmt
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-studio-text-dim">Quality</label>
          <span className="text-xs text-studio-text font-mono">
            {Math.round(exportSettings.quality * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={exportSettings.quality}
          onChange={(e) => setExportSettings({ quality: Number(e.target.value) })}
        />
      </div>

      {/* Export info */}
      <div className="mb-4 p-2.5 rounded-lg bg-studio-border/30 text-xs text-studio-text-dim">
        <div className="flex justify-between mb-1">
          <span>Resolution</span>
          <span>{exportSettings.resolution.width}x{exportSettings.resolution.height}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Duration</span>
          <span>{duration}s</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Total Frames</span>
          <span>{Math.ceil(duration * exportSettings.fps)}</span>
        </div>
        <div className="flex justify-between">
          <span>Est. File Size</span>
          <span>
            ~{Math.round(
              (exportSettings.resolution.width *
                exportSettings.resolution.height *
                exportSettings.fps *
                duration *
                exportSettings.quality *
                0.15) /
                1024 /
                1024,
            )}{' '}
            MB
          </span>
        </div>
      </div>

      {/* Export progress */}
      {isExporting && (
        <div className="mb-4">
          <div className="h-2 bg-studio-border rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${exportProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-studio-text-dim text-center mt-1">
            Rendering frame {Math.round(exportProgress * duration * exportSettings.fps)}/
            {Math.ceil(duration * exportSettings.fps)}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={handleExportVideo}
          disabled={isExporting}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isExporting
              ? 'bg-studio-border text-studio-text-dim cursor-not-allowed'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
          }`}
        >
          {isExporting ? 'Exporting...' : 'Export Video'}
        </button>

        <button
          onClick={handleCaptureFrame}
          disabled={isExporting}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-studio-border hover:bg-studio-border/80 text-studio-text transition-colors"
        >
          Capture 4K Frame (PNG)
        </button>
      </div>

      {/* Stock footage tips */}
      <div className="mt-4 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-xs text-amber-300/80 font-medium mb-1">Stock Footage Tips</p>
        <ul className="text-xs text-amber-300/60 space-y-0.5 list-disc list-inside">
          <li>Export at 4K (3840x2160) for maximum earnings</li>
          <li>Use 30fps for standard or 60fps for smooth motion</li>
          <li>10-30 second clips work best for stock sites</li>
          <li>Use loop-friendly animations when possible</li>
        </ul>
      </div>
    </div>
  );
}
