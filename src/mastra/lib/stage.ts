import type { Lesson, StyleGuide } from "../schemas";

export const STAGE_WIDTH = 1600;
export const STAGE_HEIGHT = 900;

const GSAP_URL = "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js";
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.186.1/+esm";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400..700&display=swap";

/** Sandboxed pages may only run inline code plus GSAP and three.js, and load Google Fonts. */
export const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data: blob:",
].join("; ");

/**
 * The scene helper kit. Its API is described to the animator agent in
 * `STAGE_KIT_DOCS`, so keep the two in sync.
 *
 * Every scene has two layers: `world`, which the camera moves over, and `hud`, which
 * stays put. Anything that is not a GSAP-animated DOM node (the camera, three.js)
 * is applied in render hooks that run after every seek, so scrubbing stays exact.
 */
const KIT_SOURCE = /* js */ `
const SVG_NS = "http://www.w3.org/2000/svg";
const renderHooks = [];
let uid = 0;

function makeKit(root, world, hud) {
  function el(tag, attrs = {}, parent = world) {
    const isSvg = tag === "svg" || parent.namespaceURI === SVG_NS;
    const node = isSvg
      ? document.createElementNS(SVG_NS, tag)
      : document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") node.textContent = value;
      else if (key === "style" && typeof value === "object") Object.assign(node.style, value);
      else node.setAttribute(key, value);
    }
    parent.appendChild(node);
    return node;
  }

  function defs(svg) {
    return svg.querySelector("defs") || el("defs", {}, svg);
  }

  // The camera looks at (x, y) in world coordinates with a zoom and a tilt.
  const cam = { x: ${STAGE_WIDTH / 2}, y: ${STAGE_HEIGHT / 2}, zoom: 1, rotate: 0 };
  renderHooks.push(() => {
    const r = (cam.rotate * Math.PI) / 180;
    const cos = Math.cos(r), sin = Math.sin(r), z = cam.zoom;
    const tx = ${STAGE_WIDTH / 2} - z * (cam.x * cos - cam.y * sin);
    const ty = ${STAGE_HEIGHT / 2} - z * (cam.x * sin + cam.y * cos);
    world.style.transform = "translate(" + tx + "px," + ty + "px) rotate(" + cam.rotate + "deg) scale(" + z + ")";
  });

  function camera(tl, { x = cam.x, y = cam.y, zoom = cam.zoom, rotate = 0, at = 0, duration = 1.6, ease = "power2.inOut" } = {}) {
    return tl.to(cam, { x, y, zoom, rotate, duration, ease }, at);
  }
  camera.start = ({ x = cam.x, y = cam.y, zoom = 1, rotate = 0 } = {}) => Object.assign(cam, { x, y, zoom, rotate });

  return {
    world,
    hud,
    el,
    camera,
    svg(parent = world) {
      return el("svg", {
        viewBox: "0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}", width: "${STAGE_WIDTH}", height: "${STAGE_HEIGHT}",
        style: { position: "absolute", left: "0", top: "0", overflow: "visible" },
      }, parent);
    },
    text(parent, content, opts = {}) {
      const { x = 800, y = 450, size = 48, weight = 600, fill = THEME.ink, anchor = "middle", font = "body" } = opts;
      return el("text", {
        x, y, fill, "font-size": size, "font-weight": weight, "text-anchor": anchor,
        "dominant-baseline": "middle",
        "font-family": font === "display" ? "Bricolage Grotesque, sans-serif" : "Inter, sans-serif",
        text: content,
      }, parent);
    },
    html(markup, parent = world) {
      const node = el("div", { class: "k-html" }, parent);
      node.innerHTML = markup;
      return node;
    },
    words(content, { className = "k-title", parent = hud, x = 800, y = 450, width = 1200, align = "center" } = {}) {
      const node = el("div", { class: "k-html " + className }, parent);
      Object.assign(node.style, {
        left: x - (align === "center" ? width / 2 : 0) + "px", top: y + "px", width: width + "px",
        textAlign: align, transform: "translateY(-50%)",
      });
      node.words = content.split(/\\s+/).filter(Boolean).map((word) => {
        const span = el("span", { class: "k-word", text: word }, node);
        node.appendChild(document.createTextNode(" "));
        return span;
      });
      return node;
    },
    draw(tl, path, { at = 0, duration = 1, ease = "power2.inOut" } = {}) {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      return tl.fromTo(path, { strokeDashoffset: length }, { strokeDashoffset: 0, duration, ease }, at);
    },
    gradient(svg, colors, { angle = 90, radial = false } = {}) {
      const id = "k-grad-" + uid++;
      const a = ((angle - 90) * Math.PI) / 180;
      const grad = radial
        ? el("radialGradient", { id, cx: "50%", cy: "50%", r: "50%" }, defs(svg))
        : el("linearGradient", {
            id, x1: 0.5 - Math.cos(a) / 2, y1: 0.5 - Math.sin(a) / 2, x2: 0.5 + Math.cos(a) / 2, y2: 0.5 + Math.sin(a) / 2,
          }, defs(svg));
      colors.forEach((color, i) => {
        el("stop", { offset: colors.length === 1 ? 0 : i / (colors.length - 1), "stop-color": color }, grad);
      });
      return "url(#" + id + ")";
    },
    glow(svg, { color = THEME.accent, blur = 14 } = {}) {
      const id = "k-glow-" + uid++;
      const filter = el("filter", { id, x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs(svg));
      el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: blur, result: "blur" }, filter);
      el("feFlood", { "flood-color": color, result: "color" }, filter);
      el("feComposite", { in: "color", in2: "blur", operator: "in", result: "glow" }, filter);
      const merge = el("feMerge", {}, filter);
      el("feMergeNode", { in: "glow" }, merge);
      el("feMergeNode", { in: "SourceGraphic" }, merge);
      return "url(#" + id + ")";
    },
    float(tl, target, { x = 0, y = 14, rotate = 0, period = 3, from = 0, to = DURATION - 0.3 } = {}) {
      const half = period / 2;
      const repeat = Math.max(0, Math.floor((to - from) / half) - 1);
      const vars = { x: "+=" + x, y: "+=" + y, duration: half, ease: "sine.inOut", yoyo: true, repeat };
      if (rotate) vars.rotation = "+=" + rotate;
      return tl.to(target, vars, from);
    },
    three({ fov = 40, z = 10 } = {}) {
      if (!THREE) throw new Error("three.js did not load");
      const canvas = document.createElement("canvas");
      canvas.className = "k-three";
      root.insertBefore(canvas, world);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(${STAGE_WIDTH}, ${STAGE_HEIGHT}, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;

      const scene = new THREE.Scene();
      const camera3d = new THREE.PerspectiveCamera(fov, ${STAGE_WIDTH / STAGE_HEIGHT}, 0.1, 1000);
      camera3d.position.set(0, 0, z);
      const target = new THREE.Vector3();

      // A soft key/fill/rim setup so plain materials look good straight away.
      scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(THEME.background), 1.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(5, 8, 6);
      const rim = new THREE.DirectionalLight(new THREE.Color(THEME.primary), 1.4);
      rim.position.set(-6, 2, -5);
      scene.add(key, rim);

      renderHooks.push(() => {
        if (getComputedStyle(root).visibility === "hidden") return;
        camera3d.lookAt(target);
        renderer.render(scene, camera3d);
      });
      return { THREE, scene, camera: camera3d, target, renderer, canvas };
    },
  };
}
`;

