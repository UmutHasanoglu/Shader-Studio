import type { AnimationTemplate } from '@/types';

export const SHADER_TEMPLATES: AnimationTemplate[] = [
  {
    id: 'plasma-waves',
    name: 'Plasma Waves',
    category: 'waves',
    description: 'Colorful plasma wave animation with adjustable speed and complexity',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 1.0, min: 0.1, max: 5.0, step: 0.1, label: 'Speed' },
      { name: 'u_scale', type: 'float', value: 3.0, min: 0.5, max: 10.0, step: 0.1, label: 'Scale' },
      { name: 'u_intensity', type: 'float', value: 1.0, min: 0.1, max: 3.0, step: 0.05, label: 'Intensity' },
      { name: 'u_color_shift', type: 'float', value: 0.0, min: 0.0, max: 6.28, step: 0.01, label: 'Color Shift' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_scale;
      uniform float u_intensity;
      uniform float u_color_shift;

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        vec2 p = uv * u_scale - u_scale * 0.5;
        float t = iTime * u_speed;

        float v1 = sin(p.x * 2.0 + t);
        float v2 = sin(p.y * 2.0 + t * 0.7);
        float v3 = sin(p.x * 2.0 + p.y * 2.0 + t * 0.5);
        float v4 = sin(length(p) * 4.0 - t);

        float v = (v1 + v2 + v3 + v4) * 0.25 * u_intensity;

        vec3 col;
        col.r = sin(v * 3.14159 + u_color_shift) * 0.5 + 0.5;
        col.g = sin(v * 3.14159 + u_color_shift + 2.094) * 0.5 + 0.5;
        col.b = sin(v * 3.14159 + u_color_shift + 4.189) * 0.5 + 0.5;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'fractal-noise',
    name: 'Fractal Noise Flow',
    category: 'noise',
    description: 'Flowing fractal noise with organic movement',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.5, min: 0.05, max: 3.0, step: 0.05, label: 'Speed' },
      { name: 'u_octaves', type: 'float', value: 5.0, min: 1.0, max: 8.0, step: 1.0, label: 'Octaves' },
      { name: 'u_lacunarity', type: 'float', value: 2.0, min: 1.0, max: 4.0, step: 0.1, label: 'Lacunarity' },
      { name: 'u_gain', type: 'float', value: 0.5, min: 0.1, max: 0.9, step: 0.05, label: 'Gain' },
      { name: 'u_color1_r', type: 'float', value: 0.1, min: 0.0, max: 1.0, step: 0.01, label: 'Color 1 R' },
      { name: 'u_color1_g', type: 'float', value: 0.05, min: 0.0, max: 1.0, step: 0.01, label: 'Color 1 G' },
      { name: 'u_color1_b', type: 'float', value: 0.2, min: 0.0, max: 1.0, step: 0.01, label: 'Color 1 B' },
      { name: 'u_color2_r', type: 'float', value: 0.9, min: 0.0, max: 1.0, step: 0.01, label: 'Color 2 R' },
      { name: 'u_color2_g', type: 'float', value: 0.4, min: 0.0, max: 1.0, step: 0.01, label: 'Color 2 G' },
      { name: 'u_color2_b', type: 'float', value: 0.1, min: 0.0, max: 1.0, step: 0.01, label: 'Color 2 B' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_octaves;
      uniform float u_lacunarity;
      uniform float u_gain;
      uniform float u_color1_r;
      uniform float u_color1_g;
      uniform float u_color1_b;
      uniform float u_color2_r;
      uniform float u_color2_g;
      uniform float u_color2_b;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 8; i++) {
          if (float(i) >= u_octaves) break;
          value += amplitude * noise(p * frequency);
          frequency *= u_lacunarity;
          amplitude *= u_gain;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float t = iTime * u_speed;

        float f = fbm(uv * 4.0 + vec2(t * 0.3, t * 0.2));
        f = fbm(uv * 4.0 + vec2(f * 2.0 + t * 0.1));

        vec3 c1 = vec3(u_color1_r, u_color1_g, u_color1_b);
        vec3 c2 = vec3(u_color2_r, u_color2_g, u_color2_b);
        vec3 col = mix(c1, c2, f);
        col = pow(col, vec3(0.8));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    category: 'abstract',
    description: 'Northern lights inspired animation',
    duration: 15,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.3, min: 0.05, max: 2.0, step: 0.05, label: 'Speed' },
      { name: 'u_layers', type: 'float', value: 5.0, min: 1.0, max: 10.0, step: 1.0, label: 'Layers' },
      { name: 'u_brightness', type: 'float', value: 1.5, min: 0.5, max: 4.0, step: 0.1, label: 'Brightness' },
      { name: 'u_wave_height', type: 'float', value: 0.3, min: 0.05, max: 0.8, step: 0.05, label: 'Wave Height' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_layers;
      uniform float u_brightness;
      uniform float u_wave_height;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n = i.x + i.y * 57.0;
        return mix(mix(hash(n), hash(n + 1.0), f.x),
                   mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float t = iTime * u_speed;
        vec3 col = vec3(0.0, 0.02, 0.05);

        for (float i = 0.0; i < 10.0; i++) {
          if (i >= u_layers) break;
          float offset = i * 0.15;
          float wave = sin(uv.x * 3.0 + t + i * 0.7) * u_wave_height;
          wave += sin(uv.x * 5.0 - t * 0.5 + i) * u_wave_height * 0.5;
          wave += noise(vec2(uv.x * 2.0 + t * 0.3, i)) * u_wave_height * 0.3;

          float y = uv.y - 0.4 - offset * 0.05;
          float aurora = exp(-pow((y - wave) * 8.0, 2.0));
          aurora *= 0.3 / u_layers;

          vec3 auroraColor;
          auroraColor.r = sin(i * 0.5 + 1.0) * 0.15;
          auroraColor.g = sin(i * 0.3 + t * 0.2) * 0.3 + 0.6;
          auroraColor.b = sin(i * 0.7 + 2.0) * 0.2 + 0.3;

          col += auroraColor * aurora * u_brightness;
        }

        // Stars
        float star = noise(uv * 200.0);
        star = smoothstep(0.97, 1.0, star) * (1.0 - smoothstep(0.0, 0.5, uv.y));
        col += vec3(star * 0.5);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'geometric-tunnel',
    name: 'Geometric Tunnel',
    category: 'geometry',
    description: 'Infinite tunnel with geometric patterns',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 1.0, min: 0.1, max: 4.0, step: 0.1, label: 'Speed' },
      { name: 'u_segments', type: 'float', value: 6.0, min: 3.0, max: 12.0, step: 1.0, label: 'Segments' },
      { name: 'u_twist', type: 'float', value: 1.0, min: 0.0, max: 5.0, step: 0.1, label: 'Twist' },
      { name: 'u_glow', type: 'float', value: 0.02, min: 0.005, max: 0.1, step: 0.005, label: 'Glow Width' },
      { name: 'u_hue_speed', type: 'float', value: 0.5, min: 0.0, max: 3.0, step: 0.1, label: 'Hue Speed' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_segments;
      uniform float u_twist;
      uniform float u_glow;
      uniform float u_hue_speed;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        float t = iTime * u_speed;

        float angle = atan(uv.y, uv.x);
        float radius = length(uv);

        float tunnelDist = 1.0 / (radius + 0.001);
        float tunnelAngle = angle / 3.14159 * u_segments + t * u_twist;

        float pattern = sin(tunnelDist * 2.0 - t * 3.0) * cos(tunnelAngle);
        float lines = abs(fract(tunnelAngle / 2.0) - 0.5);
        float rings = abs(fract(tunnelDist * 0.5 - t) - 0.5);

        float edge = min(lines, rings);
        float glow = u_glow / (edge + u_glow);

        float hue = fract(tunnelDist * 0.1 - t * u_hue_speed * 0.1 + pattern * 0.1);
        vec3 col = hsv2rgb(vec3(hue, 0.8, 1.0)) * glow;

        col *= smoothstep(0.0, 0.2, radius);
        col = pow(col, vec3(0.9));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'particle-flow',
    name: 'Particle Flow',
    category: 'particles',
    description: 'Flowing particle field with adjustable density',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 1.0, min: 0.1, max: 3.0, step: 0.1, label: 'Speed' },
      { name: 'u_density', type: 'float', value: 30.0, min: 5.0, max: 80.0, step: 1.0, label: 'Density' },
      { name: 'u_size', type: 'float', value: 0.03, min: 0.005, max: 0.1, step: 0.005, label: 'Particle Size' },
      { name: 'u_trail', type: 'float', value: 0.5, min: 0.0, max: 1.0, step: 0.05, label: 'Trail Length' },
      { name: 'u_curl', type: 'float', value: 2.0, min: 0.0, max: 6.0, step: 0.1, label: 'Curl Amount' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_density;
      uniform float u_size;
      uniform float u_trail;
      uniform float u_curl;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float t = iTime * u_speed;
        vec3 col = vec3(0.01, 0.01, 0.03);

        for (float i = 0.0; i < 80.0; i++) {
          if (i >= u_density) break;
          vec2 seed = hash2(vec2(i, i * 1.7));
          vec2 pos = seed;
          pos.x = fract(pos.x + t * (0.05 + seed.y * 0.1));
          pos.y += sin(pos.x * u_curl * 3.14159 + t * 0.5 + seed.x * 6.28) * 0.15;
          pos.y = fract(pos.y);

          float d = length(uv - pos);
          float particle = smoothstep(u_size, 0.0, d);

          // Trail
          vec2 trailPos = pos;
          trailPos.x -= 0.05 * u_trail;
          float td = length(uv - trailPos);
          float trail = smoothstep(u_size * 2.0, 0.0, td) * 0.3 * u_trail;

          float hue = fract(seed.x + t * 0.1);
          vec3 pCol = vec3(
            sin(hue * 6.28) * 0.5 + 0.5,
            sin(hue * 6.28 + 2.094) * 0.5 + 0.5,
            sin(hue * 6.28 + 4.189) * 0.5 + 0.5
          );

          col += pCol * (particle + trail) * 0.8;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'gradient-flow',
    name: 'Gradient Flow',
    category: 'gradient',
    description: 'Smooth animated gradient transitions perfect for backgrounds',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.5, min: 0.05, max: 2.0, step: 0.05, label: 'Speed' },
      { name: 'u_complexity', type: 'float', value: 3.0, min: 1.0, max: 8.0, step: 0.5, label: 'Complexity' },
      { name: 'u_saturation', type: 'float', value: 0.7, min: 0.0, max: 1.0, step: 0.05, label: 'Saturation' },
      { name: 'u_brightness', type: 'float', value: 0.6, min: 0.1, max: 1.0, step: 0.05, label: 'Brightness' },
      { name: 'u_contrast', type: 'float', value: 1.0, min: 0.2, max: 3.0, step: 0.1, label: 'Contrast' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_complexity;
      uniform float u_saturation;
      uniform float u_brightness;
      uniform float u_contrast;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float t = iTime * u_speed;

        float h = sin(uv.x * u_complexity + t) * 0.5
                + sin(uv.y * u_complexity * 0.7 + t * 1.3) * 0.25
                + sin((uv.x + uv.y) * u_complexity * 0.5 + t * 0.7) * 0.25;

        h = h * 0.5 + 0.5;
        h = pow(h, u_contrast);

        float hue = fract(h * 0.5 + t * 0.05);
        vec3 col = hsv2rgb(vec3(hue, u_saturation, u_brightness));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'voronoi-cells',
    name: 'Voronoi Cells',
    category: 'geometry',
    description: 'Animated Voronoi cell pattern with glowing edges',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.5, min: 0.05, max: 2.0, step: 0.05, label: 'Speed' },
      { name: 'u_scale', type: 'float', value: 5.0, min: 2.0, max: 15.0, step: 0.5, label: 'Cell Scale' },
      { name: 'u_edge_width', type: 'float', value: 0.05, min: 0.01, max: 0.2, step: 0.01, label: 'Edge Width' },
      { name: 'u_edge_glow', type: 'float', value: 2.0, min: 0.5, max: 5.0, step: 0.1, label: 'Edge Glow' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_scale;
      uniform float u_edge_width;
      uniform float u_edge_glow;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        vec2 p = uv * u_scale;
        float t = iTime * u_speed;

        vec2 ip = floor(p);
        vec2 fp = fract(p);

        float d1 = 8.0;
        float d2 = 8.0;
        vec2 closest;

        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 neighbor = vec2(float(i), float(j));
            vec2 point = hash2(ip + neighbor);
            point = 0.5 + 0.5 * sin(t + 6.2831 * point);
            vec2 diff = neighbor + point - fp;
            float d = dot(diff, diff);
            if (d < d1) {
              d2 = d1;
              d1 = d;
              closest = ip + neighbor;
            } else if (d < d2) {
              d2 = d;
            }
          }
        }

        float edge = d2 - d1;
        float glow = u_edge_width / (edge + u_edge_width);
        glow = pow(glow, u_edge_glow);

        vec2 cellId = hash2(closest);
        float hue = fract(cellId.x + t * 0.1);
        vec3 cellColor = vec3(
          sin(hue * 6.28) * 0.3 + 0.15,
          sin(hue * 6.28 + 2.094) * 0.3 + 0.15,
          sin(hue * 6.28 + 4.189) * 0.3 + 0.15
        );

        vec3 edgeColor = vec3(0.4, 0.7, 1.0) * glow;
        vec3 col = cellColor + edgeColor;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'mandelbrot-zoom',
    name: 'Mandelbrot Zoom',
    category: 'abstract',
    description: 'Animated zoom into the Mandelbrot fractal set',
    duration: 15,
    fps: 30,
    uniforms: [
      { name: 'u_zoom_speed', type: 'float', value: 0.5, min: 0.1, max: 2.0, step: 0.05, label: 'Zoom Speed' },
      { name: 'u_max_iter', type: 'float', value: 100.0, min: 20.0, max: 300.0, step: 10.0, label: 'Max Iterations' },
      { name: 'u_color_speed', type: 'float', value: 1.0, min: 0.1, max: 5.0, step: 0.1, label: 'Color Speed' },
      { name: 'u_center_x', type: 'float', value: -0.745, min: -2.0, max: 1.0, step: 0.001, label: 'Center X' },
      { name: 'u_center_y', type: 'float', value: 0.186, min: -1.5, max: 1.5, step: 0.001, label: 'Center Y' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_zoom_speed;
      uniform float u_max_iter;
      uniform float u_color_speed;
      uniform float u_center_x;
      uniform float u_center_y;

      vec3 palette(float t) {
        vec3 a = vec3(0.5);
        vec3 b = vec3(0.5);
        vec3 c = vec3(1.0);
        vec3 d = vec3(0.0, 0.33, 0.67);
        return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        float zoom = pow(2.0, -iTime * u_zoom_speed);
        vec2 c = uv * zoom * 3.0 + vec2(u_center_x, u_center_y);

        vec2 z = vec2(0.0);
        float iter = 0.0;
        for (int i = 0; i < 300; i++) {
          if (float(i) >= u_max_iter) break;
          z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
          if (dot(z, z) > 4.0) break;
          iter++;
        }

        vec3 col = vec3(0.0);
        if (iter < u_max_iter) {
          float smooth_iter = iter - log2(log2(dot(z, z))) + 4.0;
          col = palette(smooth_iter * 0.02 + iTime * u_color_speed * 0.1);
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    category: 'waves',
    description: 'Realistic ocean wave simulation with sun reflection',
    duration: 15,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 1.0, min: 0.1, max: 3.0, step: 0.1, label: 'Wave Speed' },
      { name: 'u_wave_height', type: 'float', value: 0.6, min: 0.1, max: 2.0, step: 0.05, label: 'Wave Height' },
      { name: 'u_water_color_r', type: 'float', value: 0.0, min: 0.0, max: 0.3, step: 0.01, label: 'Water R' },
      { name: 'u_water_color_g', type: 'float', value: 0.15, min: 0.0, max: 0.5, step: 0.01, label: 'Water G' },
      { name: 'u_water_color_b', type: 'float', value: 0.3, min: 0.0, max: 0.6, step: 0.01, label: 'Water B' },
      { name: 'u_sun_intensity', type: 'float', value: 1.5, min: 0.0, max: 4.0, step: 0.1, label: 'Sun Intensity' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_wave_height;
      uniform float u_water_color_r;
      uniform float u_water_color_g;
      uniform float u_water_color_b;
      uniform float u_sun_intensity;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                   mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }

      float wave(vec2 p, float t) {
        float w = 0.0;
        w += sin(p.x * 1.0 + t * 1.5) * 0.5;
        w += sin(p.x * 2.3 + p.y * 0.5 + t * 2.0) * 0.3;
        w += sin(p.x * 3.7 - t * 1.0 + p.y * 1.5) * 0.15;
        w += noise(p * 3.0 + t) * 0.2;
        return w * u_wave_height;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float t = iTime * u_speed;

        // Sky
        vec3 skyColor = mix(vec3(0.9, 0.5, 0.2), vec3(0.2, 0.4, 0.8), uv.y);

        // Water surface
        float horizon = 0.4;
        if (uv.y < horizon) {
          vec2 waterUV = vec2(uv.x, (horizon - uv.y) / horizon);
          waterUV.x *= iResolution.x / iResolution.y;

          float depth = 1.0 / (waterUV.y + 0.1);
          vec2 p = vec2(waterUV.x * depth, depth);

          float w = wave(p, t);
          float normalX = wave(p + vec2(0.01, 0.0), t) - w;
          float normalY = wave(p + vec2(0.0, 0.01), t) - w;

          vec3 waterColor = vec3(u_water_color_r, u_water_color_g, u_water_color_b);
          waterColor += vec3(0.05, 0.1, 0.15) * w;

          // Sun reflection
          float sunRefl = exp(-pow((uv.x - 0.5 + normalX * 2.0) * 4.0, 2.0));
          sunRefl *= exp(-waterUV.y * 2.0);
          waterColor += vec3(1.0, 0.8, 0.5) * sunRefl * u_sun_intensity;

          // Fresnel-ish
          float fresnel = pow(1.0 - waterUV.y, 3.0);
          waterColor = mix(waterColor, skyColor * 0.5, fresnel * 0.3);

          gl_FragColor = vec4(waterColor, 1.0);
        } else {
          // Sun
          float sunDist = length(vec2(uv.x - 0.5, uv.y - 0.55));
          float sun = smoothstep(0.06, 0.03, sunDist);
          float sunGlow = exp(-sunDist * 8.0) * 0.5;
          skyColor += vec3(1.0, 0.9, 0.7) * (sun + sunGlow) * u_sun_intensity;

          gl_FragColor = vec4(skyColor, 1.0);
        }
      }
    `,
  },
  {
    id: 'neon-grid',
    name: 'Neon Grid',
    category: 'geometry',
    description: 'Retro 80s style neon grid animation',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 1.0, min: 0.1, max: 3.0, step: 0.1, label: 'Speed' },
      { name: 'u_grid_size', type: 'float', value: 10.0, min: 4.0, max: 30.0, step: 1.0, label: 'Grid Size' },
      { name: 'u_glow', type: 'float', value: 1.5, min: 0.5, max: 4.0, step: 0.1, label: 'Glow Intensity' },
      { name: 'u_perspective', type: 'float', value: 2.0, min: 0.5, max: 5.0, step: 0.1, label: 'Perspective' },
      { name: 'u_line_hue', type: 'float', value: 0.85, min: 0.0, max: 1.0, step: 0.01, label: 'Line Hue' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_grid_size;
      uniform float u_glow;
      uniform float u_perspective;
      uniform float u_line_hue;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float t = iTime * u_speed;

        vec3 col = vec3(0.0);

        // Sky gradient
        col = mix(vec3(0.0, 0.0, 0.05), vec3(0.1, 0.0, 0.15), uv.y);

        float horizon = 0.45;
        if (uv.y < horizon) {
          float depth = 1.0 / ((horizon - uv.y) * u_perspective + 0.01);
          float x = (uv.x - 0.5) * depth;

          float gridX = abs(fract(x * u_grid_size * 0.1) - 0.5);
          float gridZ = abs(fract(depth * 0.5 - t) - 0.5);

          float lineX = 0.005 * depth / (gridX + 0.005 * depth);
          float lineZ = 0.005 * depth / (gridZ + 0.005 * depth);

          float grid = max(lineX, lineZ) * u_glow;
          grid *= exp(-depth * 0.03);

          vec3 gridColor = hsv2rgb(vec3(u_line_hue, 0.9, 1.0));
          col += gridColor * grid;

          // Horizon glow
          float horizonGlow = exp(-abs(uv.y - horizon) * 30.0);
          col += hsv2rgb(vec3(u_line_hue + 0.1, 0.7, 0.8)) * horizonGlow * 0.5;
        }

        // Sun
        vec2 sunPos = vec2(0.5, 0.7);
        float sunDist = length((uv - sunPos) * vec2(1.0, iResolution.x / iResolution.y));
        float sun = smoothstep(0.15, 0.1, sunDist);

        // Sun stripes
        float stripe = step(0.0, sin(uv.y * 80.0));
        sun *= mix(0.5, 1.0, stripe);

        vec3 sunColor = mix(vec3(1.0, 0.2, 0.5), vec3(1.0, 0.8, 0.0), (uv.y - 0.55) * 4.0);
        col += sunColor * sun;
        col += vec3(1.0, 0.3, 0.5) * exp(-sunDist * 5.0) * 0.3;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'volumetric-clouds',
    name: 'Volumetric Clouds',
    category: 'abstract',
    description: 'Raymarched volumetric clouds with fbm noise - similar to iq\'s famous cloud shader',
    duration: 15,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.3, min: 0.0, max: 2.0, step: 0.05, label: 'Wind Speed' },
      { name: 'u_coverage', type: 'float', value: 0.5, min: 0.0, max: 1.0, step: 0.05, label: 'Cloud Coverage' },
      { name: 'u_thickness', type: 'float', value: 0.5, min: 0.1, max: 1.0, step: 0.05, label: 'Thickness' },
      { name: 'u_sun_r', type: 'float', value: 1.0, min: 0.0, max: 1.0, step: 0.01, label: 'Sun R' },
      { name: 'u_sun_g', type: 'float', value: 0.7, min: 0.0, max: 1.0, step: 0.01, label: 'Sun G' },
      { name: 'u_sun_b', type: 'float', value: 0.4, min: 0.0, max: 1.0, step: 0.01, label: 'Sun B' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_coverage;
      uniform float u_thickness;
      uniform float u_sun_r;
      uniform float u_sun_g;
      uniform float u_sun_b;

      float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }

      float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100.0);
        for (int i = 0; i < 5; i++) {
          v += a * noise3D(p);
          p = p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      float cloudDensity(vec3 p) {
        float t = iTime * u_speed;
        p.x += t * 0.5;
        float d = fbm(p * 0.8) - (0.55 - u_coverage * 0.4);
        return clamp(d * (2.0 + u_thickness * 4.0), 0.0, 1.0);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

        // Camera
        vec3 ro = vec3(0.0, 1.5, 0.0);
        vec3 rd = normalize(vec3(uv.x, uv.y + 0.2, 1.0));

        // Sun direction
        vec3 sunDir = normalize(vec3(0.6, 0.4, 0.5));
        vec3 sunColor = vec3(u_sun_r, u_sun_g, u_sun_b);

        // Sky
        float sky = max(rd.y, 0.0);
        vec3 col = mix(vec3(0.4, 0.5, 0.7), vec3(0.15, 0.25, 0.55), sky);

        // Sun
        float sunDot = max(dot(rd, sunDir), 0.0);
        col += sunColor * pow(sunDot, 32.0) * 0.5;
        col += sunColor * pow(sunDot, 256.0) * 1.5;

        // Raymarch clouds
        if (rd.y > 0.0) {
          float tMin = (2.0 - ro.y) / rd.y;
          float tMax = (5.0 - ro.y) / rd.y;
          float t = tMin;
          float dt = (tMax - tMin) / 32.0;
          float transmittance = 1.0;
          vec3 scattering = vec3(0.0);

          for (int i = 0; i < 32; i++) {
            vec3 p = ro + rd * t;
            float density = cloudDensity(p);

            if (density > 0.01) {
              // Light scattering
              float lightDensity = cloudDensity(p + sunDir * 0.3);
              float lightTransmit = exp(-lightDensity * 2.0);

              vec3 ambient = vec3(0.4, 0.45, 0.55) * 0.5;
              vec3 direct = sunColor * lightTransmit * 1.5;
              vec3 luminance = ambient + direct;

              float alpha = density * dt * 3.0;
              scattering += transmittance * luminance * alpha;
              transmittance *= exp(-alpha);

              if (transmittance < 0.01) break;
            }
            t += dt;
          }

          col = col * transmittance + scattering;
        }

        col = pow(col, vec3(0.9));
        col = clamp(col, 0.0, 1.0);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'raymarched-sphere',
    name: 'Raymarched 3D Scene',
    category: 'geometry',
    description: 'Raymarched 3D scene with reflections and soft shadows',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.5, min: 0.0, max: 2.0, step: 0.05, label: 'Speed' },
      { name: 'u_specular', type: 'float', value: 32.0, min: 4.0, max: 128.0, step: 4.0, label: 'Specular' },
      { name: 'u_ambient', type: 'float', value: 0.15, min: 0.0, max: 0.5, step: 0.01, label: 'Ambient' },
      { name: 'u_ao_strength', type: 'float', value: 0.5, min: 0.0, max: 1.0, step: 0.05, label: 'AO Strength' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_specular;
      uniform float u_ambient;
      uniform float u_ao_strength;

      float sdSphere(vec3 p, float r) { return length(p) - r; }
      float sdBox(vec3 p, vec3 b) {
        vec3 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
      }
      float sdPlane(vec3 p) { return p.y; }

      float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }

      float scene(vec3 p) {
        float t = iTime * u_speed;

        // Animated sphere
        vec3 sp = p - vec3(0.0, 1.0 + sin(t * 2.0) * 0.3, 0.0);
        float sphere = sdSphere(sp, 0.8);

        // Rotating box
        float c = cos(t); float s = sin(t);
        vec3 bp = p - vec3(2.0 * sin(t * 0.7), 0.7, 2.0 * cos(t * 0.7));
        bp.xz = mat2(c, -s, s, c) * bp.xz;
        float box = sdBox(bp, vec3(0.5));

        // Torus-like ring
        vec3 tp = p - vec3(-1.5 * cos(t * 0.5), 0.6, -1.5 * sin(t * 0.5));
        float ring = sdSphere(tp, 0.5);

        float objects = smin(smin(sphere, box, 0.5), ring, 0.5);
        float plane = sdPlane(p);

        return min(objects, plane);
      }

      vec3 calcNormal(vec3 p) {
        vec2 e = vec2(0.001, 0.0);
        return normalize(vec3(
          scene(p + e.xyy) - scene(p - e.xyy),
          scene(p + e.yxy) - scene(p - e.yxy),
          scene(p + e.yyx) - scene(p - e.yyx)
        ));
      }

      float calcAO(vec3 p, vec3 n) {
        float ao = 0.0;
        for (int i = 1; i <= 5; i++) {
          float dist = float(i) * 0.08;
          ao += (dist - scene(p + n * dist)) / pow(2.0, float(i));
        }
        return 1.0 - ao * u_ao_strength * 3.0;
      }

      float softShadow(vec3 ro, vec3 rd, float mint, float maxt) {
        float res = 1.0;
        float t = mint;
        for (int i = 0; i < 32; i++) {
          float h = scene(ro + rd * t);
          res = min(res, 8.0 * h / t);
          t += clamp(h, 0.02, 0.2);
          if (h < 0.001 || t > maxt) break;
        }
        return clamp(res, 0.0, 1.0);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        float t = iTime * u_speed;

        vec3 ro = vec3(4.0 * sin(t * 0.3), 2.5, 4.0 * cos(t * 0.3));
        vec3 target = vec3(0.0, 0.5, 0.0);
        vec3 fwd = normalize(target - ro);
        vec3 right = normalize(cross(fwd, vec3(0, 1, 0)));
        vec3 up = cross(right, fwd);
        vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * fwd);

        // Raymarch
        float dist = 0.0;
        for (int i = 0; i < 100; i++) {
          float d = scene(ro + rd * dist);
          if (d < 0.001 || dist > 50.0) break;
          dist += d;
        }

        vec3 col = vec3(0.4, 0.5, 0.7) - rd.y * 0.3; // sky

        if (dist < 50.0) {
          vec3 p = ro + rd * dist;
          vec3 n = calcNormal(p);

          vec3 lightDir = normalize(vec3(0.8, 0.6, 0.3));
          float diff = max(dot(n, lightDir), 0.0);
          vec3 h = normalize(lightDir - rd);
          float spec = pow(max(dot(n, h), 0.0), u_specular);
          float shadow = softShadow(p + n * 0.01, lightDir, 0.02, 10.0);
          float ao = calcAO(p, n);

          vec3 mate = vec3(0.3, 0.35, 0.4);
          if (p.y < 0.001) {
            // Checkerboard floor
            float checker = mod(floor(p.x) + floor(p.z), 2.0);
            mate = mix(vec3(0.3), vec3(0.6), checker);
          }

          col = mate * (u_ambient + diff * shadow) * ao;
          col += vec3(1.0, 0.9, 0.7) * spec * shadow;
        }

        col = pow(col, vec3(0.4545)); // gamma
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'fluid-simulation',
    name: 'Fluid Flow',
    category: 'noise',
    description: 'Scientific fluid dynamics visualization with curl noise',
    duration: 15,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.4, min: 0.05, max: 2.0, step: 0.05, label: 'Flow Speed' },
      { name: 'u_viscosity', type: 'float', value: 3.0, min: 1.0, max: 8.0, step: 0.5, label: 'Viscosity' },
      { name: 'u_turbulence', type: 'float', value: 1.0, min: 0.0, max: 3.0, step: 0.1, label: 'Turbulence' },
      { name: 'u_palette', type: 'float', value: 0.0, min: 0.0, max: 6.28, step: 0.1, label: 'Color Shift' },
      { name: 'u_contrast', type: 'float', value: 1.5, min: 0.5, max: 4.0, step: 0.1, label: 'Contrast' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_viscosity;
      uniform float u_turbulence;
      uniform float u_palette;
      uniform float u_contrast;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 6; i++) {
          v += a * noise(p);
          p = rot * p * 2.0 + vec2(100.0);
          a *= 0.5;
        }
        return v;
      }

      vec3 palette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0 + u_palette, 0.33, 0.67);
        return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        vec2 p = uv * u_viscosity;
        float t = iTime * u_speed;

        // Domain warping (curl noise approximation)
        float f1 = fbm(p + vec2(t * 0.1, t * 0.05));
        vec2 warp1 = vec2(f1, fbm(p + vec2(5.2 + t * 0.15, 1.3 - t * 0.1)));
        float f2 = fbm(p + warp1 * u_turbulence + vec2(1.7, 9.2));
        vec2 warp2 = vec2(f2, fbm(p + warp1 * u_turbulence + vec2(8.3 + t * 0.05, 2.8)));
        float f = fbm(p + warp2 * u_turbulence);

        // Color mapping
        f = pow(f, 1.0 / u_contrast);
        vec3 col = palette(f * 2.0 + t * 0.05);

        // Add subtle vein-like structure
        float veins = abs(f2 - 0.5) * 2.0;
        veins = pow(veins, 3.0);
        col = mix(col, col * 1.5, veins * 0.3);

        col = clamp(col, 0.0, 1.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'dna-helix',
    name: 'DNA Double Helix',
    category: 'geometry',
    description: 'Scientific DNA double helix animation with glowing nucleotides',
    duration: 10,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 1.0, min: 0.1, max: 3.0, step: 0.1, label: 'Rotation Speed' },
      { name: 'u_glow', type: 'float', value: 1.5, min: 0.5, max: 4.0, step: 0.1, label: 'Glow Intensity' },
      { name: 'u_zoom', type: 'float', value: 1.0, min: 0.3, max: 3.0, step: 0.1, label: 'Zoom' },
      { name: 'u_pairs', type: 'float', value: 12.0, min: 4.0, max: 24.0, step: 1.0, label: 'Base Pairs' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_glow;
      uniform float u_zoom;
      uniform float u_pairs;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - r;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        uv *= u_zoom;
        float t = iTime * u_speed;

        vec3 col = vec3(0.02, 0.02, 0.06);

        float totalGlow = 0.0;
        vec3 helixColor = vec3(0.0);

        for (float i = 0.0; i < 24.0; i++) {
          if (i >= u_pairs) break;
          float phase = i / u_pairs * 6.2832;
          float y = (i / u_pairs - 0.5) * 2.5;
          float yOffset = fract(t * 0.2) * (2.5 / u_pairs) * u_pairs;
          y -= yOffset;
          if (y < -1.4) y += 2.5;
          if (y > 1.4) y -= 2.5;

          // Two backbone strands
          float angle1 = phase + t;
          float angle2 = phase + t + 3.14159;

          float x1 = sin(angle1) * 0.3;
          float z1 = cos(angle1);
          float x2 = sin(angle2) * 0.3;
          float z2 = cos(angle2);

          // Depth-based size
          float depth1 = z1 * 0.5 + 0.5;
          float depth2 = z2 * 0.5 + 0.5;

          vec2 p1 = vec2(x1, y);
          vec2 p2 = vec2(x2, y);

          // Backbone spheres
          float d1 = length(uv - p1) - 0.03 * (0.5 + depth1);
          float d2 = length(uv - p2) - 0.03 * (0.5 + depth2);

          // Base pair connection
          float bridge = sdCapsule(uv, p1, p2, 0.008);

          float glow1 = 0.005 * u_glow / (abs(d1) + 0.005);
          float glow2 = 0.005 * u_glow / (abs(d2) + 0.005);
          float bridgeGlow = 0.003 * u_glow / (abs(bridge) + 0.003);

          // Color by nucleotide type
          float hue1 = mod(i, 4.0) / 4.0;
          float hue2 = mod(i + 2.0, 4.0) / 4.0;

          vec3 c1 = hsv2rgb(vec3(hue1, 0.8, 1.0)) * glow1 * depth1;
          vec3 c2 = hsv2rgb(vec3(hue2, 0.8, 1.0)) * glow2 * depth2;
          vec3 cb = vec3(0.3, 0.5, 0.8) * bridgeGlow * min(depth1, depth2);

          helixColor += c1 + c2 + cb;
        }

        col += helixColor;
        col = clamp(col, 0.0, 1.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
  {
    id: 'black-hole',
    name: 'Black Hole',
    category: 'abstract',
    description: 'Gravitational lensing effect around a black hole with accretion disk',
    duration: 15,
    fps: 30,
    uniforms: [
      { name: 'u_speed', type: 'float', value: 0.3, min: 0.05, max: 1.5, step: 0.05, label: 'Rotation Speed' },
      { name: 'u_disk_brightness', type: 'float', value: 2.0, min: 0.5, max: 5.0, step: 0.1, label: 'Disk Brightness' },
      { name: 'u_warp_strength', type: 'float', value: 1.0, min: 0.0, max: 3.0, step: 0.1, label: 'Warp Strength' },
      { name: 'u_star_density', type: 'float', value: 1.0, min: 0.0, max: 3.0, step: 0.1, label: 'Star Density' },
    ],
    fragmentShader: `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform float u_speed;
      uniform float u_disk_brightness;
      uniform float u_warp_strength;
      uniform float u_star_density;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }

      float stars(vec2 uv) {
        float n = hash(floor(uv * 300.0));
        return smoothstep(0.98 - u_star_density * 0.02, 1.0, n);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        float t = iTime * u_speed;

        float r = length(uv);
        float angle = atan(uv.y, uv.x);

        // Gravitational lensing distortion
        float warp = u_warp_strength / (r * r + 0.3);
        vec2 warped = uv + normalize(uv) * warp * 0.05;

        // Background stars with distortion
        vec3 col = vec3(0.0);
        float starField = stars(warped * 5.0);
        starField += stars(warped * 8.0 + 100.0) * 0.5;
        col += vec3(0.8, 0.85, 1.0) * starField;

        // Nebula background
        float nebula = noise(warped * 3.0 + t * 0.1) * 0.5;
        nebula += noise(warped * 6.0 - t * 0.05) * 0.25;
        col += vec3(0.1, 0.05, 0.2) * nebula;

        // Accretion disk
        float diskAngle = angle + t * 2.0;
        float diskR = r;
        float diskThickness = 0.15;
        float innerR = 0.2;
        float outerR = 0.8;

        if (diskR > innerR && diskR < outerR) {
          float diskFade = smoothstep(innerR, innerR + 0.1, diskR) *
                           smoothstep(outerR, outerR - 0.15, diskR);

          float diskNoise = noise(vec2(diskAngle * 3.0, diskR * 10.0) + t);
          diskNoise *= noise(vec2(diskAngle * 7.0 + t * 3.0, diskR * 5.0));

          // Doppler effect - brighter approaching side
          float doppler = 1.0 + 0.5 * sin(angle + t * 2.0);

          vec3 hotColor = vec3(1.0, 0.8, 0.3);
          vec3 coolColor = vec3(0.8, 0.2, 0.05);
          float temp = smoothstep(outerR, innerR, diskR);
          vec3 diskColor = mix(coolColor, hotColor, temp) * u_disk_brightness;

          col += diskColor * diskFade * (diskNoise * 0.5 + 0.5) * doppler;
        }

        // Black hole shadow
        float shadow = smoothstep(0.18, 0.12, r);
        col *= (1.0 - shadow);

        // Event horizon glow
        float horizonGlow = exp(-abs(r - 0.15) * 30.0);
        col += vec3(0.5, 0.3, 0.1) * horizonGlow * 0.5;

        // Photon ring
        float photonRing = exp(-abs(r - 0.2) * 50.0);
        col += vec3(1.0, 0.9, 0.7) * photonRing * 0.8;

        col = clamp(col, 0.0, 1.0);
        col = pow(col, vec3(0.9));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
];

export const SHADERTOY_TEMPLATE = `
// Shadertoy-compatible shader
// Available uniforms:
//   iTime       - time in seconds
//   iResolution - viewport resolution (width, height)
//   iFrame      - frame number

precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform int iFrame;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
  fragColor = vec4(col, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export const DEFAULT_VERTEX_SHADER = `
  attribute vec3 position;
  attribute vec2 uv;
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;
