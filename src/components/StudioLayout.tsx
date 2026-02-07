'use client';

import React from 'react';
import { useStudioStore } from '@/store/store';
import { PreviewCanvas } from './canvas/PreviewCanvas';
import { TemplatePanel } from './panels/TemplatePanel';
import { ControlPanel } from './panels/ControlPanel';
import { ExportPanel } from './panels/ExportPanel';
import { CodeEditorPanel } from './panels/CodeEditorPanel';
import { ShadertoyPanel } from './panels/ShadertoyPanel';
import { SVGPanel } from './svg/SVGPanel';
import { ChatPanel } from './chat/ChatPanel';
import { Timeline } from './ui/Timeline';
import { Toolbar } from './ui/Toolbar';

const TABS = [
  { id: 'templates' as const, label: 'Templates' },
  { id: 'editor' as const, label: 'Code Editor' },
  { id: 'shadertoy' as const, label: 'Shadertoy' },
  { id: 'svg' as const, label: 'SVG Animator' },
  { id: 'export' as const, label: 'Export' },
];

export function StudioLayout() {
  const { activeTab, setActiveTab, isExporting, exportProgress } = useStudioStore();
  const [showChat, setShowChat] = React.useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-12 bg-studio-panel border-b border-studio-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Shader Studio
          </h1>
          <span className="text-xs text-studio-text-dim">Animation Creator</span>
        </div>
        <div className="flex items-center gap-2">
          {isExporting && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 export-progress">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs text-indigo-300">
                Exporting {Math.round(exportProgress * 100)}%
              </span>
            </div>
          )}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showChat
                ? 'bg-indigo-500 text-white'
                : 'bg-studio-border text-studio-text hover:bg-indigo-500/20'
            }`}
          >
            AI Chat
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Tabs */}
        <div className="w-80 flex flex-col border-r border-studio-border bg-studio-panel shrink-0">
          <div className="flex border-b border-studio-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
                    : 'text-studio-text-dim hover:text-studio-text hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'templates' && <TemplatePanel />}
            {activeTab === 'editor' && <CodeEditorPanel />}
            {activeTab === 'shadertoy' && <ShadertoyPanel />}
            {activeTab === 'svg' && <SVGPanel />}
            {activeTab === 'export' && <ExportPanel />}
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar />
          <div className="flex-1 flex items-center justify-center bg-black/50 p-4 overflow-hidden">
            <PreviewCanvas />
          </div>
          <Timeline />
        </div>

        {/* Right sidebar - Controls */}
        <div className="w-72 border-l border-studio-border bg-studio-panel shrink-0 overflow-y-auto">
          <ControlPanel />
        </div>

        {/* Chat panel overlay */}
        {showChat && (
          <div className="w-96 border-l border-studio-border bg-studio-panel shrink-0 flex flex-col">
            <ChatPanel onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