export const STAGE_KIT_DOCS = `
Your code runs as the BODY of \`function (ctx) { ... }\`. Start with:
  const { root, tl, cues, duration, theme, kit, gsap } = ctx;

- tl: a paused GSAP timeline for this scene. Time 0 = scene start. ALL animation goes on tl with an explicit
  absolute position, e.g. tl.from(node, { opacity: 0, y: 30, duration: 0.6 }, cues["big-idea"] ?? 2).
- cues: { [cueName]: seconds } – when the narrator reaches each [[cue]] marker. Use them for key beats.
- duration: scene length in seconds (the narration length). Nothing may start after duration - 0.3.
- theme: { background, surface, ink, muted, primary, secondary, accent } hex colors. Build every palette
  from these (tints, shades and gradients between them are fine).
- gsap: the GSAP library (core only, no plugins).

Layers (the frame is ${STAGE_WIDTH}x${STAGE_HEIGHT}):
- kit.world: the 2D world the camera moves over. It may be much larger than the frame: draw at any
  coordinates (negative or beyond ${STAGE_WIDTH}x${STAGE_HEIGHT}) and fly the camera there. Default parent for kit.svg/el/html.
- kit.hud: a layer above the world that the camera does not move. Use it for kinetic words. Default for kit.words.
- A three.js canvas (kit.three) sits behind the world, so 2D drawn in the world or HUD overlays the 3D.

Camera (2D world):
- kit.camera.start({ x, y, zoom = 1, rotate = 0 }) -> the opening framing. (x, y) is the world point at the
  centre of the frame. Default { x: ${STAGE_WIDTH / 2}, y: ${STAGE_HEIGHT / 2}, zoom: 1 } shows exactly 0..${STAGE_WIDTH} x 0..${STAGE_HEIGHT}.
- kit.camera(tl, { x, y, zoom, rotate, at, duration = 1.6, ease = "power2.inOut" }) -> move the camera.
  Zoom 3 into a detail to "go inside", zoom 0.4 to pull back and reveal the bigger picture, pan to follow.
  Omitted values keep the previous ones. Moves are sequential: keep them in time order.

Drawing:
- kit.svg(parent = kit.world) -> an <svg> with viewBox "0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}" and overflow visible.
- kit.el(tag, attrs, parent = kit.world) -> creates an element (SVG namespace automatically when parent is SVG).
  Special attrs: text (textContent), style (object).
- kit.text(svg, content, { x, y, size = 48, weight = 600, fill = theme.ink, anchor = "middle", font = "body" | "display" }).
- kit.html(markup, parent = kit.world) -> a <div class="k-html"> (absolute) with innerHTML.
- kit.gradient(svg, [color, color, ...], { angle = 90, radial = false }) -> "url(#id)" for fill or stroke.
- kit.glow(svg, { color = theme.accent, blur = 14 }) -> "url(#id)" for the filter attribute: a soft halo.
- CSS classes: .k-title (display font, 88px, bold), .k-body (36px), .k-chip (pill label), .k-word (one word of kit.words).

Motion:
- kit.draw(tl, pathOrShape, { at, duration, ease }) -> a stroke being drawn.
- kit.words(text, { className = "k-title", parent = kit.hud, x = 800, y = 450, width = 1200, align = "center" })
  -> a text block whose .words array holds one <span> per word, for kinetic type:
  tl.from(block.words, { y: 60, opacity: 0, duration: 0.5, stagger: 0.08, ease: "back.out(2)" }, at).
- kit.float(tl, target, { x = 0, y = 14, rotate = 0, period = 3, from = 0, to = duration - 0.3 }) -> gentle
  bobbing for the whole scene so objects feel alive. Works on DOM/SVG nodes and three.js vectors.

3D:
- kit.three({ fov = 40, z = 10 }) -> { THREE, scene, camera, target, renderer, canvas }. Lights are already set
  up (soft key, fill and a rim light in theme.primary). The camera looks at \`target\` (a THREE.Vector3) every frame.
  Animate plain properties on tl: tl.to(mesh.rotation, { y: Math.PI * 2, duration: 6, ease: "none" }, 0),
  tl.to(camera.position, { z: 4, duration: 2 }, cues["inside"] ?? 3), tl.to(target, { x: 2 }, 5),
  tl.to(mesh.material, { opacity: 1 }, 1), tl.from(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.8, ease: "back.out(2)" }, 0.5).
  Colours: new THREE.Color(theme.primary). Prefer MeshStandardMaterial / MeshPhysicalMaterial (roughness,
  metalness, transmission for glass and water), set transparent: true before animating opacity.
  Use built-in geometries (Sphere, Box, Torus, Cylinder, Cone, Icosahedron, Capsule, Tube along a curve, Points
  for particle clouds), groups for compound objects. At most one kit.three() per scene. No textures, no loaders.
`;

