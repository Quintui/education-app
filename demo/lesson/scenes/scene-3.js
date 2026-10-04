const { tl, cues, duration, theme, kit } = ctx;
const svg = kit.svg();

const sun = kit.el("circle", { cx: 800, cy: 470, r: 90, fill: theme.accent }, svg);
tl.from(sun, { scale: 0, transformOrigin: "50% 50%", duration: 0.7, ease: "back.out(1.6)" }, 0.1);

// The straight line light "should" take.
const straight = kit.el("path", { d: "M 150 300 L 1450 300", stroke: theme.muted, "stroke-width": 4, "stroke-dasharray": "14 14", fill: "none" }, svg);
tl.from(straight, { opacity: 0, duration: 0.6 }, 0.6);

// The path it actually follows on curved space.
const curveAt = cues["ray-curves"] ?? duration * 0.4;
const ray = kit.el("path", { d: "M 150 300 C 650 300, 700 380, 800 360 S 1150 330, 1450 420", stroke: theme.primary, "stroke-width": 8, "stroke-linecap": "round", fill: "none" }, svg);
kit.draw(tl, ray, { at: curveAt, duration: 1.6 });

const photon = kit.el("circle", { cx: 1450, cy: 420, r: 14, fill: theme.primary }, svg);
tl.from(photon, { opacity: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.4 }, curveAt + 1.5);

const caption = kit.text(svg, "the straightest path on curved space", { y: 780, size: 44, fill: theme.ink });
tl.from(caption, { opacity: 0, y: 16, duration: 0.5 }, curveAt + 1.8);
