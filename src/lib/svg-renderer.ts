import type { SVGAnimation, SVGKeyframe } from '@/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOut(t: number): number {
  return t * (2 - t);
}

function easeIn(t: number): number {
  return t * t;
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in': return easeIn(t);
    case 'ease-out': return easeOut(t);
    case 'ease-in-out': return easeInOut(t);
    case 'linear': return t;
    default: return easeInOut(t);
  }
}

function interpolateKeyframes(
  keyframes: SVGKeyframe[],
  normalizedTime: number,
  easing: string,
): Record<string, number> {
  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].properties as Record<string, number>;

  // Find surrounding keyframes
  let prevKf = keyframes[0];
  let nextKf = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (normalizedTime >= keyframes[i].time && normalizedTime <= keyframes[i + 1].time) {
      prevKf = keyframes[i];
      nextKf = keyframes[i + 1];
      break;
    }
  }

  const segmentLength = nextKf.time - prevKf.time;
  const segmentT = segmentLength > 0
    ? (normalizedTime - prevKf.time) / segmentLength
    : 0;
  const easedT = applyEasing(segmentT, easing);

  const result: Record<string, number> = {};
  const allKeys = new Set([
    ...Object.keys(prevKf.properties),
    ...Object.keys(nextKf.properties),
  ]);

  for (const key of allKeys) {
    const a = (prevKf.properties[key] as number) ?? 0;
    const b = (nextKf.properties[key] as number) ?? a;
    result[key] = lerp(a, b, easedT);
  }

  return result;
}

export function buildSVGTransform(props: Record<string, number>): string {
  const parts: string[] = [];

  if (props.translateX !== undefined || props.translateY !== undefined) {
    parts.push(`translate(${props.translateX ?? 0}px, ${props.translateY ?? 0}px)`);
  }
  if (props.rotate !== undefined) {
    parts.push(`rotate(${props.rotate}deg)`);
  }
  if (props.scale !== undefined) {
    parts.push(`scale(${props.scale})`);
  } else if (props.scaleX !== undefined || props.scaleY !== undefined) {
    parts.push(`scale(${props.scaleX ?? 1}, ${props.scaleY ?? 1})`);
  }

  return parts.join(' ');
}

export function buildSVGFilter(props: Record<string, number>): string {
  const parts: string[] = [];
  if (props.hueRotate !== undefined) {
    parts.push(`hue-rotate(${props.hueRotate}deg)`);
  }
  return parts.join(' ');
}

/**
 * Renders an SVG animation frame to canvas for export
 */
export async function renderSVGFrame(
  animation: SVGAnimation,
  normalizedTime: number,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = animation.backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  const props = interpolateKeyframes(
    animation.keyframes,
    normalizedTime,
    animation.easing,
  );

  // Create a container SVG with transforms applied
  const svgContent = animation.svgContent;
  const transform = buildSVGTransform(props);
  const filter = buildSVGFilter(props);
  const opacity = props.opacity ?? 1;

  const wrappedSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <g transform="translate(${width / 2}, ${height / 2})" style="opacity: ${opacity}; filter: ${filter};">
        <g style="transform: ${transform}; transform-origin: center;">
          <g transform="translate(${-width / 4}, ${-height / 4})">
            ${stripSVGWrapper(svgContent, width / 2, height / 2)}
          </g>
        </g>
      </g>
    </svg>
  `;

  const blob = new Blob([wrappedSVG], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.src = url;
  });
}

function stripSVGWrapper(svg: string, targetW: number, targetH: number): string {
  // Remove outer <svg> tags and set width/height on inner content
  let inner = svg
    .replace(/<\?xml[^?]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '');

  // Extract content between svg tags
  const match = inner.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (match) {
    // Get viewBox or width/height from original SVG
    const svgTag = inner.match(/<svg([^>]*)>/i);
    let viewBox = '';
    if (svgTag) {
      const vbMatch = svgTag[1].match(/viewBox="([^"]*)"/);
      if (vbMatch) viewBox = vbMatch[1];
    }

    if (viewBox) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${targetW}" height="${targetH}" viewBox="${viewBox}">${match[1]}</svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${targetW}" height="${targetH}">${match[1]}</svg>`;
  }
  return svg;
}

/**
 * Export SVG animation as video
 */
export async function exportSVGVideo(
  animation: SVGAnimation,
  width: number,
  height: number,
  fps: number,
  duration: number,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const totalFrames = Math.ceil(duration * fps);
  const stream = canvas.captureStream(0);

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: Math.round(width * height * fps * 0.15),
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    mediaRecorder.onerror = reject;
    mediaRecorder.start();

    let frame = 0;

    async function renderNext() {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const normalizedTime = (frame / totalFrames); // loops
      const frameCanvas = await renderSVGFrame(animation, normalizedTime, width, height);

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frameCanvas, 0, 0);

      const track = stream.getVideoTracks()[0] as any;
      if (track.requestFrame) track.requestFrame();

      frame++;
      onProgress(frame / totalFrames);
      setTimeout(renderNext, 0);
    }

    renderNext();
  });
}
