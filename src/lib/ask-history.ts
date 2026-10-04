import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import type { UIMessage } from "ai";
import { mastra } from "@/mastra";
import { ASK_RESOURCE_ID, askThreadId } from "@/mastra/agents/ask-tutor";

/** Questions asked earlier in this lesson, from the Ask tutor's Mastra memory. */
export async function getAskHistory(lessonId: string): Promise<UIMessage[]> {
  try {
    const memory = await mastra.getAgentById("ask-tutor").getMemory();
    const result = await memory?.recall({ threadId: askThreadId(lessonId), resourceId: ASK_RESOURCE_ID });
    return result ? (toAISdkMessages(result.messages, { version: "v7" }) as UIMessage[]) : [];
  } catch {
    // No thread yet: nothing asked in this lesson.
    return [];
  }
}
