import { Renderer, Geometry, Program, Mesh, Texture } from "https://esm.sh/ogl@1.0.3";

/**
 * CONFIG
 * - Replace transition speed, distortion strength, overlay opacity and cursor behavior here.
 * - Replace displacement map URL in CONFIG.displacement.mapUrl.
 */
const CONFIG = {
  render: {
    maxDpr: 2,
  },
  transition: {
    progressLerp: 0.095,
    durationMs: 1450,
  },
  timing: {
    autoAdvanceMs: 3000,
    autoAdvanceJitterMs: [-900, 1100],
    initialOffsetMs: 300,
    introInitialDelayMs: 80,
    introStaggerMs: 140,
  },
  displacement: {
    strength: 0.12,
    mapUrl: "./assets/images/displacement-map.jpg",
    generatedMapSize: 512,
  },
  hover: {
    overlayOpacity: 0.4,
    transitionSlowdown: 1.12,
    displacementBoost: 1.15,
    lerp: 0.12,
  },
  cursor: {
    enabledMinWidth: 1081,
    lerp: 0.72,
  },
};

document.documentElement.style.setProperty("--overlay-opacity", String(CONFIG.hover.overlayOpacity));

/**
 * CONTENT DATA
 * Replace student data and image arrays in PROGRAMS.
 * Every student should keep 2–4 images for in-set image cycling.
 */
const PROGRAMS = [
  {
    name: "form",
    hp: "180hp",
    students: [
      {
        name: "Fanny Axnér",
        title: "Trip stackable",
        images: [
          "https://www.figma.com/api/mcp/asset/e5015b5f-ef97-482f-912f-74a8e29877bb",
        ],
      },
      {
        name: "Ebba Qvinnström",
        title: "VILDA",
        images: [
          "https://www.figma.com/api/mcp/asset/3bb59952-6ed5-432f-b4a4-1ca23e07ad24",
        ],
      },
      {
        name: "Anna Nyman",
        title: "såhär",
        images: [
          "https://www.figma.com/api/mcp/asset/9ed69963-23a6-4e46-935b-242b8a453ec7",
        ],
      },
    ],
  },
  {
    name: "mode",
    hp: "180hp",
    students: [
      {
        name: "Hilda Landström Ferm",
        title: "Dysmorphia",
        images: [
          "https://www.figma.com/api/mcp/asset/3c59c673-a389-48c6-8d3f-642636e10291",
        ],
      },
      {
        name: "Asli Cömert",
        title: "NOBEL CREATIONS",
        images: [
          "https://www.figma.com/api/mcp/asset/a6a5a74e-6840-431a-b1f6-c350dc982360",
        ],
      },
      {
        name: "Clara Samor",
        title: "VÄCK",
        images: [
          "https://www.figma.com/api/mcp/asset/667c8690-1785-4a1c-8c2d-d47151f30b6f",
        ],
      },
    ],
  },
  {
    name: "visuell kommunikation",
    hp: "180hp",
    students: [
      {
        name: "Eliot Axelsson",
        title: "Psyk",
        images: [
          "https://www.figma.com/api/mcp/asset/6a64ffbd-abb4-437d-af2f-043ac4e76bc9",
        ],
      },
      {
        name: "Alva Nylander",
        title: "Sånt du spottar ur dig",
        images: [
          "https://www.figma.com/api/mcp/asset/4eeb2268-4fd7-4632-8fa8-87b007311df5",
        ],
      },
      {
        name: "Maja Ringsäter",
        title: "The Letter Is A Rich Medium",
        images: [
          "https://www.figma.com/api/mcp/asset/d1145e2e-6413-489d-9b3c-85dab80ab4a8",
        ],
      },
    ],
  },
];

const VERTEX_FALLBACK = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_FALLBACK = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uCurrentTexture;
uniform sampler2D uNextTexture;
uniform sampler2D uDisplacement;
uniform vec2 uResolution;
uniform vec2 uCurrentTextureSize;
uniform vec2 uNextTextureSize;
uniform float uProgress;
uniform float uTime;
uniform float uDisplacementStrength;

vec2 coverUv(vec2 uv, vec2 textureSize, vec2 viewport) {
  float viewportRatio = viewport.x / viewport.y;
  float textureRatio = textureSize.x / textureSize.y;
  vec2 result = uv;
  if (viewportRatio > textureRatio) {
    result.y = (uv.y - 0.5) * (textureRatio / viewportRatio) + 0.5;
  } else {
    result.x = (uv.x - 0.5) * (viewportRatio / textureRatio) + 0.5;
  }
  return result;
}

