/**
 * Full Shadertoy-compatible GLSL converter.
 *
 * Handles the standard Shadertoy uniform set:
 *   iTime, iResolution, iFrame, iMouse, iDate,
 *   iTimeDelta, iFrameRate, iSampleRate,
 *   iChannelTime[4], iChannelResolution[4],
 *   iChannel0..3 (sampler2D)
 *
 * Also handles common Shadertoy patterns:
 *   - mainImage(out vec4, in vec2) wrapping
 *   - #version directives
 *   - Removal of existing precision/uniform declarations
 *   - texture() / textureLod() compatibility for channels
 */

// All Shadertoy built-in uniform names
const SHADERTOY_BUILTINS = [
  'iTime', 'iResolution', 'iFrame', 'iMouse', 'iDate',
  'iTimeDelta', 'iFrameRate', 'iSampleRate',
  'iChannelTime', 'iChannelResolution',
  'iChannel0', 'iChannel1', 'iChannel2', 'iChannel3',
];

/**
 * Convert Shadertoy shader code to standalone WebGL2-compatible GLSL.
 */
export function convertShadertoyShader(code: string): string {
  // Check if it already has a main function that isn't calling mainImage
  const hasStandaloneMain = /void\s+main\s*\(\s*\)/.test(code) &&
    !/mainImage/.test(code);

  if (hasStandaloneMain) {
    // Already standard GLSL, ensure precision and uniforms
    let result = code;
    if (!result.includes('precision')) {
      result = 'precision highp float;\n' + result;
    }
    // Add any missing built-in uniforms
    result = ensureBuiltinUniforms(result);
    return result;
  }

  // Has mainImage function - wrap it
  let processed = code;

  // Remove #version directives (we'll use WebGL2 default)
  processed = processed.replace(/#version\s+\d+(\s+es)?\s*\n?/g, '');

  // Remove any existing precision declarations (we'll add our own)
  processed = processed.replace(/precision\s+(highp|mediump|lowp)\s+\w+\s*;/g, '');

  // Remove any existing uniform declarations for builtins
  processed = processed.replace(
    /uniform\s+\w+\s+i(Time|Resolution|Frame|Mouse|Date|TimeDelta|FrameRate|SampleRate|ChannelTime|ChannelResolution|Channel[0-3])\s*(\[[\d]*\])?\s*;/g,
    '',
  );

  // Remove existing main() if it just calls mainImage
  processed = processed.replace(
    /void\s+main\s*\(\s*\)\s*\{[\s\S]*?mainImage\s*\([\s\S]*?\}\s*/g,
    '',
  );

  // Handle common Shadertoy defines
  // Some shaders use `#define PI 3.14159` etc. - these are fine
  // But handle the case where they define their own texture function
  processed = processed.replace(/#define\s+texture2D\s+texture\b/g, '');

  const result = `precision highp float;
precision highp int;

// GLSL ES 1.0 compatibility for Shadertoy's ES 3.0 texture functions
#define texture texture2D

// Shadertoy built-in uniforms
uniform float iTime;
uniform vec3 iResolution;
uniform int iFrame;
uniform vec4 iMouse;
uniform vec4 iDate;
uniform float iTimeDelta;
uniform float iFrameRate;
uniform float iSampleRate;
uniform float iChannelTime[4];
uniform vec3 iChannelResolution[4];
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

${processed.trim()}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

  return result;
}

/**
 * Ensure built-in uniforms are declared when they're used
 */
function ensureBuiltinUniforms(code: string): string {
  const uniformDecls: string[] = [];

  const checkAndAdd = (name: string, type: string, arraySize?: string) => {
    const namePattern = new RegExp(`\\b${name}\\b`);
    const declPattern = new RegExp(`uniform\\s+\\w+\\s+${name}\\s*(\\[\\d*\\])?\\s*;`);
    if (namePattern.test(code) && !declPattern.test(code)) {
      uniformDecls.push(`uniform ${type} ${name}${arraySize || ''};`);
    }
  };

  checkAndAdd('iTime', 'float');
  checkAndAdd('iResolution', 'vec3');
  checkAndAdd('iFrame', 'int');
  checkAndAdd('iMouse', 'vec4');
  checkAndAdd('iDate', 'vec4');
  checkAndAdd('iTimeDelta', 'float');
  checkAndAdd('iFrameRate', 'float');
  checkAndAdd('iSampleRate', 'float');
  checkAndAdd('iChannelTime', 'float', '[4]');
  checkAndAdd('iChannelResolution', 'vec3', '[4]');
  checkAndAdd('iChannel0', 'sampler2D');
  checkAndAdd('iChannel1', 'sampler2D');
  checkAndAdd('iChannel2', 'sampler2D');
  checkAndAdd('iChannel3', 'sampler2D');

  if (uniformDecls.length > 0) {
    // Insert after precision declaration or at the start
    const precisionMatch = code.match(/precision\s+(highp|mediump|lowp)\s+\w+\s*;/);
    if (precisionMatch) {
      const idx = code.indexOf(precisionMatch[0]) + precisionMatch[0].length;
      return code.slice(0, idx) + '\n' + uniformDecls.join('\n') + '\n' + code.slice(idx);
    }
    return uniformDecls.join('\n') + '\n' + code;
  }

  return code;
}

/**
 * Extract uniform declarations from shader code to create sliders
 */
export function extractCustomUniforms(code: string): Array<{
  name: string;
  type: string;
}> {
  const uniforms: Array<{ name: string; type: string }> = [];

  const regex = /uniform\s+(float|vec2|vec3|vec4|int|bool)\s+(\w+)\s*;/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const [, type, name] = match;
    if (!SHADERTOY_BUILTINS.includes(name)) {
      uniforms.push({ name, type });
    }
  }

  return uniforms;
}

/**
 * Validate GLSL syntax (basic check)
 */
export function validateGLSL(code: string): { valid: boolean; error?: string } {
  // Check for mainImage or main
  const hasMainImage = /void\s+mainImage\s*\(/.test(code);
  const hasMain = /void\s+main\s*\(/.test(code);

  if (!hasMainImage && !hasMain) {
    return { valid: false, error: 'Shader must have either mainImage() or main() function' };
  }

  // Check for balanced braces
  let braceCount = 0;
  for (const char of code) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) return { valid: false, error: 'Unmatched closing brace' };
  }
  if (braceCount !== 0) return { valid: false, error: 'Unmatched opening brace' };

  return { valid: true };
}

/**
 * Detect which Shadertoy features a shader uses
 */
export function detectShaderFeatures(code: string): {
  usesChannels: boolean[];
  usesTexture: boolean;
  usesMouse: boolean;
  usesDate: boolean;
  usesTimeDelta: boolean;
} {
  return {
    usesChannels: [
      /\biChannel0\b/.test(code),
      /\biChannel1\b/.test(code),
      /\biChannel2\b/.test(code),
      /\biChannel3\b/.test(code),
    ],
    usesTexture: /\btexture\s*\(/.test(code) || /\btextureLod\s*\(/.test(code),
    usesMouse: /\biMouse\b/.test(code),
    usesDate: /\biDate\b/.test(code),
    usesTimeDelta: /\biTimeDelta\b/.test(code),
  };
}
