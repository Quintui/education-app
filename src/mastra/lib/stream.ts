/**
 * Streams partial structured output to the UI without flooding it: at most one
 * update per `intervalMs`, and always the final value.
 */
export async function forEachThrottled<T>(
  stream: AsyncIterable<T>,
  intervalMs: number,
  onUpdate: (value: T) => Promise<void>,
) {
  let lastSent = 0;
  let latest: { value: T } | null = null;

  for await (const value of stream) {
    latest = { value };
    if (Date.now() - lastSent >= intervalMs) {
      lastSent = Date.now();
      latest = null;
      await onUpdate(value);
    }
  }
  if (latest) await onUpdate(latest.value);
}
