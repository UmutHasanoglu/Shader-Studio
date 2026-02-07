'use client';

import React, { useCallback, useState } from 'react';
import { useStudioStore } from '@/store/store';
import { exportVideo, exportVideoFallback, captureHighResFrame } from '@/lib/renderer';
import { exportSVGVideo, renderSVGFrame } from '@/lib/svg-renderer';
import {
  ASPECT_RESOLUTIONS,
  CODEC_CONTAINERS,
  STOCK_PRESETS,
  STOCK_DURATION,
} from '@/types';
import type {
  AspectRatio,
  VideoCodec,
  VideoContainer,
  Resolution,
} from '@/types';

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

  const [exportStage, setExportStage] = useState('');
  const [useFallback, setUseFallback] = useState(false);

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

  // Validation warnings
  const warnings: string[] = [];
  if (duration < STOCK_DURATION.min) {
    warnings.push(`Duration ${duration}s is below Adobe Stock minimum (${STOCK_DURATION.min}s)`);
  }
  if (duration > STOCK_DURATION.max) {
    warnings.push(`Duration ${duration}s exceeds Adobe Stock maximum (${STOCK_DURATION.max}s)`);
  }
  if (duration >= STOCK_DURATION.min && duration < STOCK_DURATION.recommended.min) {
    warnings.push(`Adobe recommends ${STOCK_DURATION.recommended.min}-${STOCK_DURATION.recommended.max}s for best results`);
  }
  if (exportSettings.resolution.width < 1920) {
    warnings.push('Adobe Stock requires minimum 1920px width');
  }

  const handleAspectRatioChange = (ar: AspectRatio) => {
    const resolutions = ASPECT_RESOLUTIONS[ar];
    // Pick the highest resolution available
    const bestRes = resolutions[resolutions.length - 1];
    setExportSettings({ aspectRatio: ar, resolution: bestRes });
  };

  const handleCodecChange = (codec: VideoCodec) => {
    const containers = CODEC_CONTAINERS[codec];
    const container = containers[0]; // default first compatible container
    const pixelFormat = codec === 'prores' ? 'yuv422p10le' as const : 'yuv420p' as const;
    const bitrate = codec === 'prores' ? 150 : codec === 'vp9' ? 30 : 50;
    setExportSettings({ codec, container, pixelFormat, bitrateMbps: bitrate });
  };

  const handlePreset = (presetId: string) => {
    const preset = STOCK_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setExportSettings(preset.settings);
    }
  };

  const handleExportVideo = useCallback(async () => {
    setExporting(true);
    setExportProgress(0);
    setExportStage('Starting...');

    try {
      let blob: Blob;

      if (activeTab === 'svg' && activeSVGAnimation) {
        blob = await exportSVGVideo(
          activeSVGAnimation,
          exportSettings.resolution.width,
          exportSettings.resolution.height,
          exportSettings.fps,
          duration,
          (p) => {
            setExportProgress(p);
            setExportStage(`Rendering SVG frame ${Math.round(p * duration * exportSettings.fps)}/${Math.ceil(duration * exportSettings.fps)}`);
          },
        );
      } else {
        const shaderCode = getShaderCode();
        if (!shaderCode) {
          alert('No shader code to export');
          setExporting(false);
          return;
        }

        const settings = { ...exportSettings, duration, fps: exportSettings.fps };

        if (useFallback) {
          blob = await exportVideoFallback(
            shaderCode,
            getUniformValues(),
            settings,
            (p, stage) => { setExportProgress(p); setExportStage(stage); },
            activeTemplate?.vertexShader,
          );
        } else {
          blob = await exportVideo(
            shaderCode,
            getUniformValues(),
            settings,
            (p, stage) => { setExportProgress(p); setExportStage(stage); },
            activeTemplate?.vertexShader,
          );
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shader-studio-${Date.now()}.${exportSettings.container}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      const msg = (err as Error).message;
      if (msg.includes('FFmpeg') || msg.includes('SharedArrayBuffer') || msg.includes('ffmpeg')) {
        alert(
          'FFmpeg encoding failed. This likely means your browser blocks SharedArrayBuffer.\n\n' +
          'Try:\n1. Use the "WebM Fallback" option below\n2. Use Chrome with proper COOP/COEP headers\n3. Use a localhost dev server\n\nError: ' + msg,
        );
      } else {
        alert('Export failed: ' + msg);
      }
    } finally {
      setExporting(false);
      setExportProgress(0);
      setExportStage('');
    }
  }, [activeTemplate, uniformOverrides, customShaderCode, exportSettings, duration, activeTab, activeSVGAnimation, useFallback]);

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

  const availableResolutions = ASPECT_RESOLUTIONS[exportSettings.aspectRatio] || ASPECT_RESOLUTIONS['16:9'];
  const availableContainers = CODEC_CONTAINERS[exportSettings.codec] || ['mp4'];

  return (
    <div className="p-3 overflow-y-auto">
      <h2 className="text-sm font-semibold text-studio-text mb-3">Export Settings</h2>

      {/* Stock Platform Presets */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5 uppercase tracking-wider font-medium">
          Quick Presets
        </label>
        <div className="space-y-1">
          {STOCK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset.id)}
              className="w-full text-left px-2.5 py-2 rounded-lg text-xs bg-studio-border/30 hover:bg-studio-border/60 border border-transparent hover:border-studio-border transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-studio-text font-medium">{preset.name}</span>
                <span className="text-studio-text-dim/50 text-[10px] uppercase">
                  {preset.platform.replace('-', ' ')}
                </span>
              </div>
              <div className="text-studio-text-dim/60 mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5 uppercase tracking-wider font-medium">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['16:9', '9:16', '1:1', '4:3', '2.39:1'] as AspectRatio[]).map((ar) => (
            <button
              key={ar}
              onClick={() => handleAspectRatioChange(ar)}
              className={`py-1.5 text-xs rounded-lg transition-colors ${
                exportSettings.aspectRatio === ar
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim'
              }`}
            >
              {ar}
              {ar === '9:16' && <div className="text-[9px] text-studio-text-dim/40">Vertical</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5 uppercase tracking-wider font-medium">
          Resolution
        </label>
        <div className="space-y-1">
          {availableResolutions.map((res: Resolution) => (
            <button
              key={res.label}
              onClick={() => setExportSettings({ resolution: res })}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                exportSettings.resolution.width === res.width && exportSettings.resolution.height === res.height
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim hover:text-studio-text'
              }`}
            >
              <div className="flex justify-between">
                <span>{res.label}</span>
                <span className="text-studio-text-dim/50">{res.width}x{res.height}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Codec */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5 uppercase tracking-wider font-medium">
          Codec
        </label>
        <div className="flex gap-1.5">
          {([
            { id: 'h264' as const, label: 'H.264', desc: 'Adobe Stock recommended' },
            { id: 'prores' as const, label: 'ProRes', desc: 'Premium quality' },
            { id: 'vp9' as const, label: 'VP9', desc: 'Web / fallback' },
          ]).map((c) => (
            <button
              key={c.id}
              onClick={() => handleCodecChange(c.id)}
              className={`flex-1 py-2 text-xs rounded-lg transition-colors ${
                exportSettings.codec === c.id
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim'
              }`}
            >
              <div className="font-medium">{c.label}</div>
              <div className="text-[9px] text-studio-text-dim/40 mt-0.5">{c.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Container */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5 uppercase tracking-wider font-medium">
          Container
        </label>
        <div className="flex gap-2">
          {availableContainers.map((fmt: VideoContainer) => (
            <button
              key={fmt}
              onClick={() => setExportSettings({ container: fmt })}
              className={`flex-1 py-1.5 text-xs rounded-lg uppercase transition-colors ${
                exportSettings.container === fmt
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim'
              }`}
            >
              .{fmt}
            </button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5 uppercase tracking-wider font-medium">
          Frame Rate
        </label>
        <div className="flex gap-2">
          {[24, 25, 30, 60].map((f) => (
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

      {/* Bitrate */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-studio-text-dim uppercase tracking-wider font-medium">
            Bitrate
          </label>
          <span className="text-xs text-studio-text font-mono">{exportSettings.bitrateMbps} Mbps</span>
        </div>
        <input
          type="range"
          min={5}
          max={200}
          step={5}
          value={exportSettings.bitrateMbps}
          onChange={(e) => setExportSettings({ bitrateMbps: Number(e.target.value) })}
        />
        <div className="flex justify-between text-[10px] text-studio-text-dim/40 mt-0.5">
          <span>5 Mbps</span>
          <span>200 Mbps</span>
        </div>
      </div>

      {/* Pixel Format */}
      <div className="mb-4">
        <label className="text-xs text-studio-text-dim block mb-1.5 uppercase tracking-wider font-medium">
          Color
        </label>
        <div className="flex gap-2">
          {([
            { id: 'yuv420p' as const, label: '4:2:0 8-bit', desc: 'H.264 standard' },
            { id: 'yuv422p10le' as const, label: '4:2:2 10-bit', desc: 'ProRes / premium' },
          ]).map((pf) => (
            <button
              key={pf.id}
              onClick={() => setExportSettings({ pixelFormat: pf.id })}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                exportSettings.pixelFormat === pf.id
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim'
              }`}
            >
              <div>{pf.label}</div>
              <div className="text-[9px] text-studio-text-dim/40">{pf.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Export summary */}
      <div className="mb-4 p-2.5 rounded-lg bg-studio-border/30 text-xs text-studio-text-dim">
        <div className="flex justify-between mb-1">
          <span>Output</span>
          <span className="text-studio-text">
            {exportSettings.codec.toUpperCase()} .{exportSettings.container}
          </span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Resolution</span>
          <span>{exportSettings.resolution.width}x{exportSettings.resolution.height}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Duration</span>
          <span>{duration}s ({exportSettings.fps} fps)</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Total Frames</span>
          <span>{Math.ceil(duration * exportSettings.fps)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Bitrate</span>
          <span>{exportSettings.bitrateMbps} Mbps</span>
        </div>
        <div className="flex justify-between">
          <span>Est. File Size</span>
          <span>
            ~{Math.round(exportSettings.bitrateMbps * duration / 8)} MB
          </span>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-4 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300/80 mb-0.5 last:mb-0">
              {w}
            </p>
          ))}
        </div>
      )}

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
            {exportStage}
          </p>
        </div>
      )}

      {/* Fallback toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useFallback}
            onChange={(e) => setUseFallback(e.target.checked)}
            className="rounded border-studio-border"
          />
          <span className="text-xs text-studio-text-dim">
            WebM fallback mode (no FFmpeg, browser-native encoding)
          </span>
        </label>
      </div>

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
          {isExporting ? 'Exporting...' : `Export ${exportSettings.codec.toUpperCase()} .${exportSettings.container.toUpperCase()}`}
        </button>

        <button
          onClick={handleCaptureFrame}
          disabled={isExporting}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-studio-border hover:bg-studio-border/80 text-studio-text transition-colors"
        >
          Capture {exportSettings.resolution.width}x{exportSettings.resolution.height} Frame (PNG)
        </button>
      </div>

      {/* Adobe Stock requirements */}
      <div className="mt-4 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300/80 font-medium mb-1">Adobe Stock Requirements</p>
        <ul className="text-xs text-blue-300/60 space-y-0.5 list-disc list-inside">
          <li>Formats: MOV, MP4 (H.264 or ProRes 422 HQ)</li>
          <li>Resolution: 1920x1080 minimum, up to 4096 DCI</li>
          <li>Duration: 5-60 seconds (10-30s recommended)</li>
          <li>Vertical: shoot/render natively in 9:16</li>
          <li>No H.265/HEVC — use H.264 only</li>
          <li>No logos, brand names, or copyrighted content</li>
        </ul>
      </div>
    </div>
  );
}
