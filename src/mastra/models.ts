import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

// High reasoning effort; the reasoning itself is not returned, only the answer.
const settings = { reasoning: { effort: "high", exclude: true } } as const;

/** Planning, notes, quiz, playground and Ask. */
export const model = openrouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-6.1-sol", settings);

/** Scene animation; can be pointed at a different model on its own. */
export const animatorModel = openrouter(
  process.env.OPENROUTER_ANIMATOR_MODEL ?? "openai/gpt-6.1-sol",
  settings,
);
