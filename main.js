/**
 * Beckmans Hero — Displacement Hover Transition
 *
 * OGL-based WebGL renderer with GSAP animation timing.
 * Displacement map shader creates organic, directional UV warping
 * between hero state images on hover.
 */

import { Renderer, Geometry, Program, Mesh, Texture } from 'https://esm.sh/ogl@1.0.3';

/* ═══════════════════════════════════════════════════════════
   Configuration — tweak these to adjust the effect
   ═══════════════════════════════════════════════════════════ */

const CONFIG = {
  // Image paths for each hero state
  images: [
    './assets/images/form-figma.png',
    './assets/images/mode-figma.png',
    './assets/images/vk-figma.png',
  ],

  // Displacement shader parameters
  intensity: 0.35,       // Peak UV displacement strength (softer)
  rgbShift: 0.003,       // Chromatic aberration amount

  // GSAP animation timing
  duration: 1.4,         // Displacement morph duration (seconds)
  ease: 'sine.inOut',    // Soft, fluid easing
  revealDuration: 0.8,   // Alpha fade-in duration
  revealEase: 'sine.out',
  hideDuration: 0.6,     // Alpha fade-out duration
  hideEase: 'sine.in',

  // Mouse follow
  mouseLerp: 0.06,       // Smoothing factor (lower = smoother)

  // HP bracket gap from link edge
  hpGap: 40,
};

/* ═══════════════════════════════════════════════════════════
   Inline shader fallbacks (used if .glsl fetch fails)
   ═══════════════════════════════════════════════════════════ */

const VERTEX_FALLBACK = `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_FALLBACK = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform sampler2D uDisplacement;
uniform float uProgress;
uniform float uAlpha;
uniform float uTime;
uniform float uIntensity;
uniform float uRgbShift;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uTex1Res;
uniform vec2 uTex2Res;
vec2 coverUV(vec2 uv, vec2 t, vec2 s) {
    float sa = s.x/s.y, ta = t.x/t.y;
    vec2 r = uv;
    if (sa > ta) r.y = (uv.y-0.5)*(ta/sa)+0.5;
    else r.x = (uv.x-0.5)*(sa/ta)+0.5;
    return r;
}
void main() {
    float disp = texture2D(uDisplacement, vUv).r;
    float strength = uIntensity * sin(uProgress * 3.14159265);
    vec2 mouseOff = (uMouse - 0.5) * 0.015 * strength;
    vec2 dir = vec2(0.8, 0.2);
    vec2 d1 = vUv + dir * disp * strength + mouseOff;
    vec2 d2 = vUv - dir * (1.0 - disp) * strength - mouseOff;
    vec2 uv1 = coverUV(d1, uTex1Res, uResolution);
    vec2 uv2 = coverUV(d2, uTex2Res, uResolution);
    float ca = uRgbShift * strength;
    vec3 c1 = vec3(texture2D(uTexture1,uv1+vec2(ca,0)).r, texture2D(uTexture1,uv1).g, texture2D(uTexture1,uv1-vec2(ca,0)).b);
    vec3 c2 = vec3(texture2D(uTexture2,uv2+vec2(ca,0)).r, texture2D(uTexture2,uv2).g, texture2D(uTexture2,uv2-vec2(ca,0)).b);
    vec3 color = mix(c1, c2, uProgress) * 0.5;
    gl_FragColor = vec4(color, uAlpha);
}`;

/* ═══════════════════════════════════════════════════════════
   Shader loading — tries .glsl files, falls back to inline
   ═══════════════════════════════════════════════════════════ */

async function loadShaders() {
  try {
    const [vertex, fragment] = await Promise.all([
      fetch('shaders/vertex.glsl').then(r => { if (!r.ok) throw 0; return r.text(); }),
      fetch('shaders/fragment.glsl').then(r => { if (!r.ok) throw 0; return r.text(); }),
    ]);
    return { vertex, fragment };
  } catch {
    return { vertex: VERTEX_FALLBACK, fragment: FRAGMENT_FALLBACK };
  }
}

/* ═══════════════════════════════════════════════════════════
   Displacement map generation (Perlin noise FBM)
   Produces a smooth, organic grayscale texture at the given
   resolution. The FBM octaves create multi-scale turbulence
   that drives natural-looking directional displacement.
   ═══════════════════════════════════════════════════════════ */

