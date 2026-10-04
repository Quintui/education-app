import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { models } from "../models";
import { ASK_TUTOR_INSTRUCTIONS } from "../prompts/tutor";
import { leafSuggestionSchema } from "../schemas";

/**
 * Suggests a new leaf lesson. It has no side effects: the UI shows the suggestion
 * and the learner decides whether to grow it into their course tree.
 */
export const suggestLeafLesson = createTool({
  id: "suggestLeafLesson",
  description: "Suggest turning the learner's question into its own short lesson in their course tree",
  inputSchema: leafSuggestionSchema,
  outputSchema: leafSuggestionSchema,
  execute: async (suggestion) => suggestion,
});

export const askTutor = new Agent({
  id: "ask-tutor",
  name: "Ask Tutor",
  instructions: ASK_TUTOR_INSTRUCTIONS,
  model: models.fast,
  tools: { suggestLeafLesson },
});
