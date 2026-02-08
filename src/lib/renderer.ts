import type { ExportSettings } from '@/types';
import { DEFAULT_VERTEX_SHADER } from '@/shaders/templates';

/**
 * Generate a 256x256 RGBA noise texture (procedural, deterministic).
 * Used as a default for Shadertoy iChannel0-3 when no texture is provided.
 */
function generateNoiseTexture(seed: number = 0): Uint8Array {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Simple hash-based noise
      const n1 = Math.sin(x * 127.1 + y * 311.7 + seed * 53.3) * 43758.5453;
      const n2 = Math.sin(x * 269.5 + y * 183.3 + seed * 97.1) * 43758.5453;
      const n3 = Math.sin(x * 420.1 + y * 631.7 + seed * 31.7) * 43758.5453;
      data[i + 0] = ((n1 - Math.floor(n1)) * 255) | 0;
      data[i + 1] = ((n2 - Math.floor(n2)) * 255) | 0;
      data[i + 2] = ((n3 - Math.floor(n3)) * 255) | 0;
      data[i + 3] = 255;
    }
  }
  return data;
}

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
  private noiseTextures: WebGLTexture[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
      || canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    this.initBuffer();
    this.initNoiseTextures();
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

  private initNoiseTextures() {
    const gl = this.gl;
    // Create 4 noise textures for iChannel0-3
    for (let i = 0; i < 4; i++) {
      const tex = gl.createTexture();
      if (!tex) continue;
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const noiseData = generateNoiseTexture(i * 137);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseData);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      this.noiseTextures.push(tex);
    }
  }

  compileShader(fragmentSource: string, vertexSource?: string): boolean {
    const gl = this.gl;
    const vs = vertexSource || DEFAULT_VERTEX_SHADER;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vs);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
      gl.deleteShader(vertexShader);
      return false;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return false;
    }

    if (this.program) gl.deleteProgram(this.program);

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return false;
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

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

    // Standard Shadertoy uniforms
    const timeLoc = this.uniforms.get('iTime');
    if (timeLoc) gl.uniform1f(timeLoc, time);

    const resLoc = this.uniforms.get('iResolution');
    if (resLoc) gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);

    const frameLoc = this.uniforms.get('iFrame');
    if (frameLoc) gl.uniform1i(frameLoc, this.frameCount);

    // iMouse - set to center of screen (no interaction for stock footage)
    const mouseLoc = this.uniforms.get('iMouse');
    if (mouseLoc) gl.uniform4f(mouseLoc, 0.0, 0.0, 0.0, 0.0);

    // iDate - year, month, day, time in seconds
    const dateLoc = this.uniforms.get('iDate');
    if (dateLoc) {
      const now = new Date();
      gl.uniform4f(dateLoc,
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds(),
      );
    }

    // iTimeDelta
    const tdLoc = this.uniforms.get('iTimeDelta');
    if (tdLoc) {
      const dt = this.lastFrameTime > 0 ? time - this.lastFrameTime : 1 / 30;
      gl.uniform1f(tdLoc, dt);
    }

    // iFrameRate
    const frLoc = this.uniforms.get('iFrameRate');
    if (frLoc) {
      const dt = this.lastFrameTime > 0 ? time - this.lastFrameTime : 1 / 30;
      gl.uniform1f(frLoc, dt > 0 ? 1 / dt : 30);
    }

    // iSampleRate
    const srLoc = this.uniforms.get('iSampleRate');
    if (srLoc) gl.uniform1f(srLoc, 44100.0);

    // iChannelTime - all channels get the same time
    const ctLoc = this.uniforms.get('iChannelTime[0]');
    if (ctLoc) {
      gl.uniform1f(ctLoc, time);
      const ct1 = this.uniforms.get('iChannelTime[1]');
      if (ct1) gl.uniform1f(ct1, time);
      const ct2 = this.uniforms.get('iChannelTime[2]');
      if (ct2) gl.uniform1f(ct2, time);
      const ct3 = this.uniforms.get('iChannelTime[3]');
      if (ct3) gl.uniform1f(ct3, time);
    }

    // iChannelResolution - 256x256 noise textures
    const crLoc = this.uniforms.get('iChannelResolution[0]');
    if (crLoc) {
      gl.uniform3f(crLoc, 256, 256, 1);
      const cr1 = this.uniforms.get('iChannelResolution[1]');
      if (cr1) gl.uniform3f(cr1, 256, 256, 1);
      const cr2 = this.uniforms.get('iChannelResolution[2]');
      if (cr2) gl.uniform3f(cr2, 256, 256, 1);
      const cr3 = this.uniforms.get('iChannelResolution[3]');
      if (cr3) gl.uniform3f(cr3, 256, 256, 1);
    }

    // Bind noise textures to iChannel0-3
    for (let i = 0; i < 4; i++) {
      const channelLoc = this.uniforms.get(`iChannel${i}`);
      if (channelLoc && this.noiseTextures[i]) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTextures[i]);
        gl.uniform1i(channelLoc, i);
      }
    }

    // Custom uniforms from sliders
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

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const posAttr = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.finish();
    this.lastFrameTime = time;
    this.frameCount++;
  }

  start(uniformValues: Record<string, number | number[] | string> = {}) {
    this.startTime = performance.now() / 1000;
    this.isRunning = true;
    this.frameCount = 0;
    this.lastFrameTime = 0;

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

  readPixels(): Uint8Array {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

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
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    for (const tex of this.noiseTextures) {
      gl.deleteTexture(tex);
    }
    this.noiseTextures = [];
  }
}

