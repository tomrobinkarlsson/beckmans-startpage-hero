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
    holdDurationMs: [2800, 4200],
    initialOffsetMs: 300,
  },
  displacement: {
    strength: 0.12,
    mapUrl: "./assets/images/displacement-map.jpg",
    generatedMapSize: 512,
  },
  hover: {
    overlayOpacity: 0.4,
    holdMultiplier: 1.18,
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
          "https://www.figma.com/api/mcp/asset/247de4d8-69a8-4420-b992-681283d9cfd4",
          "./assets/images/form-figma.png",
        ],
      },
      {
        name: "Ebba Qvinnström",
        title: "VILDA",
        images: [
          "https://www.figma.com/api/mcp/asset/278b8ad1-727a-4e00-bb17-80514ccf0709",
          "./assets/images/form.jpg",
        ],
      },
      {
        name: "Anna Nyman",
        title: "såhär",
        images: [
          "https://www.figma.com/api/mcp/asset/0f64b8e4-c688-4b77-bc99-00d5b0012e4f",
          "./assets/images/form-figma.png",
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
          "https://www.figma.com/api/mcp/asset/d9725796-7814-4ab4-b044-8bb70f9de11b",
          "./assets/images/mode-figma.png",
        ],
      },
      {
        name: "Asli Cömert",
        title: "NOBEL CREATIONS",
        images: [
          "https://www.figma.com/api/mcp/asset/69ee5a0b-6e41-4a26-a320-896f525ba28a",
          "./assets/images/mode.jpg",
        ],
      },
      {
        name: "Clara Samor",
        title: "VÄCK",
        images: [
          "https://www.figma.com/api/mcp/asset/cb15edaa-f165-4bce-a84c-2a4756542545",
          "./assets/images/mode-figma.png",
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
          "https://www.figma.com/api/mcp/asset/5d150a7b-bd4b-4fa2-97c3-6efbc28a2067",
          "./assets/images/vk-figma.png",
        ],
      },
      {
        name: "Alva Nylander",
        title: "Sånt du spottar ur dig",
        images: [
          "https://www.figma.com/api/mcp/asset/10b6317b-523c-4840-9cc2-d12cf93b3ff4",
          "./assets/images/vk.jpg",
        ],
      },
      {
        name: "Maja Ringsäter",
        title: "The Letter Is A Rich Medium",
        images: [
          "https://www.figma.com/api/mcp/asset/e334aeb6-4412-4b1f-9c9b-dfbee7fe17df",
          "./assets/images/vk-figma.png",
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
    this.nextChangeTime = performance.now() + randomInRange(CONFIG.timing.holdDurationMs) + CONFIG.timing.initialOffsetMs * index;
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
    const sets = [];
    for (const student of this.program.students) {
      const set = [];
      for (const src of student.images) {
        try {
          const image = await loadImage(src);
          set.push({
            texture: new Texture(gl, {
              image,
              generateMipmaps: false,
              flipY: false,
            }),
            width: image.naturalWidth || image.width || 1,
            height: image.naturalHeight || image.height || 1,
            src,
          });
        } catch (error) {
          console.warn(`Skipped image "${src}"`, error);
        }
      }
      sets.push(set.length ? set : [this.whiteTexture]);
    }
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

    const total = this.program.students.length;
    const fragment = document.createDocumentFragment();
    const row = document.createElement("span");
    row.className = "pagination-markers";

    for (let index = 0; index < total; index += 1) {
      if (index === activeIndex) {
        const track = document.createElement("span");
        track.className = "pagination-track";
        const fill = document.createElement("span");
        fill.className = "pagination-fill";
        track.appendChild(fill);
        row.appendChild(track);
      } else {
        const dot = document.createElement("span");
        dot.className = "pagination-dot";
        row.appendChild(dot);
      }
    }

    fragment.appendChild(row);
    this.progressMarkers.replaceChildren(fragment);
  }

  setHover(value) {
    this.isHovered = value;
    this.columnEl.classList.toggle("is-hovered", value);
  }

  scheduleNext(now) {
    const holdMs = randomInRange(CONFIG.timing.holdDurationMs) * (this.isHovered ? CONFIG.hover.holdMultiplier : 1);
    this.nextChangeTime = now + holdMs;
  }

  startTransition(now) {
    if (this.transitioning) {
      return;
    }

    const currentStudent = this.currentState.student;
    const currentSetLength = this.program.students[currentStudent]?.images.length || 1;
    let nextStudent = currentStudent;
    let nextImage = this.currentState.image + 1;
    let studentChanged = false;

    if (nextImage >= currentSetLength) {
      nextStudent = (currentStudent + 1) % this.program.students.length;
      nextImage = 0;
      studentChanged = true;
    }

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

    await Promise.all(this.columns.map((column) => column.init()));
    this.bindEvents();
    this.onResize();
    this.startLoop();
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
