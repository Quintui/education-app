const CUE_PATTERN = /\[\[([a-z0-9-]+)\]\]/gi;
/** Single-bracket ElevenLabs audio tags like [curious]; cue markers use double brackets. */
const AUDIO_TAG_PATTERN = /\[[^[\]]+\]\s*/g;

/** Narration as plain text: no cue markers, no audio tags. For anything but the voice. */
export function plainNarration(narration: string) {
  return parseNarration(narration).text.replace(AUDIO_TAG_PATTERN, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Strips `[[cue]]` markers from narration and remembers the character offset of
 * each one, so audio timestamps can turn them into seconds. Audio tags stay in:
 * the voice needs them, and ElevenLabs' alignment includes their characters.
 */
export function parseNarration(raw: string) {
  const narration = raw.trim();
  let text = "";
  let last = 0;
  const markers: { name: string; offset: number }[] = [];

  for (const match of narration.matchAll(CUE_PATTERN)) {
    text += narration.slice(last, match.index);
    markers.push({ name: match[1].toLowerCase(), offset: text.length });
    last = match.index + match[0].length;
    if (text.endsWith(" ") && narration[last] === " ") last += 1;
  }
  text += narration.slice(last);

  return { text: text.trimEnd(), markers };
}

export function resolveCues(
  markers: { name: string; offset: number }[],
  charStartTimes: number[],
) {
  const cues: Record<string, number> = {};
  for (const { name, offset } of markers) {
    const index = Math.min(offset, charStartTimes.length - 1);
    cues[name] = Math.round((charStartTimes[index] ?? 0) * 100) / 100;
  }
  return cues;
}

/** Pulls the first fenced code block out of a model response. */
export function extractCode(response: string, language: string) {
  const fence = new RegExp("```(?:" + language + ")?\\s*\\n([\\s\\S]*?)```", "i");
  return (response.match(fence)?.[1] ?? response).trim();
}
