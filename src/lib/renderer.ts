import type { ShaderUniform, ExportSettings } from '@/types';
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
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
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
 * Export animation as video using MediaRecorder + OffscreenCanvas approach.
 * Renders frame-by-frame at the exact fps for deterministic output.
 */
export async function exportVideo(
  fragmentShader: string,
  uniformValues: Record<string, number | number[] | string>,
  settings: ExportSettings,
  onProgress: (progress: number) => void,
  vertexShader?: string,
): Promise<Blob> {
  const { resolution, fps, duration, format, quality } = settings;

  // Create offscreen canvas at target resolution
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

  // Use MediaRecorder for WebM
  const stream = canvas.captureStream(0);
  const mimeType = format === 'webm' ? 'video/webm;codecs=vp9' : 'video/webm';
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: Math.round(resolution.width * resolution.height * fps * quality * 0.15),
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      renderer.destroy();
      const blob = new Blob(chunks, { type: `video/${format}` });
      resolve(blob);
    };

    mediaRecorder.onerror = (e) => {
      renderer.destroy();
      reject(e);
    };

    mediaRecorder.start();

    let frame = 0;

    function renderNextFrame() {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const time = frame * frameDuration;
      renderer.renderFrame(time, uniformValues);

      // Request frame from the capture stream
      const track = stream.getVideoTracks()[0] as any;
      if (track.requestFrame) {
        track.requestFrame();
      }

      frame++;
      onProgress(frame / totalFrames);

      // Use setTimeout to avoid blocking the UI
      setTimeout(renderNextFrame, 0);
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