function generateDisplacementMap(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const d = imageData.data;

  // Permutation table
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);

  function perlin(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  // Fill pixels with 5-octave FBM
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let val = 0, amp = 0.5, freq = 4 / size;
      for (let o = 0; o < 5; o++) {
        val += amp * perlin(x * freq, y * freq);
        amp *= 0.5;
        freq *= 2;
      }
      const byte = Math.max(0, Math.min(255, ((val + 1) * 0.5 * 255) | 0));
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = byte;
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/* ═══════════════════════════════════════════════════════════
   DisplacementTransition — OGL WebGL renderer
   Manages the fullscreen displacement shader, texture
   loading, GSAP-driven animation, and mouse tracking.
   ═══════════════════════════════════════════════════════════ */

class DisplacementTransition {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
    this.program = null;
    this.mesh = null;
    this.textures = [];       // { texture, width, height }[]
    this.whiteTexture = null;  // 1x1 white for idle state
    this.dispTexture = null;   // Procedural displacement map

    this.toIndex = -1;
    this.progress = { value: 0 };
    this.alpha = { value: 0 };
    this.mouse = [0.5, 0.5];
    this.targetMouse = [0.5, 0.5];

    this.activeTween = null;
    this.alphaTween = null;
    this.ready = false;
    this.raf = null;
  }

  async init() {
    // Create OGL renderer with transparent background
    this.renderer = new Renderer({
      canvas: this.canvas,
      alpha: true,
      premultipliedAlpha: false,
      dpr: Math.min(devicePixelRatio || 1, 2),
      width: this.canvas.parentElement.clientWidth,
      height: this.canvas.parentElement.clientHeight,
    });
    const gl = this.renderer.gl;

    // Load shaders (files with inline fallback)
    const { vertex, fragment } = await loadShaders();

    // Generate procedural displacement map
    const dispCanvas = generateDisplacementMap(512);
    this.dispTexture = new Texture(gl, {
      image: dispCanvas,
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      generateMipmaps: false,
    });

    // 1x1 white texture for idle → image transitions
    const whiteCanvas = document.createElement('canvas');
    whiteCanvas.width = whiteCanvas.height = 1;
    const wctx = whiteCanvas.getContext('2d');
    wctx.fillStyle = '#fff';
    wctx.fillRect(0, 0, 1, 1);
    this.whiteTexture = {
      texture: new Texture(gl, { image: whiteCanvas, generateMipmaps: false }),
      width: 1,
      height: 1,
    };

    // Shader program with all uniforms
    this.program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTexture1:     { value: this.whiteTexture.texture },
        uTexture2:     { value: this.whiteTexture.texture },
        uDisplacement: { value: this.dispTexture },
        uProgress:     { value: 0 },
        uAlpha:        { value: 0 },
        uTime:         { value: 0 },
        uIntensity:    { value: CONFIG.intensity },
        uRgbShift:     { value: CONFIG.rgbShift },
        uResolution:   { value: [this.canvas.width, this.canvas.height] },
        uMouse:        { value: [0.5, 0.5] },
        uTex1Res:      { value: [1, 1] },
        uTex2Res:      { value: [1, 1] },
      },
      transparent: true,
    });

    // Fullscreen quad — UV (0,0) at top-left of screen, (1,1) at bottom-right
    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([
        -1, -1,   1, -1,   1,  1,
        -1, -1,   1,  1,  -1,  1,
      ])},
      uv: { size: 2, data: new Float32Array([
         0,  0,   1,  0,   1,  1,
         0,  0,   1,  1,   0,  1,
      ])},
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });

    this.resize();
    this.startLoop();
    return true;
  }

  // Preload all state images as OGL textures
  async preload(urls) {
    const gl = this.renderer.gl;
    try {
      this.textures = await Promise.all(urls.map(url =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const texture = new Texture(gl, { image: img, generateMipmaps: false });
            resolve({ texture, width: img.naturalWidth, height: img.naturalHeight });
          };
          img.onerror = reject;
          img.src = url;
        })
      ));
      this.ready = true;
      return true;
    } catch (err) {
      console.error('Texture preload failed:', err);
      return false;
    }
  }

  // Transition to a new image state
  setTarget(index) {
    if (!this.ready || index < 0 || index >= this.textures.length) return;

    // Kill in-flight tweens immediately
    if (this.activeTween) this.activeTween.kill();
    if (this.alphaTween) this.alphaTween.kill();

    const u = this.program.uniforms;
    const isSwitch = this.toIndex >= 0 && this.toIndex < this.textures.length;

    // For image-to-image: set texture1 to the CURRENT visual output.
    // If mid-transition, blend from/to into a snapshot by just keeping
    // whatever is on screen (texture2 at current progress acts as "from").
    if (isSwitch) {
      const from = this.textures[this.toIndex];
      u.uTexture1.value = from.texture;
      u.uTex1Res.value = [from.width, from.height];
    } else {
      u.uTexture1.value = this.whiteTexture.texture;
      u.uTex1Res.value = [1, 1];
    }

    const to = this.textures[index];
    u.uTexture2.value = to.texture;
    u.uTex2Res.value = [to.width, to.height];

    // Reset progress synchronously BEFORE creating the tween.
    // Both texture uniforms and progress are set in the same JS task,
    // so the next render will see them together — no flash possible.
    this.progress.value = 0;
    u.uProgress.value = 0;
    this.toIndex = index;

    this.activeTween = gsap.fromTo(this.progress,
      { value: 0 },
      {
        value: 1,
        duration: CONFIG.duration,
        ease: CONFIG.ease,
        overwrite: true,
        onUpdate: () => { u.uProgress.value = this.progress.value; },
      }
    );

    this.alphaTween = gsap.to(this.alpha, {
      value: 1,
      duration: CONFIG.revealDuration,
      ease: CONFIG.revealEase,
      overwrite: true,
      onUpdate: () => { u.uAlpha.value = this.alpha.value; },
    });
  }

  // Fade out to idle (white background shows through)
  setIdle() {
    if (this.activeTween) this.activeTween.kill();
    if (this.alphaTween) this.alphaTween.kill();

    const u = this.program.uniforms;
    this.alphaTween = gsap.to(this.alpha, {
      value: 0,
      duration: CONFIG.hideDuration,
      ease: CONFIG.hideEase,
      onUpdate: () => { u.uAlpha.value = this.alpha.value; },
      onComplete: () => { this.toIndex = -1; },
    });
  }

  // Update target mouse position (normalized 0–1, Y flipped for GL)
  updateMouse(x, y) {
    this.targetMouse = [x, y];
  }

  // Sync canvas to parent hero dimensions
  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h);
    if (this.program) {
      this.program.uniforms.uResolution.value = [this.renderer.width, this.renderer.height];
    }
  }

  // RequestAnimationFrame render loop
  startLoop() {
    const loop = (t) => {
      this.raf = requestAnimationFrame(loop);

      // Lerp mouse for smooth tracking
      this.mouse[0] += (this.targetMouse[0] - this.mouse[0]) * CONFIG.mouseLerp;
      this.mouse[1] += (this.targetMouse[1] - this.mouse[1]) * CONFIG.mouseLerp;

      if (this.program) {
        this.program.uniforms.uTime.value = t * 0.001;
        this.program.uniforms.uMouse.value = this.mouse;
      }

      this.renderer.render({ scene: this.mesh });
    };
    this.raf = requestAnimationFrame(loop);
  }
}

