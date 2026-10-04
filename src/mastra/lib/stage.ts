import type { Lesson, StyleGuide } from "../schemas";

export const STAGE_WIDTH = 1600;
export const STAGE_HEIGHT = 900;

const GSAP_URL = "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400..700&display=swap";

/** Sandboxed pages may only run inline code plus GSAP, and load Google Fonts. */
export const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data:",
].join("; ");

/**
 * The scene helper kit. Its API is described to the animator agent in
 * `STAGE_KIT_DOCS`, so keep the two in sync.
 */
const KIT_SOURCE = /* js */ `
const SVG_NS = "http://www.w3.org/2000/svg";

function makeKit(root) {
  function el(tag, attrs = {}, parent = root) {
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

  return {
    el,
    svg(parent = root) {
      return el("svg", { viewBox: "0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}", width: "100%", height: "100%", style: { position: "absolute", inset: "0" } }, parent);
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
    html(markup, parent = root) {
      const node = el("div", { class: "k-html" }, parent);
      node.innerHTML = markup;
      return node;
    },
    draw(tl, path, { at = 0, duration = 1, ease = "power2.inOut" } = {}) {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      return tl.fromTo(path, { strokeDashoffset: length }, { strokeDashoffset: 0, duration, ease }, at);
    },
  };
}
`;

export const STAGE_KIT_DOCS = `
Your code runs as the BODY of \`function (ctx) { ... }\`. Start with:
  const { root, tl, cues, duration, theme, kit, gsap } = ctx;

- root: an absolutely positioned ${STAGE_WIDTH}x${STAGE_HEIGHT} <div> for this scene (scaled to fit the player).
- tl: a paused GSAP timeline for this scene. Time 0 = scene start. ALL animation goes on tl with an explicit
  absolute position, e.g. tl.from(node, { opacity: 0, y: 30, duration: 0.6 }, cues["big-idea"] ?? 2).
- cues: { [cueName]: seconds } – when the narrator reaches each [[cue]] marker. Use them for key beats.
- duration: scene length in seconds (the narration length). Nothing may start after duration - 0.3.
- theme: { background, surface, ink, muted, primary, secondary, accent } hex colors. Use them, never other colors.
- gsap: the GSAP library (core only, no plugins).
- kit helpers:
  - kit.svg(parent = root) -> full-stage <svg> with viewBox "0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}".
  - kit.el(tag, attrs, parent = root) -> creates an element (SVG namespace automatically when parent is SVG).
    Special attrs: text (textContent), style (object).
  - kit.text(svg, content, { x, y, size = 48, weight = 600, fill = theme.ink, anchor = "middle", font = "body" | "display" }) -> SVG <text>.
  - kit.html(markup, parent = root) -> a <div class="k-html"> with innerHTML, for rich text blocks.
  - kit.draw(tl, pathOrShape, { at, duration, ease }) -> animates a stroke being drawn.
- CSS classes available for HTML: .k-title (display font, 72px), .k-body (36px), .k-chip (pill label).
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

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="${FONTS_URL}" />
<style>
  :root { ${themeCss(lesson.styleGuide)} }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--background); }
  #stage { position: absolute; left: 50%; top: 50%; width: ${STAGE_WIDTH}px; height: ${STAGE_HEIGHT}px;
    font-family: Inter, sans-serif; color: var(--ink); background: var(--background); overflow: hidden; }
  .scene { position: absolute; inset: 0; visibility: hidden; opacity: 0; }
  .k-html { position: absolute; }
  .k-title { font-family: "Bricolage Grotesque", sans-serif; font-size: 72px; font-weight: 700; line-height: 1.05; letter-spacing: -0.02em; }
  .k-body { font-size: 36px; line-height: 1.35; color: var(--ink); }
  .k-chip { display: inline-block; padding: 10px 22px; border-radius: 999px; background: var(--surface);
    color: var(--ink); font-size: 28px; font-weight: 600; }
</style>
<script src="${GSAP_URL}"></script>
<script>
  const THEME = ${safeJson(lesson.styleGuide)};
  const SCENES = ${safeJson(lesson.video.scenes)};
  const registry = {};
  window.__scene = (id, build) => { registry[id] = build; };
</script>
</head>
<body>
<div id="stage"></div>
${scripts}
<script>
${KIT_SOURCE}

const stage = document.getElementById("stage");

function fit() {
  const scale = Math.min(innerWidth / ${STAGE_WIDTH}, innerHeight / ${STAGE_HEIGHT});
  stage.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
}
addEventListener("resize", fit);
fit();

function fallback(root, tl, scene) {
  root.innerHTML = "";
  const block = makeKit(root).html(
    '<div class="k-title"></div><div class="k-body" style="margin-top:24px;color:var(--muted)"></div>'
  );
  Object.assign(block.style, { left: "120px", right: "120px", top: "320px" });
  block.children[0].textContent = scene.title;
  block.children[1].textContent = scene.goal;
  tl.from(block.children, { opacity: 0, y: 24, duration: 0.6, stagger: 0.2 }, 0.2);
}

const master = gsap.timeline({ paused: true });
const last = SCENES.length - 1;

SCENES.forEach((scene, index) => {
  const root = document.createElement("div");
  root.className = "scene";
  stage.appendChild(root);

  const tl = gsap.timeline();
  try {
    if (!registry[scene.id]) throw new Error("Scene script failed to load");
    registry[scene.id]({ root, tl, cues: scene.cues, duration: scene.duration, theme: THEME, kit: makeKit(root), gsap });
  } catch (error) {
    console.error("[" + scene.id + "]", error);
    tl.clear();
    fallback(root, tl, scene);
  }

  master.add(tl, scene.start);
  master.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, scene.start);
  if (index < last) master.to(root, { autoAlpha: 0, duration: 0.4 }, scene.start + scene.duration - 0.2);
});

// The parent page owns the clock (the narration audio) and tells us where to be.
addEventListener("message", (event) => {
  if (event.data?.type === "seek") master.time(event.data.time);
});
master.time(0);
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
