import { handleWorkflowStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { demoCourseStream, demoDiagnosticStream } from "@/demo/streams";
import { isDemoMode, setupRequiredResponse } from "@/lib/env";
import { mastra } from "@/mastra";
import { diagnosticAnswersSchema } from "@/mastra/schemas";

export const maxDuration = 300;

/**
 * One conversation, two workflows:
 * a topic → knowledge check, then the learner's answers → their course.
 */
export async function POST(req: Request) {
  const setup = setupRequiredResponse();
  if (setup) return setup;

  const { messages } = (await req.json()) as { messages: UIMessage[] };
  const last = messages.findLast((message) => message.role === "user");
  const answersPart = last?.parts.find((part) => part.type === "data-answers");

  if (answersPart && "data" in answersPart) {
    const answers = diagnosticAnswersSchema.parse(answersPart.data);
    if (isDemoMode()) return createUIMessageStreamResponse({ stream: demoCourseStream(answers) });

    const stream = await handleWorkflowStream({
      mastra,
      workflowId: "courseWorkflow",
      version: "v7",
      params: { inputData: answers },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const topic = last?.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
  if (!topic) return new Response("Tell me what you want to learn.", { status: 400 });

  if (isDemoMode()) return createUIMessageStreamResponse({ stream: demoDiagnosticStream(topic) });

  const stream = await handleWorkflowStream({
    mastra,
    workflowId: "diagnoseWorkflow",
    version: "v7",
    params: { inputData: { topic } },
  });
  return createUIMessageStreamResponse({ stream });
}
