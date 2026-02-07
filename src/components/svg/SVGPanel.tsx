'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useStudioStore } from '@/store/store';
import { SVG_KEYFRAME_TEMPLATES } from '@/lib/svg-templates';
import type { SVGAnimation, KeyframeTemplate } from '@/types';

export function SVGPanel() {
  const {
    svgAnimations,
    addSVGAnimation,
    setActiveSVGAnimation,
    activeSVGAnimation,
  } = useStudioStore();

  const [svgContent, setSvgContent] = useState('');
  const [animName, setAnimName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<KeyframeTemplate | null>(null);
  const [bgColor, setBgColor] = useState('#000000');
  const [duration, setDuration] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setSvgContent(content);
      setAnimName(file.name.replace('.svg', ''));
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.svg')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setSvgContent(content);
      setAnimName(file.name.replace('.svg', ''));
    };
    reader.readAsText(file);
  }, []);

  const handleCreate = useCallback(() => {
    if (!svgContent || !selectedTemplate) return;

    const animation: SVGAnimation = {
      id: 'svg-' + Date.now(),
      name: animName || 'Untitled SVG',
      svgContent,
      keyframes: selectedTemplate.keyframes,
      duration,
      easing: selectedTemplate.easing,
      backgroundColor: bgColor,
    };

    addSVGAnimation(animation);
    setActiveSVGAnimation(animation);
  }, [svgContent, selectedTemplate, animName, duration, bgColor, addSVGAnimation, setActiveSVGAnimation]);

  return (
    <div className="p-3">
      <h2 className="text-sm font-semibold text-studio-text mb-3">SVG Animator</h2>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="mb-3 p-4 rounded-lg border-2 border-dashed border-studio-border hover:border-indigo-500/50 cursor-pointer transition-colors text-center"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={handleFileUpload}
          className="hidden"
        />
        {svgContent ? (
          <div>
            <div
              className="w-16 h-16 mx-auto mb-2 bg-white/5 rounded p-2"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
            <p className="text-xs text-studio-text">{animName}.svg</p>
            <p className="text-xs text-studio-text-dim mt-1">Click to change</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-studio-text-dim">Drop SVG here or click to upload</p>
            <p className="text-xs text-studio-text-dim/50 mt-1">Supports .svg files</p>
          </div>
        )}
      </div>

      {/* Or paste SVG code */}
      <details className="mb-3">
        <summary className="text-xs text-studio-text-dim cursor-pointer hover:text-studio-text">
          Or paste SVG code
        </summary>
        <textarea
          className="code-editor mt-1.5 h-24"
          value={svgContent}
          onChange={(e) => setSvgContent(e.target.value)}
          placeholder="<svg>...</svg>"
          spellCheck={false}
        />
      </details>

      {/* Animation name */}
      <div className="mb-3">
        <label className="text-xs text-studio-text-dim block mb-1">Name</label>
        <input
          type="text"
          value={animName}
          onChange={(e) => setAnimName(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm bg-studio-bg border border-studio-border rounded-lg text-studio-text outline-none focus:border-indigo-500"
          placeholder="Animation name"
        />
      </div>

      {/* Background color */}
      <div className="mb-3">
        <label className="text-xs text-studio-text-dim block mb-1">Background Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-8 h-8 rounded border border-studio-border cursor-pointer"
          />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-sm bg-studio-bg border border-studio-border rounded-lg text-studio-text outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Duration */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-studio-text-dim">Duration</label>
          <span className="text-xs text-studio-text font-mono">{duration}s</span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          step={0.5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>

      {/* Keyframe templates */}
      <div className="mb-3">
        <label className="text-xs text-studio-text-dim block mb-1.5">
          Animation Template
        </label>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {SVG_KEYFRAME_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => setSelectedTemplate(tmpl)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                selectedTemplate?.id === tmpl.id
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-studio-border/50 border border-transparent text-studio-text-dim hover:text-studio-text'
              }`}
            >
              <div className="font-medium">{tmpl.name}</div>
              <div className="text-studio-text-dim/60 mt-0.5">{tmpl.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!svgContent || !selectedTemplate}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          svgContent && selectedTemplate
            ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
            : 'bg-studio-border text-studio-text-dim cursor-not-allowed'
        }`}
      >
        Create Animation
      </button>

      {/* Saved animations */}
      {svgAnimations.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium text-studio-text-dim mb-2 uppercase tracking-wider">
            Saved Animations
          </h3>
          <div className="space-y-1.5">
            {svgAnimations.map((anim) => (
              <button
                key={anim.id}
                onClick={() => setActiveSVGAnimation(anim)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  activeSVGAnimation?.id === anim.id
                    ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                    : 'bg-studio-border/50 border border-transparent text-studio-text-dim hover:text-studio-text'
                }`}
              >
                {anim.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
