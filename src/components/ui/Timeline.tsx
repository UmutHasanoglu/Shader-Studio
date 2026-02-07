'use client';

import React, { useCallback, useRef } from 'react';
import { useStudioStore } from '@/store/store';

export function Timeline() {
  const {
    currentTime,
    setCurrentTime,
    duration,
    isPlaying,
    setPlaying,
    fps,
  } = useStudioStore();
  const trackRef = useRef<HTMLDivElement>(null);

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const frames = Math.floor((t % 1) * fps);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      setCurrentTime(Math.max(0, x * duration));
    },
    [duration, setCurrentTime],
  );

  const progress = duration > 0 ? ((currentTime % duration) / duration) * 100 : 0;

  return (
    <div className="h-16 bg-studio-panel border-t border-studio-border px-4 flex items-center gap-4 shrink-0">
      {/* Play/Pause */}
      <button
        onClick={() => setPlaying(!isPlaying)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Time display */}
      <div className="text-xs font-mono text-studio-text w-24 text-center">
        {formatTime(currentTime % duration)}
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="flex-1 h-6 bg-studio-bg rounded-full cursor-pointer relative group"
      >
        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-full bg-indigo-500/30 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 w-0.5 h-full bg-indigo-400 transition-all"
          style={{ left: `${progress}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Time markers */}
        <div className="absolute inset-0 flex items-end px-1">
          {Array.from({ length: Math.min(20, Math.ceil(duration)) }, (_, i) => (
            <div
              key={i}
              className="flex-1 border-l border-studio-border/30 h-2"
            />
          ))}
        </div>
      </div>

      {/* Duration display */}
      <div className="text-xs font-mono text-studio-text-dim w-24 text-center">
        {formatTime(duration)}
      </div>

      {/* Reset */}
      <button
        onClick={() => { setCurrentTime(0); setPlaying(false); }}
        className="p-1.5 rounded hover:bg-white/5 text-studio-text-dim hover:text-studio-text transition-colors"
        title="Reset"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </button>
    </div>
  );
}
