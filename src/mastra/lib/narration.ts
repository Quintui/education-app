const CUE_PATTERN = /\[\[([a-z0-9-]+)\]\]/gi;

/**
 * Strips `[[cue]]` markers from narration and remembers the character
 * offset of each one, so audio timestamps can turn them into seconds.
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
