const { tl, cues, duration, theme, kit } = ctx;
const svg = kit.svg();

const glow = kit.el("circle", { cx: 800, cy: 450, r: 190, fill: "none", stroke: theme.secondary, "stroke-width": 6, opacity: 0.8 }, svg);
const core = kit.el("circle", { cx: 800, cy: 450, r: 130, fill: theme.background, stroke: theme.surface, "stroke-width": 4 }, svg);
tl.from([core, glow], { scale: 0, transformOrigin: "50% 50%", duration: 1, ease: "power3.out", stagger: 0.15 }, 0.2);

// Rays that come too close spiral in and never come back out.
const horizonAt = cues["horizon"] ?? duration * 0.5;
for (let i = 0; i < 6; i++) {
  const y = 160 + i * 115;
  const ray = kit.el("path", { d: `M 120 ${y} C 500 ${y}, 650 ${450 + (y - 450) * 0.3}, 800 450`, stroke: theme.primary, "stroke-width": 5, "stroke-linecap": "round", fill: "none", opacity: 0.9 }, svg);
  kit.draw(tl, ray, { at: horizonAt + i * 0.12, duration: 1.1, ease: "power2.in" });
}
tl.to(glow, { attr: { r: 210 }, opacity: 1, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, horizonAt + 0.8);

const caption = kit.text(svg, "where light can't climb out", { y: 800, size: 48, font: "display", fill: theme.secondary });
tl.from(caption, { opacity: 0, y: 16, duration: 0.6 }, horizonAt + 1.2);
