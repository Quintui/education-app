import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

/**
 * One model for every agent: planning, animation, notes, quiz, playground and Ask.
 * Medium reasoning effort; the reasoning itself is not returned, only the answer.
 */
export const model = openrouter(process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-5.5", {
  reasoning: { effort: "medium", exclude: true },
});
