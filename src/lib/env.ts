/**
 * Demo mode replays recorded-style streams instead of calling the APIs. It is
 * opt-in, so a missing key never silently turns into fake answers.
 */
export const isDemoMode = () => process.env.LUMEN_DEMO === "1";

const REQUIRED_KEYS = ["OPENAI_API_KEY", "ELEVENLABS_API_KEY"] as const;

/** API keys the app still needs, empty when everything is set up (or in demo mode). */
export function missingKeys() {
  if (isDemoMode()) return [];
  return REQUIRED_KEYS.filter((key) => !process.env[key]);
}

/** A clear error for routes that cannot work without keys. */
export function setupRequiredResponse() {
  const missing = missingKeys();
  if (missing.length === 0) return null;
  return new Response(
    `Add ${missing.join(" and ")} to .env.local and restart the dev server (or set LUMEN_DEMO=1 to try the demo).`,
    { status: 503 },
  );
}