void main() {
  float progress = smoothstep(0.0, 1.0, uProgress);
  float wave = sin((vUv.y + uTime * 0.08) * 6.28318) * 0.5 + 0.5;
  float disp = texture2D(uDisplacement, vUv + vec2(0.0, uTime * 0.03)).r;
  vec2 direction = normalize(vec2(1.0, 0.18));
  float shapeA = uDisplacementStrength * progress * (0.7 + wave * 0.3);
  float shapeB = uDisplacementStrength * (1.0 - progress) * (0.75 + (1.0 - wave) * 0.25);
  vec2 currentUv = coverUv(vUv + direction * disp * shapeA, uCurrentTextureSize, uResolution);
  vec2 nextUv = coverUv(vUv - direction * (1.0 - disp) * shapeB, uNextTextureSize, uResolution);
  currentUv.y = 1.0 - currentUv.y;
  nextUv.y = 1.0 - nextUv.y;
  vec3 currentColor = texture2D(uCurrentTexture, currentUv).rgb;
  vec3 nextColor = texture2D(uNextTexture, nextUv).rgb;
  vec3 color = mix(currentColor, nextColor, progress);
  gl_FragColor = vec4(color, 1.0);
}
`;

const lerp = (from, to, amount) => from + (to - from) * amount;
const randomInRange = ([min, max]) => min + Math.random() * (max - min);
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

async function fetchShader(path, fallback) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Could not load ${path}`);
    }
    return response.text();
  } catch {
    return fallback;
  }
}

