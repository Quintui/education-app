const { tl, cues, duration, theme, kit } = ctx;
const svg = kit.svg();

// A flat grid of space.
const lines = [];
for (let i = 0; i <= 10; i++) {
  const y = 180 + i * 60;
  lines.push({ el: kit.el("path", { d: `M 200 ${y} L 1400 ${y}`, stroke: theme.muted, "stroke-width": 2, fill: "none", opacity: 0.7 }, svg), y });
}
lines.forEach((line, i) => kit.draw(tl, line.el, { at: 0.1 + i * 0.05, duration: 0.8 }));

const label = kit.text(svg, "space", { x: 1460, y: 480, size: 36, anchor: "start", fill: theme.muted });
tl.from(label, { opacity: 0, duration: 0.5 }, 0.8);

// A heavy mass drops in and the grid bends around it.
const bendAt = cues["grid-bends"] ?? duration * 0.35;
const mass = kit.el("circle", { cx: 800, cy: 480, r: 70, fill: theme.accent }, svg);
tl.from(mass, { y: -420, duration: 0.8, ease: "bounce.out" }, bendAt - 0.6);
lines.forEach(({ el, y }) => {
  const pull = Math.max(0, 140 - Math.abs(y - 480) * 0.45);
  tl.to(el, { attr: { d: `M 200 ${y} C 600 ${y}, 650 ${y + pull}, 800 ${y + pull} S 1000 ${y}, 1400 ${y}` }, duration: 1.2, ease: "power2.inOut" }, bendAt);
});

const caption = kit.text(svg, "mass curves space", { y: 840, size: 48, font: "display", fill: theme.accent });
tl.from(caption, { opacity: 0, y: 16, duration: 0.5 }, bendAt + 1);
