import type { ExportSettings } from '@/types';
import { DEFAULT_VERTEX_SHADER } from '@/shaders/templates';

export class ShaderRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private startTime: number = 0;
  private animationId: number = 0;
  private uniforms: Map<string, WebGLUniformLocation> = new Map();
  private isRunning = false;
  private frameCallback: ((time: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
      || canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    this.initBuffer();
  }

  private initBuffer() {
    const gl = this.gl;
    const vertices = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
      -1,  1, 0,
       1,  1, 0,
    ]);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  compileShader(fragmentSource: string, vertexSource?: string): boolean {
    const gl = this.gl;
    const vs = vertexSource || DEFAULT_VERTEX_SHADER;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vs);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
      return false;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
      return false;
    }

    if (this.program) gl.deleteProgram(this.program);

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      return false;
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Cache uniform locations
    this.uniforms.clear();
    const numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(this.program, i);
      if (info) {
        const loc = gl.getUniformLocation(this.program, info.name);
        if (loc) this.uniforms.set(info.name, loc);
      }
    }

    return true;
  }

  renderFrame(time: number, uniformValues: Record<string, number | number[] | string> = {}) {
    const gl = this.gl;
    if (!this.program) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Set built-in uniforms
    const timeLoc = this.uniforms.get('iTime');
    if (timeLoc) gl.uniform1f(timeLoc, time);

    const resLoc = this.uniforms.get('iResolution');
    if (resLoc) gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);

    const frameLoc = this.uniforms.get('iFrame');
    if (frameLoc) gl.uniform1i(frameLoc, Math.floor(time * 30));

    // Set custom uniforms
    for (const [name, value] of Object.entries(uniformValues)) {
      const loc = this.uniforms.get(name);
      if (!loc) continue;

      if (typeof value === 'number') {
        gl.uniform1f(loc, value);
      } else if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2fv(loc, value);
        else if (value.length === 3) gl.uniform3fv(loc, value);
        else if (value.length === 4) gl.uniform4fv(loc, value);
      }
    }

    // Draw
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const posAttr = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Force GPU to finish rendering before reading
    gl.finish();
  }

  start(uniformValues: Record<string, number | number[] | string> = {}) {
    this.startTime = performance.now() / 1000;
    this.isRunning = true;

    const render = () => {
      if (!this.isRunning) return;
      const time = performance.now() / 1000 - this.startTime;
      this.renderFrame(time, uniformValues);
      if (this.frameCallback) this.frameCallback(time);
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationId);
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  onFrame(callback: (time: number) => void) {
    this.frameCallback = callback;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Read raw RGBA pixel data from the current frame.
   * Flips vertically since WebGL reads bottom-to-top.
   */
  readPixels(): Uint8Array {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Flip vertically
    const rowSize = w * 4;
    const row = new Uint8Array(rowSize);
    for (let y = 0; y < Math.floor(h / 2); y++) {
      const topOffset = y * rowSize;
      const bottomOffset = (h - 1 - y) * rowSize;
      row.set(pixels.subarray(topOffset, topOffset + rowSize));
      pixels.copyWithin(topOffset, bottomOffset, bottomOffset + rowSize);
      pixels.set(row, bottomOffset);
    }

    return pixels;
  }

  captureFrame(): string {
    return this.canvas.toDataURL('image/png');
  }

  destroy() {
    this.stop();
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
  }
}

/**
 * Export video using FFmpeg WASM for proper H.264/ProRes/VP9 encoding.
 * Renders frame-by-frame with deterministic timing, then encodes with FFmpeg.
 */
export async function exportVideo(
  fragmentShader: string,
  uniformValues: Record<string, number | number[] | string>,
  settings: ExportSettings,
  onProgress: (progress: number, stage: string) => void,
  vertexShader?: string,
): Promise<Blob> {
  const { resolution, fps, duration, codec, container, bitrateMbps, pixelFormat } = settings;

  // Stage 1: Render all frames
  onProgress(0, 'Rendering frames...');

  const canvas = document.createElement('canvas');
  canvas.width = resolution.width;
  canvas.height = resolution.height;

  const renderer = new ShaderRenderer(canvas);
  const compiled = renderer.compileShader(fragmentShader, vertexShader);
  if (!compiled) {
    renderer.destroy();
    throw new Error('Failed to compile shader for export');
  }

  const totalFrames = Math.ceil(duration * fps);
  const frameDuration = 1 / fps;
  const w = resolution.width;
  const h = resolution.height;
  const frameSize = w * h * 4;

  // Render frames and collect as one contiguous buffer for FFmpeg
  // For large exports, write in chunks to avoid memory issues
  const allFrames = new Uint8Array(totalFrames * frameSize);

  for (let i = 0; i < totalFrames; i++) {
    const time = i * frameDuration;
    renderer.renderFrame(time, uniformValues);
    const pixels = renderer.readPixels();
    allFrames.set(pixels, i * frameSize);

    if (i % 5 === 0) {
      onProgress((i + 1) / totalFrames * 0.5, `Rendering frame ${i + 1}/${totalFrames}`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  renderer.destroy();

  // Stage 2: Encode with FFmpeg WASM
  onProgress(0.5, 'Loading encoder...');

  const { FFmpeg } = await import('@ffmpeg/ffmpeg');

  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  });

  onProgress(0.6, 'Writing frame data...');
  await ffmpeg.writeFile('input.raw', allFrames);

  // Build encoder-specific arguments
  let codecArgs: string[];
  switch (codec) {
    case 'h264':
      codecArgs = [
        '-c:v', 'libx264',
        '-pix_fmt', pixelFormat === 'yuv422p10le' ? 'yuv422p' : 'yuv420p',
        '-b:v', `${bitrateMbps}M`,
        '-maxrate', `${Math.round(bitrateMbps * 1.5)}M`,
        '-bufsize', `${Math.round(bitrateMbps * 2)}M`,
        '-preset', 'slow',
        '-profile:v', 'high',
        '-level', '5.1',
        '-movflags', '+faststart',
      ];
      break;
    case 'prores':
      codecArgs = [
        '-c:v', 'prores_ks',
        '-profile:v', '3', // ProRes 422 HQ
        '-pix_fmt', 'yuv422p10le',
        '-vendor', 'apl0',
      ];
      break;
    case 'vp9':
      codecArgs = [
        '-c:v', 'libvpx-vp9',
        '-pix_fmt', 'yuv420p',
        '-b:v', `${bitrateMbps}M`,
        '-crf', '18',
      ];
      break;
    default:
      codecArgs = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-b:v', `${bitrateMbps}M`];
  }

  const outputFile = `output.${container}`;

  onProgress(0.7, `Encoding ${codec.toUpperCase()} ${container.toUpperCase()}...`);

  await ffmpeg.exec([
    '-f', 'rawvideo',
    '-pixel_format', 'rgba',
    '-video_size', `${w}x${h}`,
    '-framerate', `${fps}`,
    '-i', 'input.raw',
    ...codecArgs,
    '-an', // no audio
    outputFile,
  ]);

  onProgress(0.95, 'Finalizing...');

  const data = await ffmpeg.readFile(outputFile);
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  };

  // Copy into a plain ArrayBuffer to satisfy BlobPart (FFmpeg may use SharedArrayBuffer)
  const raw = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const buf = new ArrayBuffer(raw.byteLength);
  new Uint8Array(buf).set(raw);
  return new Blob([buf], { type: mimeTypes[container] || 'video/mp4' });
}

/**
 * Fallback export using MediaRecorder (WebM only).
 * Fixed: paces frames at real frame rate for correct duration.
 */
export async function exportVideoFallback(
  fragmentShader: string,
  uniformValues: Record<string, number | number[] | string>,
  settings: ExportSettings,
  onProgress: (progress: number, stage: string) => void,
  vertexShader?: string,
): Promise<Blob> {
  const { resolution, fps, duration, bitrateMbps } = settings;

  const canvas = document.createElement('canvas');
  canvas.width = resolution.width;
  canvas.height = resolution.height;

  const renderer = new ShaderRenderer(canvas);
  const compiled = renderer.compileShader(fragmentShader, vertexShader);
  if (!compiled) {
    renderer.destroy();
    throw new Error('Failed to compile shader for export');
  }

  const totalFrames = Math.ceil(duration * fps);
  const frameDuration = 1 / fps;
  const frameTimeMs = 1000 / fps;

  const stream = canvas.captureStream(0);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: bitrateMbps * 1_000_000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      renderer.destroy();
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    mediaRecorder.onerror = (e) => {
      renderer.destroy();
      reject(e);
    };

    // Request data every 100ms to keep chunks flowing
    mediaRecorder.start(100);

    let frame = 0;

    function renderNextFrame() {
      if (frame >= totalFrames) {
        setTimeout(() => mediaRecorder.stop(), 200);
        return;
      }

      const time = frame * frameDuration;
      renderer.renderFrame(time, uniformValues);

      const track = stream.getVideoTracks()[0] as any;
      if (track.requestFrame) {
        track.requestFrame();
      }

      frame++;
      onProgress(frame / totalFrames, `Rendering frame ${frame}/${totalFrames}`);

      // Pace at real frame rate for correct video duration
      setTimeout(renderNextFrame, frameTimeMs);
    }

    renderNextFrame();
  });
}

/**
 * Capture a single high-res frame as PNG
 */
export function captureHighResFrame(
  fragmentShader: string,
  uniformValues: Record<string, number | number[] | string>,
  time: number,
  width: number,
  height: number,
  vertexShader?: string,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const renderer = new ShaderRenderer(canvas);
  const compiled = renderer.compileShader(fragmentShader, vertexShader);
  if (!compiled) {
    renderer.destroy();
    throw new Error('Failed to compile shader for capture');
  }

  renderer.renderFrame(time, uniformValues);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        renderer.destroy();
        if (blob) resolve(blob);
        else reject(new Error('Failed to capture frame'));
      },
      'image/png',
      1.0,
    );
  });
}