function themeCss(theme: StyleGuide) {
  return Object.entries(theme)
    .filter(([key]) => key !== "motif")
    .map(([key, value]) => `--${key}: ${value};`)
    .join(" ");
}

/** JSON inside an inline <script> must not be able to close the tag. */
function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function renderStageHtml(lesson: Lesson, sceneCode: Record<string, string>) {
  const scripts = lesson.video.scenes
    .map((scene) => {
      const code = (sceneCode[scene.id] ?? "").replace(/<\/script/gi, "<\\/script");
      // One <script> per scene: a syntax error only breaks that scene.
      return `<script>window.__scene(${safeJson(scene.id)}, function (ctx) {\n${code}\n});</script>`;
    })
    .join("\n");
  // three.js is large, so it is only loaded when a scene asks for it.
  const needsThree = Object.values(sceneCode).some((code) => code.includes("kit.three"));

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}" />
<link rel="stylesheet" href="${FONTS_URL}" />
<style>
  :root { ${themeCss(lesson.styleGuide)} }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--background); }
  #stage { position: absolute; left: 50%; top: 50%; width: ${STAGE_WIDTH}px; height: ${STAGE_HEIGHT}px;
    font-family: Inter, sans-serif; color: var(--ink); background: var(--background); overflow: hidden; }
  .scene { position: absolute; inset: 0; overflow: hidden; visibility: hidden; opacity: 0; }
  .world { position: absolute; left: 0; top: 0; width: ${STAGE_WIDTH}px; height: ${STAGE_HEIGHT}px; transform-origin: 0 0; }
  .hud { position: absolute; inset: 0; pointer-events: none; }
  .k-three { position: absolute; inset: 0; width: 100%; height: 100%; }
  .k-html { position: absolute; }
  .k-title { font-family: "Bricolage Grotesque", sans-serif; font-size: 88px; font-weight: 700; line-height: 1.05; letter-spacing: -0.02em; }
  .k-body { font-size: 36px; line-height: 1.35; color: var(--ink); }
  .k-chip { display: inline-block; padding: 10px 22px; border-radius: 999px; background: var(--surface);
    color: var(--ink); font-size: 28px; font-weight: 600; }
  .k-word { display: inline-block; }
