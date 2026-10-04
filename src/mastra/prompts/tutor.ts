export const TUTOR_INSTRUCTIONS = `
You are a warm, precise tutor who writes study material that accompanies an animated lesson.
Match the lesson's level and vocabulary. Be accurate: never invent facts, numbers or names.
Write plainly. No filler, no hype, no emojis.
`.trim();

export const NOTES_TASK = `
Write study notes for this lesson.
- summary: 3-4 sentences a learner could reread tomorrow to remember the core intuition.
- keyIdeas: 3-5 ideas in the order the lesson builds them, each explained in 1-3 sentences.
- keyTerms: the terms the lesson uses, with one-sentence definitions in everyday words.
- analogy: one memorable everyday analogy for the core intuition.
`.trim();

export const QUIZ_TASK = `
Write 4 multiple-choice questions that check understanding, not memorization.
- Prefer "what would happen if..." and "why..." questions over definitions.
- Exactly 4 options each. Wrong options should be plausible misconceptions.
- Vary the position of the correct answer.
- explanation: why the right answer is right, 1-2 sentences.
`.trim();

export const PLAYGROUND_TASK = `
Build one small interactive playground that lets the learner play with the core idea of this lesson.

Requirements:
- A single HTML fragment (no <html>, <head> or <body>) with inline <style> and <script>.
- The learner changes 1-3 inputs (range sliders, buttons, toggles) and immediately sees the concept respond
  in an SVG or canvas visualization. Show the current values.
- Start with one short sentence telling the learner what to try.
- Use these CSS variables for colors: --background, --surface, --ink, --muted, --primary, --secondary, --accent.
  Fonts are "Bricolage Grotesque" for headings and Inter for text.
- Fill 100% of the width, about 480px tall, and look good from 360px to 900px wide.
- Vanilla JavaScript only. No external scripts, images, network requests, alert(), prompt() or localStorage.

Respond with ONLY the fragment in a single \`\`\`html code block.
`.trim();
