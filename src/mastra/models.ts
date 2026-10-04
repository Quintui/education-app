import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const models = {
  /** Planning and scene animation: this is where quality shows. */
  smart: openrouter(
    process.env.OPENROUTER_SMART_MODEL ?? "anthropic/claude-opus-5.5",
  ),
  /** Notes, quiz and playground: good and cheaper. */
  fast: openrouter(
    process.env.OPENROUTER_FAST_MODEL ?? "anthropic/claude-sonnet-5.5",
  ),
};