</style>
<script src="${GSAP_URL}"></script>
<script>
  const registry = {};
  window.__scene = (id, build) => { registry[id] = build; };
</script>
</head>
<body>
<div id="stage"></div>
${scripts}
<script type="module">
const THEME = ${safeJson(lesson.styleGuide)};
const SCENES = ${safeJson(lesson.video.scenes)};
const THREE = ${needsThree ? `await import("${THREE_URL}").catch(() => null)` : "null"};
let DURATION = 0;

${KIT_SOURCE}

const stage = document.getElementById("stage");

function fit() {
  const scale = Math.min(innerWidth / ${STAGE_WIDTH}, innerHeight / ${STAGE_HEIGHT});
  stage.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
}
addEventListener("resize", fit);
fit();

function fallback(world, tl, scene) {
  const block = makeKit(world, world, world).html(
    '<div class="k-title"></div><div class="k-body" style="margin-top:24px;color:var(--muted)"></div>'
  );
  Object.assign(block.style, { left: "120px", right: "120px", top: "320px" });
  block.children[0].textContent = scene.title;
  block.children[1].textContent = scene.goal;
  tl.from(block.children, { opacity: 0, y: 24, duration: 0.6, stagger: 0.2 }, 0.2);
}

const master = gsap.timeline({ paused: true });

/** How the next scene takes over from the previous one, centred on the cut. */
function transition(type, prev, next, at) {
  const d = { "zoom-through": 1, push: 0.9, whip: 0.5, fade: 0.7 }[type] ?? 0.7;
  const t = Math.max(0, at - d / 2);
  if (type === "zoom-through") {
    master.to(prev, { scale: 2.6, autoAlpha: 0, duration: d, ease: "power3.in" }, t);
    master.fromTo(next, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: d, ease: "power3.out", immediateRender: false }, t + d * 0.25);
  } else if (type === "push" || type === "whip") {
    const ease = type === "whip" ? "expo.inOut" : "power3.inOut";
    master.to(prev, { xPercent: -100, duration: d, ease }, t);
    master.fromTo(next, { autoAlpha: 1, xPercent: 100 }, { autoAlpha: 1, xPercent: 0, duration: d, ease, immediateRender: false }, t);
  } else {
    master.to(prev, { autoAlpha: 0, duration: d, ease: "sine.inOut" }, t);
    master.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: d, ease: "sine.inOut", immediateRender: false }, t);
  }
  master.set(prev, { autoAlpha: 0 }, t + d);
}

let previous = null;
for (const scene of SCENES) {
  const root = document.createElement("div");
  root.className = "scene";
  const world = document.createElement("div");
  world.className = "world";
  const hud = document.createElement("div");
  hud.className = "hud";
  root.append(world, hud);
  stage.appendChild(root);

  DURATION = scene.duration;
  const tl = gsap.timeline();
  const hooks = renderHooks.length;
  try {
    if (!registry[scene.id]) throw new Error("Scene script failed to load");
    registry[scene.id]({ root, tl, cues: scene.cues, duration: scene.duration, theme: THEME, kit: makeKit(root, world, hud), gsap });
  } catch (error) {
    console.error("[" + scene.id + "]", error);
    tl.clear();
    renderHooks.length = hooks;
    root.querySelectorAll(".k-three").forEach((canvas) => canvas.remove());
    world.replaceChildren();
    hud.replaceChildren();
    world.style.transform = "";
    fallback(world, tl, scene);
  }

  master.add(tl, scene.start);
  if (previous) transition(scene.transition, previous, root, scene.start);
  else master.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, immediateRender: false }, 0);
  previous = root;
}

function render() {
  for (const hook of renderHooks) hook();
}

// The parent page owns the clock (the narration audio) and tells us where to be.
addEventListener("message", (event) => {
  if (event.data?.type !== "seek") return;
  master.time(event.data.time);
  render();
});
master.time(0);
render();
parent.postMessage({ type: "stage-ready" }, "*");
</script>
</body>
</html>`;
}

export function renderPlaygroundHtml(lesson: Lesson, markup: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${FONTS_URL}" />
<style>
  :root { ${themeCss(lesson.styleGuide)} }
  html, body { margin: 0; min-height: 100%; background: var(--background); color: var(--ink); font-family: Inter, sans-serif; }
</style>
</head>
<body>
${markup}
</body>
</html>`;
}
