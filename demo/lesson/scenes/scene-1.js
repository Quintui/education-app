const { tl, cues, duration, theme, kit } = ctx;
const svg = kit.svg();

// A quiet starfield.
const stars = [];
for (let i = 0; i < 70; i++) {
  const x = 100 + ((i * 397) % 1400);
  const y = 80 + ((i * 251) % 740);
  stars.push(kit.el("circle", { cx: x, cy: y, r: 2 + (i % 3), fill: theme.ink, opacity: 0.55 }, svg));
}
tl.from(stars, { opacity: 0, duration: 0.8, stagger: 0.01 }, 0);

const title = kit.text(svg, "Light travels in straight lines…", { y: 120, size: 60, font: "display", weight: 700 });
tl.from(title, { opacity: 0, y: 16, duration: 0.6, ease: "power3.out" }, 0.2);

// The eclipsed sun.
const sun = kit.el("circle", { cx: 800, cy: 470, r: 110, fill: theme.background, stroke: theme.accent, "stroke-width": 10 }, svg);
tl.from(sun, { scale: 0, transformOrigin: "50% 50%", duration: 0.9, ease: "back.out(1.6)" }, 0.9);

// Stars near the sun appear shifted outward.
const shiftAt = cues["stars-shift"] ?? duration * 0.6;
[[640, 330], [960, 340], [610, 600], [990, 610]].forEach(([x, y], i) => {
  const ghost = kit.el("circle", { cx: x, cy: y, r: 9, fill: "none", stroke: theme.muted, "stroke-width": 3 }, svg);
  const star = kit.el("circle", { cx: x, cy: y, r: 9, fill: theme.primary }, svg);
  const dx = (x - 800) * 0.18;
  const dy = (y - 470) * 0.18;
  tl.from([ghost, star], { opacity: 0, duration: 0.4 }, shiftAt - 0.6 + i * 0.05);
  tl.to(star, { x: dx, y: dy, duration: 1, ease: "power2.inOut" }, shiftAt + i * 0.08);
});
const label = kit.text(svg, "…so why did the stars move?", { y: 800, size: 44, fill: theme.primary });
tl.from(label, { opacity: 0, y: 16, duration: 0.5 }, shiftAt + 0.9);
