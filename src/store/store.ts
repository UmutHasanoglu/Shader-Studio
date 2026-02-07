import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AnimationTemplate,
  Composition,
  ExportSettings,
  ChatMessage,
  SVGAnimation,
  Resolution,
  DEFAULT_RESOLUTION,
  RESOLUTIONS,
} from '@/types';

// Export queue types
export interface ExportQueueItem {
  id: string;
  name: string;
  fragmentShader: string;
  vertexShader?: string;
  uniformValues: Record<string, number | number[] | string>;
  settings: ExportSettings;
  duration: number;
  status: 'pending' | 'exporting' | 'completed' | 'failed';
  progress: number;
  stage: string;
  blob?: Blob;
  error?: string;
}

interface StudioState {
  // Current composition
  activeComposition: Composition | null;
  compositions: Composition[];

  // Playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fps: number;

  // Templates
  templates: AnimationTemplate[];
  activeTemplate: AnimationTemplate | null;

  // Export
  isExporting: boolean;
  exportProgress: number;
  exportSettings: ExportSettings;

  // Chat
  chatMessages: ChatMessage[];
  chatApiKey: string;
  chatModel: string;
  chatProvider: string;

  // SVG
  svgAnimations: SVGAnimation[];
  activeSVGAnimation: SVGAnimation | null;

  // Editor
  activeTab: 'templates' | 'editor' | 'shadertoy' | 'svg' | 'export';
  customShaderCode: string;
  showCodeEditor: boolean;

  // Uniform overrides
  uniformOverrides: Record<string, number | number[] | string>;

  // Export queue
  exportQueue: ExportQueueItem[];
  isProcessingQueue: boolean;

  // Actions
  setActiveComposition: (comp: Composition | null) => void;
  addComposition: (comp: Composition) => void;
  removeComposition: (id: string) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  setActiveTemplate: (template: AnimationTemplate | null) => void;
  setExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setChatApiKey: (key: string) => void;
  setChatModel: (model: string) => void;
  setChatProvider: (provider: string) => void;
  addSVGAnimation: (anim: SVGAnimation) => void;
  setActiveSVGAnimation: (anim: SVGAnimation | null) => void;
  setActiveTab: (tab: StudioState['activeTab']) => void;
  setCustomShaderCode: (code: string) => void;
  setShowCodeEditor: (show: boolean) => void;
  setUniformOverride: (name: string, value: number | number[] | string) => void;
  resetUniformOverrides: () => void;

  // Export queue actions
  addToExportQueue: (item: ExportQueueItem) => void;
  removeFromExportQueue: (id: string) => void;
  clearExportQueue: () => void;
  updateQueueItem: (id: string, updates: Partial<ExportQueueItem>) => void;
  setProcessingQueue: (processing: boolean) => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      activeComposition: null,
      compositions: [],
      isPlaying: false,
      currentTime: 0,
      duration: 10,
      fps: 30,
      templates: [],
      activeTemplate: null,
      isExporting: false,
      exportProgress: 0,
      exportSettings: {
        resolution: { width: 3840, height: 2160, label: '4K UHD' },
        fps: 30,
        duration: 10,
        codec: 'h264' as const,
        container: 'mp4' as const,
        quality: 0.95,
        bitrateMbps: 50,
        aspectRatio: '16:9' as const,
        pixelFormat: 'yuv420p' as const,
      },
      chatMessages: [],
      chatApiKey: '',
      chatModel: 'claude-sonnet-4-20250514',
      chatProvider: 'anthropic',
      svgAnimations: [],
      activeSVGAnimation: null,
      activeTab: 'templates',
      customShaderCode: '',
      showCodeEditor: false,
      uniformOverrides: {},
      exportQueue: [],
      isProcessingQueue: false,

      setActiveComposition: (comp) => set({ activeComposition: comp }),
      addComposition: (comp) =>
        set((state) => ({ compositions: [...state.compositions, comp] })),
      removeComposition: (id) =>
        set((state) => ({
          compositions: state.compositions.filter((c) => c.id !== id),
        })),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setFps: (fps) => set({ fps }),
      setActiveTemplate: (template) => set({ activeTemplate: template }),
      setExporting: (exporting) => set({ isExporting: exporting }),
      setExportProgress: (progress) => set({ exportProgress: progress }),
      setExportSettings: (settings) =>
        set((state) => ({
          exportSettings: { ...state.exportSettings, ...settings },
        })),
      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      clearChat: () => set({ chatMessages: [] }),
      setChatApiKey: (key) => set({ chatApiKey: key }),
      setChatModel: (model) => set({ chatModel: model }),
      setChatProvider: (provider) => set({ chatProvider: provider }),
      addSVGAnimation: (anim) =>
        set((state) => ({ svgAnimations: [...state.svgAnimations, anim] })),
      setActiveSVGAnimation: (anim) => set({ activeSVGAnimation: anim }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCustomShaderCode: (code) => set({ customShaderCode: code }),
      setShowCodeEditor: (show) => set({ showCodeEditor: show }),
      setUniformOverride: (name, value) =>
        set((state) => ({
          uniformOverrides: { ...state.uniformOverrides, [name]: value },
        })),
      resetUniformOverrides: () => set({ uniformOverrides: {} }),

      // Export queue actions
      addToExportQueue: (item) =>
        set((state) => ({ exportQueue: [...state.exportQueue, item] })),
      removeFromExportQueue: (id) =>
        set((state) => ({
          exportQueue: state.exportQueue.filter((i) => i.id !== id),
        })),
      clearExportQueue: () => set({ exportQueue: [], isProcessingQueue: false }),
      updateQueueItem: (id, updates) =>
        set((state) => ({
          exportQueue: state.exportQueue.map((i) =>
            i.id === id ? { ...i, ...updates } : i,
          ),
        })),
      setProcessingQueue: (processing) => set({ isProcessingQueue: processing }),
    }),
    {
      name: 'shader-studio-settings',
      storage: createJSONStorage(() => localStorage),
      // Only persist user settings, not transient state
      partialize: (state) => ({
        chatApiKey: state.chatApiKey,
        chatModel: state.chatModel,
        chatProvider: state.chatProvider,
        exportSettings: state.exportSettings,
        duration: state.duration,
        fps: state.fps,
      }),
    },
  ),
);