/* ═══════════════════════════════════════════════════════════
   Hero Controller — DOM interaction and state management
   ═══════════════════════════════════════════════════════════ */

const hero      = document.querySelector('.hero');
const headline  = document.querySelector('.headline');
const canvas    = document.getElementById('webgl-canvas');
const hpInner   = document.getElementById('hp-inner');
const textLinks = [...document.querySelectorAll('.line[data-index]')];

let current = -1;
let transition = null;

// Position the (180hp) bracket element relative to the active link
function placeHp(index) {
  const link = textLinks[index];
  const heroRect = hero.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const hpH = hpInner.offsetHeight;
  const fontSize = parseFloat(getComputedStyle(link).fontSize);
  const descent = fontSize * 0.18;
  const linkBottom = linkRect.bottom - heroRect.top;
  const linkRight  = linkRect.right - heroRect.left;
  hpInner.style.left = `${linkRight + CONFIG.hpGap}px`;
  hpInner.style.top  = `${linkBottom - hpH - descent}px`;
}

function paintText(index) {
  textLinks.forEach((line, i) => line.classList.toggle('is-active', i === index));
  placeHp(index);
}

function setState(index) {
  if (index === current) return;
  current = index;
  hero.classList.remove('is-idle');
  paintText(current);
  if (transition) transition.setTarget(current);
}

function setIdle() {
  current = -1;
  hero.classList.add('is-idle');
  textLinks.forEach(line => line.classList.remove('is-active'));
  if (transition) transition.setIdle();
}

// Mouse tracking for shader displacement influence
function onMouseMove(e) {
  if (!transition) return;
  const rect = hero.getBoundingClientRect();
  transition.updateMouse(
    (e.clientX - rect.left) / rect.width,
    1 - (e.clientY - rect.top) / rect.height  // flip Y for GL
  );
}

/* ═══════════════════════════════════════════════════════════
   Initialization
   ═══════════════════════════════════════════════════════════ */

async function init() {
  // Create and initialize the WebGL transition
  transition = new DisplacementTransition(canvas);
  try {
    await transition.init();
    const ok = await transition.preload(CONFIG.images);
    if (ok) hero.classList.add('has-webgl');
  } catch (err) {
    console.error('WebGL init failed, falling back to static images:', err);
    transition = null;
  }

  // Link hover handlers
  textLinks.forEach((link, index) => {
    link.addEventListener('mouseenter', () => setState(index));
    link.addEventListener('focus', () => setState(index));
    link.addEventListener('click', () => setState(index));
    link.addEventListener('blur', () => {
      setTimeout(() => {
        if (!headline.contains(document.activeElement)) setIdle();
      }, 0);
    });
  });

  headline.addEventListener('mouseleave', setIdle);
  hero.addEventListener('mouseleave', setIdle);
  hero.addEventListener('mousemove', onMouseMove);

  // Resize handler
  window.addEventListener('resize', () => {
    if (transition) transition.resize();
    if (current >= 0) placeHp(current);
  });
}

init();
