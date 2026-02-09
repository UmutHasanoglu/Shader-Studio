# Shader Studio

A browser-based animation creation tool for producing professional stock footage using GLSL shaders, SVG animations, and AI-assisted generation. Built with Next.js 14, WebGL2, and TypeScript.

## Features

### Shader Animation Engine
- **25 built-in templates** across categories: abstract, waves, geometry, particles, noise, gradients
- Real-time WebGL2 preview with adjustable parameters via sliders
- Every template has configurable uniforms (speed, color, scale, etc.)
- Templates include: Plasma Waves, Aurora Borealis, Volumetric Clouds, Black Hole, DNA Helix, Fire & Flames, Liquid Chrome, Sacred Geometry, Bokeh Lights, Digital Rain, and more

### Shadertoy Import
- Paste any Shadertoy shader and it auto-converts to run locally
- Full Shadertoy uniform compatibility: `iTime`, `iResolution`, `iFrame`, `iMouse`, `iDate`, `iTimeDelta`, `iFrameRate`, `iSampleRate`, `iChannel0-3`
- Procedural noise textures bound to `iChannel0-3`
- `texture()` to `texture2D()` mapping for GLSL ES 1.0 compatibility
- **Save as Template** to reuse imported shaders later (persisted in browser)
- 5 quick-start example shaders included

### AI Shader Chat
- Generate shaders from natural language descriptions
- Supports Anthropic (Claude) and OpenAI (GPT-4o, o1, o3) models
- Model selector always visible with provider toggle
- Auto-applies generated code to the preview
- API keys stored locally in your browser

### SVG Animator
- Upload or paste SVG files
- 10 animation templates: Fade, Bounce, Slide, Rotate, Pulse, Float, Spin & Scale, Color Cycle, Wobble
- Real-time animated preview with keyframe interpolation
- Configurable duration, background color, and easing functions
- Export as video

### Video Export
- **Formats**: MP4 (H.264), MOV (ProRes 422 HQ), WebM (VP9)
- **Resolutions**: 1080p, 2K, 4K UHD, 4K DCI, plus vertical and cinematic
- **Aspect ratios**: 16:9, 9:16, 4:3, 1:1, 2.39:1
- Two-stage pipeline: MediaRecorder (hardware VP9) then FFmpeg WASM transcode
- Frame capture as high-resolution PNG
- Export queue for batch rendering
- Stock platform presets: Adobe Stock, Shutterstock, Pond5

### Code Editor
- Built-in GLSL editor with syntax highlighting
- Edit shader code directly and see changes in real-time
- Works with both custom code and template-based shaders

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage Guide

### Creating Animations from Templates

1. Click the **Templates** tab in the left sidebar
2. Browse and click any template to load it
3. The preview starts immediately in the center panel
4. Adjust sliders in the right **Controls** panel to customize
5. Use the timeline at the bottom to scrub through time or play/pause

### Importing Shadertoy Shaders

1. Click the **Shadertoy** tab
2. Paste shader code from [shadertoy.com](https://shadertoy.com) into the text area
3. Click **Import & Preview**
4. The shader runs immediately - if it fails, check the error banner on the preview
5. Click **Save as Template** to keep it for later use
6. Your saved templates appear at the top of the Shadertoy panel

**Supported Shadertoy features:**
- `mainImage(out vec4 fragColor, in vec2 fragCoord)` format
- All standard uniforms (`iTime`, `iResolution`, `iMouse`, `iDate`, etc.)
- `texture()` function calls (auto-mapped to `texture2D`)
- `iChannel0-3` with procedural noise textures
- Single-pass shaders (multi-pass Buffer A/B/C/D not yet supported)

### Using AI Chat

1. Click **AI Chat** in the top-right corner
2. Select your provider (Anthropic or OpenAI) and model
3. Click **Set API Key** and enter your API key
4. Type a prompt like "Create a colorful aurora borealis effect"
5. The AI generates GLSL code that auto-applies to the preview
6. Click **Apply this shader** on any previous response to re-apply it

### SVG Animations

1. Click the **SVG Animator** tab
2. Upload an SVG file (drag & drop or click to browse)
3. Or paste SVG code using the expandable textarea
4. Set a name, background color, and duration
5. Select an animation template (Fade, Bounce, Rotate, etc.)
6. Click **Create Animation**
7. The preview shows the animated SVG in real-time
8. Use play/pause to control playback

### Exporting Video

1. Click the **Export** tab
2. Choose a stock platform preset or configure manually:
   - Resolution (1080p to 4K)
   - Codec (H.264, ProRes, VP9)
   - Container (MP4, MOV, WebM)
   - FPS (24, 30, 60)
   - Duration and bitrate
3. Click **Export Video** to start rendering
4. The file auto-downloads when complete
5. Use **Capture Frame** to export a single PNG frame

### Export Queue

1. Configure export settings
2. Click **Add to Queue** instead of Export Video
3. Add multiple configurations
4. Click **Start Queue** to batch-render all items sequentially

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand with localStorage persistence
- **Rendering**: WebGL2 (with WebGL fallback)
- **Video Export**: MediaRecorder API (VP9) + FFmpeg WASM (H.264/ProRes transcode)
- **AI**: Anthropic API, OpenAI API (proxied through Next.js API route)

## Stock Platform Requirements

| Platform | Format | Resolution | FPS | Duration |
|----------|--------|-----------|-----|----------|
| Adobe Stock | H.264 MP4 or ProRes MOV | 1920-4096px | 24-60 | 5-60s |
| Shutterstock | H.264 MOV | 1920-3840px | 24-30 | 5-60s |
| Pond5 | ProRes MOV or H.264 MP4 | 1920-4096px | 24-60 | 5-60s |

## Browser Requirements

- Chrome 94+ or Edge 94+ (for WebGL2 + MediaRecorder VP9)
- SharedArrayBuffer support required for FFmpeg WASM (COOP/COEP headers configured automatically)

## License

Private project.