/**
 * Record WebM using MediaRecorder with proper frame pacing.
 * This uses the browser's hardware-accelerated VP9 encoder — fast and reliable.
 */
function recordWebM(
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
      onProgress(frame / totalFrames, `Recording frame ${frame}/${totalFrames}`);

      // Pace at real frame rate for correct video duration
      setTimeout(renderNextFrame, frameTimeMs);
    }

    renderNextFrame();
  });
}

/**
 * Load FFmpeg WASM and convert a WebM blob to the target container/codec.
 * This is a fast remux/transcode since the source is already compressed.
 */
async function convertWithFFmpeg(
  webmBlob: Blob,
  settings: ExportSettings,
  onProgress: (progress: number, stage: string) => void,
): Promise<Blob> {
  onProgress(0, 'Loading converter...');

  const { FFmpeg } = await import('@ffmpeg/ffmpeg');

  const ffmpeg = new FFmpeg();

  // Log progress from FFmpeg
  ffmpeg.on('log', ({ message }) => {
    // Parse FFmpeg time= output for progress
    const timeMatch = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    if (timeMatch) {
      const secs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
      const pct = Math.min(secs / settings.duration, 0.99);
      onProgress(pct, `Converting... ${Math.round(pct * 100)}%`);
    }
  });

  await ffmpeg.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  });

  onProgress(0.05, 'Writing source...');
  const webmData = new Uint8Array(await webmBlob.arrayBuffer());
  await ffmpeg.writeFile('input.webm', webmData);

  const { codec, container, bitrateMbps, pixelFormat } = settings;

  let codecArgs: string[];
  switch (codec) {
    case 'h264':
      codecArgs = [
        '-c:v', 'libx264',
        '-pix_fmt', pixelFormat === 'yuv422p10le' ? 'yuv422p' : 'yuv420p',
        '-b:v', `${bitrateMbps}M`,
        '-maxrate', `${Math.round(bitrateMbps * 1.5)}M`,
        '-bufsize', `${Math.round(bitrateMbps * 2)}M`,
        '-preset', 'ultrafast',
        '-profile:v', 'high',
        '-movflags', '+faststart',
      ];
      break;
    case 'prores':
      codecArgs = [
        '-c:v', 'prores_ks',
        '-profile:v', '3',
        '-pix_fmt', 'yuv422p10le',
        '-vendor', 'apl0',
      ];
      break;
    case 'vp9':
      // Already VP9 WebM — just copy
      codecArgs = ['-c:v', 'copy'];
      break;
    default:
      codecArgs = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast'];
  }

  const outputFile = `output.${container}`;

  onProgress(0.1, `Converting to ${codec.toUpperCase()} .${container.toUpperCase()}...`);

  await ffmpeg.exec([
    '-i', 'input.webm',
    ...codecArgs,
    '-an',
    outputFile,
  ]);

  onProgress(0.95, 'Finalizing...');

  const data = await ffmpeg.readFile(outputFile);

  // Cleanup
  try { await ffmpeg.deleteFile('input.webm'); } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outputFile); } catch { /* ignore */ }

  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  };

  const raw = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const buf = new ArrayBuffer(raw.byteLength);
  new Uint8Array(buf).set(raw);
  return new Blob([buf], { type: mimeTypes[container] || 'video/mp4' });
}

/**
 * Main export function.
 *
 * Strategy: Always record with MediaRecorder first (fast, hardware-accelerated),
 * then convert to the target format with FFmpeg WASM if needed.
 *
 * - WebM VP9: Direct output from MediaRecorder (no FFmpeg needed)
 * - MP4 H.264: Record WebM → transcode with FFmpeg WASM
 * - MOV ProRes: Record WebM → transcode with FFmpeg WASM
 */
export async function exportVideo(
  fragmentShader: string,
  uniformValues: Record<string, number | number[] | string>,
  settings: ExportSettings,
  onProgress: (progress: number, stage: string) => void,
  vertexShader?: string,
): Promise<Blob> {
  const { codec, container } = settings;
  const needsConversion = !(codec === 'vp9' && container === 'webm');

  // Step 1: Record to WebM (always fast — uses browser's hardware encoder)
  const webmBlob = await recordWebM(
    fragmentShader,
    uniformValues,
    settings,
    (p, stage) => {
      if (needsConversion) {
        // Recording is 60% of the total, conversion is 40%
        onProgress(p * 0.6, stage);
      } else {
        onProgress(p, stage);
      }
    },
    vertexShader,
  );

  // Step 2: If target is already WebM VP9, we're done
  if (!needsConversion) {
    return webmBlob;
  }

  // Step 3: Convert WebM → target format with FFmpeg WASM
  try {
    return await convertWithFFmpeg(
      webmBlob,
      settings,
      (p, stage) => {
        onProgress(0.6 + p * 0.4, stage);
      },
    );
  } catch (err) {
    console.warn('FFmpeg conversion failed, returning WebM instead:', err);
    onProgress(1, 'FFmpeg unavailable — saved as WebM');
    return webmBlob;
  }
}

/**
 * Direct WebM export (no FFmpeg, for when FFmpeg fails).
 */
export async function exportVideoFallback(
  fragmentShader: string,
  uniformValues: Record<string, number | number[] | string>,
  settings: ExportSettings,
  onProgress: (progress: number, stage: string) => void,
  vertexShader?: string,
): Promise<Blob> {
  return recordWebM(fragmentShader, uniformValues, settings, onProgress, vertexShader);
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
