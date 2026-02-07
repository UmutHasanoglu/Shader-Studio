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

export interface ExportSettings {
  resolution: Resolution;
  fps: number;
  duration: number;
  format: 'webm' | 'mp4';
  quality: number; // 0-1
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

export const RESOLUTIONS: Resolution[] = [
  { width: 1920, height: 1080, label: '1080p (Full HD)' },
  { width: 2560, height: 1440, label: '1440p (2K)' },
  { width: 3840, height: 2160, label: '2160p (4K UHD)' },
  { width: 4096, height: 2160, label: '4K DCI' },
];

export const DEFAULT_RESOLUTION = RESOLUTIONS[2]; // 4K UHD
