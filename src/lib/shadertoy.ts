/**
 * Convert Shadertoy shader code to standalone GLSL.
 * Shadertoy uses mainImage(out vec4, in vec2) with iTime, iResolution, etc.
 * We wrap it to work with standard WebGL.
 */
export function convertShadertoyShader(code: string): string {
  // Check if it already has a main function that isn't calling mainImage
  const hasStandaloneMain = /void\s+main\s*\(\s*\)/.test(code) &&
    !/mainImage/.test(code);

  if (hasStandaloneMain) {
    // Already standard GLSL, just ensure precision and uniforms
    if (!code.includes('precision')) {
      code = 'precision highp float;\n' + code;
    }
    if (!code.includes('uniform float iTime')) {
      code = 'uniform float iTime;\nuniform vec2 iResolution;\nuniform int iFrame;\n' + code;
    }
    return code;
  }

  // Has mainImage function - wrap it
  let processed = code;

  // Remove any existing precision declarations (we'll add our own)
  processed = processed.replace(/precision\s+(highp|mediump|lowp)\s+float\s*;/g, '');

  // Remove any existing uniform declarations for builtins
  processed = processed.replace(/uniform\s+(float|vec2|vec3|int)\s+i(Time|Resolution|Frame|Mouse|Date)\s*;/g, '');

  // Remove existing main() if it just calls mainImage
  processed = processed.replace(
    /void\s+main\s*\(\s*\)\s*\{[\s\S]*?mainImage\s*\([\s\S]*?\}\s*/g,
    '',
  );

  const result = `precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform int iFrame;

${processed.trim()}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

  return result;
}

/**
 * Extract uniform declarations from shader code to create sliders
 */
export function extractCustomUniforms(code: string): Array<{
  name: string;
  type: string;
}> {
  const builtins = ['iTime', 'iResolution', 'iFrame', 'iMouse', 'iDate', 'iChannel0', 'iChannel1', 'iChannel2', 'iChannel3'];
  const uniforms: Array<{ name: string; type: string }> = [];

  const regex = /uniform\s+(float|vec2|vec3|vec4|int|bool)\s+(\w+)\s*;/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const [, type, name] = match;
    if (!builtins.includes(name)) {
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
