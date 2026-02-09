export interface ShaderUniform {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'int' | 'bool';
  value: number | number[] | string;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export interface AnimationTemplate {
  id: string;
  name: string;
  category: 'abstract' | 'particles' | 'waves' | 'geometry' | 'noise' | 'gradient' | 'svg-animation' | 'custom';
  description: string;
  fragmentShader: string;
  vertexShader?: string;
  uniforms: ShaderUniform[];
  thumbnail?: string;
  duration: number; // seconds
  fps: number;
}

export interface Composition {
  id: string;
  name: string;
  template: AnimationTemplate;
  uniformValues: Record<string, number | number[] | string>;
  resolution: Resolution;
  duration: number;
  fps: number;
  createdAt: number;
  updatedAt: number;
}

export interface Resolution {
  width: number;
  height: number;
  label: string;
}

export type AspectRatio = '16:9' | '9:16' | '4:3' | '1:1' | '2.39:1';
export type VideoCodec = 'h264' | 'prores' | 'vp9';
export type VideoContainer = 'mp4' | 'mov' | 'webm';

export interface ExportSettings {
  resolution: Resolution;
  fps: number;
  duration: number;
  codec: VideoCodec;
  container: VideoContainer;
  quality: number; // 0-1
  bitrateMbps: number;
  aspectRatio: AspectRatio;
  pixelFormat: 'yuv420p' | 'yuv422p10le';
}

export interface StockPreset {
  id: string;
  name: string;
  description: string;
  platform: 'adobe-stock' | 'shutterstock' | 'pond5' | 'custom';
  settings: Partial<ExportSettings>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  code?: string;
  timestamp: number;
}

export interface SVGAnimation {
  id: string;
  name: string;
  svgContent: string;
  keyframes: SVGKeyframe[];
  duration: number;
  easing: string;
  backgroundColor: string;
}

export interface SVGKeyframe {
  time: number; // 0-1 normalized
  properties: Record<string, string | number>;
}

export interface KeyframeTemplate {
  id: string;
  name: string;
  description: string;
  keyframes: SVGKeyframe[];
  easing: string;
}

// Aspect ratio to resolution map
export const ASPECT_RESOLUTIONS: Record<AspectRatio, Resolution[]> = {
  '16:9': [
    { width: 1920, height: 1080, label: 'HD 1080p' },
    { width: 2560, height: 1440, label: '2K QHD' },
    { width: 3840, height: 2160, label: '4K UHD' },
    { width: 4096, height: 2304, label: '4K DCI 16:9' },
  ],
  '9:16': [
    { width: 1080, height: 1920, label: 'HD Vertical' },
    { width: 1440, height: 2560, label: '2K Vertical' },
    { width: 2160, height: 3840, label: '4K Vertical' },
  ],
  '4:3': [
    { width: 1440, height: 1080, label: 'HD 4:3' },
    { width: 2880, height: 2160, label: '4K 4:3' },
  ],
  '1:1': [
    { width: 1080, height: 1080, label: 'HD Square' },
    { width: 2160, height: 2160, label: '4K Square' },
  ],
  '2.39:1': [
    { width: 1920, height: 804, label: 'HD Cinematic' },
    { width: 3840, height: 1608, label: '4K Cinematic' },
    { width: 4096, height: 1716, label: 'DCI Cinematic' },
  ],
};

export const RESOLUTIONS: Resolution[] = ASPECT_RESOLUTIONS['16:9'];

export const DEFAULT_RESOLUTION = RESOLUTIONS[2]; // 4K UHD

// Codec → compatible containers
export const CODEC_CONTAINERS: Record<VideoCodec, VideoContainer[]> = {
  h264: ['mp4', 'mov'],
  prores: ['mov'],
  vp9: ['webm'],
};

// Stock platform presets matching their requirements
export const STOCK_PRESETS: StockPreset[] = [
  {
    id: 'adobe-stock-4k',
    name: 'Adobe Stock 4K',
    description: 'H.264 MP4, 4K UHD, 30fps — Adobe Stock recommended',
    platform: 'adobe-stock',
    settings: {
      resolution: { width: 3840, height: 2160, label: '4K UHD' },
      fps: 30,
      codec: 'h264',
      container: 'mp4',
      bitrateMbps: 50,
      quality: 0.95,
      pixelFormat: 'yuv420p',
    },
  },
  {
    id: 'adobe-stock-4k-prores',
    name: 'Adobe Stock 4K ProRes',
    description: 'ProRes 422 HQ MOV, 4K UHD — Adobe Stock premium quality',
    platform: 'adobe-stock',
    settings: {
      resolution: { width: 3840, height: 2160, label: '4K UHD' },
      fps: 30,
      codec: 'prores',
      container: 'mov',
      bitrateMbps: 150,
      quality: 1.0,
      pixelFormat: 'yuv422p10le',
    },
  },
  {
    id: 'adobe-stock-hd',
    name: 'Adobe Stock HD',
    description: 'H.264 MP4, 1080p, 30fps — Adobe Stock standard',
    platform: 'adobe-stock',
    settings: {
      resolution: { width: 1920, height: 1080, label: 'HD 1080p' },
      fps: 30,
      codec: 'h264',
      container: 'mp4',
      bitrateMbps: 20,
      quality: 0.9,
      pixelFormat: 'yuv420p',
    },
  },
  {
    id: 'adobe-stock-vertical',
    name: 'Adobe Stock Vertical',
    description: 'H.264 MP4, 9:16 vertical, 30fps',
    platform: 'adobe-stock',
    settings: {
      resolution: { width: 2160, height: 3840, label: '4K Vertical' },
      fps: 30,
      codec: 'h264',
      container: 'mp4',
      bitrateMbps: 50,
      quality: 0.95,
      aspectRatio: '9:16',
      pixelFormat: 'yuv420p',
    },
  },
  {
    id: 'shutterstock-4k',
    name: 'Shutterstock 4K',
    description: 'H.264 MOV, 4K UHD, 30fps',
    platform: 'shutterstock',
    settings: {
      resolution: { width: 3840, height: 2160, label: '4K UHD' },
      fps: 30,
      codec: 'h264',
      container: 'mov',
      bitrateMbps: 50,
      quality: 0.95,
      pixelFormat: 'yuv420p',
    },
  },
  {
    id: 'pond5-4k',
    name: 'Pond5 4K',
    description: 'ProRes MOV, 4K UHD — Pond5 premium',
    platform: 'pond5',
    settings: {
      resolution: { width: 3840, height: 2160, label: '4K UHD' },
      fps: 30,
      codec: 'prores',
      container: 'mov',
      bitrateMbps: 150,
      quality: 1.0,
      pixelFormat: 'yuv422p10le',
    },
  },
];

// Adobe Stock duration constraints
export const STOCK_DURATION = {
  min: 5,
  max: 60,
  recommended: { min: 10, max: 30 },
};