function createNoiseDisplacementMap(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = 112 + Math.floor(Math.random() * 143);
    imageData.data[i] = value;
    imageData.data[i + 1] = value;
    imageData.data[i + 2] = value;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image failed to load: ${url}`));
    image.src = url;
  });
}

class ColumnHero {
  constructor(columnEl, program, index, shaders, webglEnabled) {
    this.columnEl = columnEl;
    this.program = program;
    this.index = index;
    this.shaders = shaders;
    this.webglEnabled = webglEnabled;

    this.canvas = columnEl.querySelector(".hero-canvas");
    this.fallbackCurrent = columnEl.querySelector(".fallback-current");
    this.fallbackNext = columnEl.querySelector(".fallback-next");
    this.meta = columnEl.querySelector(".column-meta");
    this.metaStudent = columnEl.querySelector("[data-meta-student]");
    this.metaTitle = columnEl.querySelector("[data-meta-title]");
    this.progressMarkers = columnEl.querySelector("[data-progress-markers]");

    this.renderer = null;
    this.programGL = null;
    this.mesh = null;
    this.whiteTexture = null;
    this.displacementTexture = null;
    this.textureSets = [];

    this.currentState = { student: 0, image: 0 };
    this.pendingState = null;
    this.pendingStudentChange = false;
    this.transitioning = false;
    this.progress = 0;
    this.progressTarget = 0;
    this.hoverMix = 0;
    this.isHovered = false;
    this.fallbackSwapAt = 0;
    this.isInitialized = false;
    this.nextChangeTime = performance.now() + CONFIG.timing.autoAdvanceMs + CONFIG.timing.initialOffsetMs * index;
  }

  async init() {
    this.updateMeta(this.currentState.student, true);
    this.setFallbackInitial();

    if (!this.webglEnabled) {
      this.columnEl.classList.add("no-webgl");
      return;
    }

    try {
      await this.initWebGL();
      await this.preloadTextures();
      this.setInitialTexturesInShader();
      this.columnEl.classList.add("has-webgl");
    } catch (error) {
      console.warn(`WebGL disabled for column "${this.program.name}"`, error);
      this.webglEnabled = false;
      this.columnEl.classList.add("no-webgl");
    }

    this.nextChangeTime = performance.now() + this.nextIntervalMs() + (CONFIG.timing.initialOffsetMs * this.index);
    this.isInitialized = true;
  }

  async initWebGL() {
    this.renderer = new Renderer({
      canvas: this.canvas,
      alpha: false,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, CONFIG.render.maxDpr),
    });

    const gl = this.renderer.gl;
    if (!gl) {
      throw new Error("No GL context");
    }

    this.whiteTexture = this.createSolidTexture(gl, "#ffffff");
    this.displacementTexture = await this.createDisplacementTexture(gl);

    const geometry = new Geometry(gl, {
      position: {
        size: 2,
        data: new Float32Array([
          -1, -1, 1, -1, 1, 1,
          -1, -1, 1, 1, -1, 1,
        ]),
      },
      uv: {
        size: 2,
        data: new Float32Array([
          0, 0, 1, 0, 1, 1,
          0, 0, 1, 1, 0, 1,
        ]),
      },
    });

    this.programGL = new Program(gl, {
      vertex: this.shaders.vertex,
      fragment: this.shaders.fragment,
      uniforms: {
        uCurrentTexture: { value: this.whiteTexture.texture },
        uNextTexture: { value: this.whiteTexture.texture },
        uDisplacement: { value: this.displacementTexture.texture },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uDisplacementStrength: { value: CONFIG.displacement.strength },
        uCurrentTextureSize: { value: [1, 1] },
        uNextTextureSize: { value: [1, 1] },
      },
      transparent: false,
    });

    this.mesh = new Mesh(gl, { geometry, program: this.programGL });
    this.resize();
  }

  createSolidTexture(gl, color) {
    const solid = document.createElement("canvas");
    solid.width = 2;
    solid.height = 2;
    const context = solid.getContext("2d");
    context.fillStyle = color;
    context.fillRect(0, 0, solid.width, solid.height);
    return {
      texture: new Texture(gl, {
        image: solid,
        generateMipmaps: false,
        flipY: false,
      }),
      width: 2,
      height: 2,
      src: "",
    };
  }

  async createDisplacementTexture(gl) {
    let image;
    if (CONFIG.displacement.mapUrl) {
      try {
        image = await loadImage(CONFIG.displacement.mapUrl);
      } catch {
        image = createNoiseDisplacementMap(CONFIG.displacement.generatedMapSize);
      }
    } else {
      image = createNoiseDisplacementMap(CONFIG.displacement.generatedMapSize);
    }

    return {
      texture: new Texture(gl, {
        image,
        generateMipmaps: false,
        wrapS: gl.REPEAT,
        wrapT: gl.REPEAT,
        flipY: false,
      }),
    };
  }

  async preloadTextures() {
    if (!this.webglEnabled) {
      return;
    }

    const gl = this.renderer.gl;
    const sets = await Promise.all(
      this.program.students.map(async (student) => {
        const loaded = await Promise.all(student.images.map(async (src) => {
          try {
            const image = await loadImage(src);
            return {
              texture: new Texture(gl, {
                image,
                generateMipmaps: false,
                flipY: false,
              }),
              width: image.naturalWidth || image.width || 1,
              height: image.naturalHeight || image.height || 1,
              src,
            };
          } catch (error) {
            console.warn(`Skipped image "${src}"`, error);
            return null;
          }
        }));

        const set = loaded.filter(Boolean);
        return set.length ? set : [this.whiteTexture];
      }),
    );

    this.textureSets = sets;
  }

  setInitialTexturesInShader() {
    const initial = this.getTextureForState(this.currentState);
    this.programGL.uniforms.uCurrentTexture.value = initial.texture;
    this.programGL.uniforms.uNextTexture.value = initial.texture;
    this.programGL.uniforms.uCurrentTextureSize.value = [initial.width, initial.height];
    this.programGL.uniforms.uNextTextureSize.value = [initial.width, initial.height];
    this.programGL.uniforms.uProgress.value = 0;
  }

  setFallbackInitial() {
    const first = this.program.students[0]?.images[0] || "";
    this.fallbackCurrent.src = first;
    this.fallbackNext.src = "";
    this.fallbackNext.classList.remove("is-visible");
  }

  getTextureForState(state) {
    if (!this.webglEnabled) {
      return this.whiteTexture;
    }
    const set = this.textureSets[state.student] || [];
    if (!set.length) {
      return this.whiteTexture;
    }
    return set[state.image % set.length];
  }

  updateMeta(studentIndex, immediate = false) {
    const student = this.program.students[studentIndex];
    if (!student) {
      return;
    }

    if (!immediate) {
      this.meta.classList.add("is-swapping");
      window.setTimeout(() => this.meta.classList.remove("is-swapping"), 160);
    }

    this.metaStudent.textContent = student.name;
    this.metaTitle.textContent = student.title;
    this.renderPagination(studentIndex);
  }

  renderPagination(activeIndex) {
    if (!this.progressMarkers) {
      return;
    }

    const markers = this.program.students.map((_, index) => (
      index === activeIndex
        ? '<span class="dot-bar is-active"><span class="dot-fill"></span></span>'
        : '<span class="dot"></span>'
    ));
    this.progressMarkers.innerHTML = markers.join("");
  }

  setHover(value) {
    this.isHovered = value;
    this.columnEl.classList.toggle("is-hovered", value);
  }

  scheduleNext(now) {
    this.nextChangeTime = now + this.nextIntervalMs();
  }

  nextIntervalMs() {
    const interval = CONFIG.timing.autoAdvanceMs + randomInRange(CONFIG.timing.autoAdvanceJitterMs);
    return Math.max(1200, interval);
  }

  startTransition(now) {
    if (this.transitioning) {
      return;
    }

    const nextStudent = (this.currentState.student + 1) % this.program.students.length;
    const nextImage = 0;
    const studentChanged = true;

    this.pendingState = { student: nextStudent, image: nextImage };
    this.pendingStudentChange = studentChanged;
    this.transitioning = true;
    this.progress = 0;
    this.progressTarget = 1;

    if (this.webglEnabled) {
      const currentTexture = this.getTextureForState(this.currentState);
      const nextTexture = this.getTextureForState(this.pendingState);
      this.programGL.uniforms.uCurrentTexture.value = currentTexture.texture;
      this.programGL.uniforms.uCurrentTextureSize.value = [currentTexture.width, currentTexture.height];
      this.programGL.uniforms.uNextTexture.value = nextTexture.texture;
      this.programGL.uniforms.uNextTextureSize.value = [nextTexture.width, nextTexture.height];
      this.programGL.uniforms.uProgress.value = 0;
    } else {
      const nextSource = this.program.students[nextStudent]?.images[nextImage] || this.fallbackCurrent.src;
      this.fallbackNext.src = nextSource;
      this.fallbackNext.classList.add("is-visible");
      this.fallbackSwapAt = now + CONFIG.transition.durationMs * (this.isHovered ? CONFIG.hover.transitionSlowdown : 1);
    }
  }

  completeTransition(now) {
    if (!this.pendingState) {
      return;
    }

    this.currentState = this.pendingState;
    this.pendingState = null;
    this.transitioning = false;
    this.progress = 0;
    this.progressTarget = 0;

    if (this.webglEnabled) {
      const texture = this.getTextureForState(this.currentState);
      this.programGL.uniforms.uCurrentTexture.value = texture.texture;
      this.programGL.uniforms.uCurrentTextureSize.value = [texture.width, texture.height];
      this.programGL.uniforms.uNextTexture.value = texture.texture;
      this.programGL.uniforms.uNextTextureSize.value = [texture.width, texture.height];
      this.programGL.uniforms.uProgress.value = 0;
    } else {
      this.fallbackCurrent.src = this.fallbackNext.src || this.fallbackCurrent.src;
      this.fallbackNext.classList.remove("is-visible");
      this.fallbackSwapAt = 0;
    }

    if (this.pendingStudentChange) {
      this.updateMeta(this.currentState.student);
    }

    this.pendingStudentChange = false;
    this.scheduleNext(now);
  }

  resize() {
    if (!this.webglEnabled || !this.renderer || !this.programGL) {
      return;
    }
    const rect = this.columnEl.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height);
    this.programGL.uniforms.uResolution.value = [this.renderer.width, this.renderer.height];
  }

  update(now, deltaSeconds) {
    if (!this.isInitialized) {
      return;
    }

    if (!this.transitioning && now >= this.nextChangeTime) {
      this.startTransition(now);
    }

    if (this.transitioning) {
      const perFrameLerp = 1 - Math.pow(1 - CONFIG.transition.progressLerp, deltaSeconds * 60);
      this.progress = lerp(this.progress, this.progressTarget, perFrameLerp);

      if (this.webglEnabled) {
        this.programGL.uniforms.uProgress.value = this.progress;
      } else if (this.fallbackSwapAt && now >= this.fallbackSwapAt) {
        this.completeTransition(now);
        return;
      }

      if (this.progress >= 0.995) {
        this.completeTransition(now);
      }
    }

    this.hoverMix = lerp(
      this.hoverMix,
      this.isHovered ? 1 : 0,
      1 - Math.pow(1 - CONFIG.hover.lerp, deltaSeconds * 60),
    );

    if (this.webglEnabled) {
      this.programGL.uniforms.uTime.value = now * 0.001;
      this.programGL.uniforms.uDisplacementStrength.value = lerp(
        CONFIG.displacement.strength,
        CONFIG.displacement.strength * CONFIG.hover.displacementBoost,
        this.hoverMix,
      );
      this.renderer.render({ scene: this.mesh });
    }
  }
}

class TriptychHero {
  constructor(root) {
    this.root = root;
    this.columnEls = [...root.querySelectorAll(".hero-column")];
    this.cursor = root.querySelector("#heroCursor");
    this.cursorProgram = root.querySelector("#cursorProgram");

    this.columns = [];
    this.cursorTarget = { x: 0, y: 0 };
    this.cursorCurrent = { x: 0, y: 0 };
    this.cursorVisible = false;
    this.activeProgramName = PROGRAMS[0].name;

    this.lastFrame = performance.now();
    this.rafId = 0;
  }

  async init() {
    const webglEnabled = supportsWebGL();
    if (!webglEnabled) {
      this.root.classList.add("no-webgl");
    }

    const shaders = {
      vertex: await fetchShader("./triptych-vertex.glsl", VERTEX_FALLBACK),
      fragment: await fetchShader("./triptych-fragment.glsl", FRAGMENT_FALLBACK),
    };

    this.columns = this.columnEls.map((columnEl, index) => (
      new ColumnHero(columnEl, PROGRAMS[index], index, shaders, webglEnabled)
    ));

    const initPromises = this.columns.map((column) => column.init());
    this.runIntroReveal(initPromises);

    await Promise.all(initPromises);
    this.bindEvents();
    this.onResize();
    this.startLoop();
  }

  async runIntroReveal(initPromises) {
    await sleep(CONFIG.timing.introInitialDelayMs);
    for (let index = 0; index < this.columns.length; index += 1) {
      await initPromises[index];
      this.columns[index].columnEl.classList.add("is-revealed");
      await sleep(CONFIG.timing.introStaggerMs);
    }
  }

  bindEvents() {
    this.root.addEventListener("pointermove", (event) => {
      this.cursorTarget.x = event.clientX;
      this.cursorTarget.y = event.clientY;
    });

    this.root.addEventListener("pointerleave", () => {
      this.hideCursor();
      this.columns.forEach((column) => column.setHover(false));
    });

    this.columns.forEach((column, index) => {
      const program = PROGRAMS[index];
      column.columnEl.addEventListener("pointerenter", (event) => {
        column.setHover(true);
        this.showCursor(program.name, event.clientX, event.clientY);
      });
      column.columnEl.addEventListener("pointerleave", () => {
        column.setHover(false);
        const anyHovered = this.columns.some((item) => item.isHovered);
        if (!anyHovered) {
          this.hideCursor();
        }
      });
    });

    window.addEventListener("resize", () => this.onResize());
  }

  showCursor(programName, x, y) {
    if (window.innerWidth < CONFIG.cursor.enabledMinWidth) {
      return;
    }
    if (typeof x === "number" && typeof y === "number") {
      this.cursorTarget.x = x;
      this.cursorTarget.y = y;
      this.cursorCurrent.x = x;
      this.cursorCurrent.y = y;
    }
    this.activeProgramName = programName;
    this.cursorProgram.textContent = programName;
    this.cursorVisible = true;
    this.cursor.classList.add("is-visible");
    this.root.classList.add("is-hovering");
    this.applyCursorTransform(1);
  }

  hideCursor() {
    this.cursorVisible = false;
    this.cursor.classList.remove("is-visible");
    this.root.classList.remove("is-hovering");
  }

  onResize() {
    this.columns.forEach((column) => column.resize());
  }

  applyCursorTransform(scale) {
    this.cursor.style.transform = `translate3d(${this.cursorCurrent.x}px, ${this.cursorCurrent.y}px, 0) translate(-50%, -50%) scale(${scale})`;
  }

  updateCursor(deltaSeconds) {
    if (window.innerWidth < CONFIG.cursor.enabledMinWidth) {
      this.hideCursor();
      return;
    }

    this.cursorCurrent.x = lerp(
      this.cursorCurrent.x,
      this.cursorTarget.x,
      1 - Math.pow(1 - CONFIG.cursor.lerp, deltaSeconds * 60),
    );
    this.cursorCurrent.y = lerp(
      this.cursorCurrent.y,
      this.cursorTarget.y,
      1 - Math.pow(1 - CONFIG.cursor.lerp, deltaSeconds * 60),
    );

    const visibleScale = this.cursorVisible ? 1 : 0.92;
    this.applyCursorTransform(visibleScale);
  }

  frame = (now) => {
    const deltaSeconds = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;

    this.columns.forEach((column) => column.update(now, deltaSeconds));
    this.updateCursor(deltaSeconds);

    this.rafId = requestAnimationFrame(this.frame);
  };

  startLoop() {
    this.rafId = requestAnimationFrame(this.frame);
  }
}

const heroRoot = document.querySelector("#hero");
const hero = new TriptychHero(heroRoot);
hero.init();
