"use client";

import { CircleXIcon } from "lucide-react";
import { makeAssistantDataUI, type DataMessagePartProps } from "@assistant-ui/react";
import type { WorkflowDataPart } from "@mastra/ai-sdk";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CourseDraft } from "./course-draft";
import { KnowledgeCheck } from "./knowledge-check";

// Renderers for the data parts the course workflows stream (see course-workflows.ts).

function WorkflowStatus({ data }: DataMessagePartProps<WorkflowDataPart["data"]>) {
  // Progress is shown by the knowledge check and course cards; only surface failures here.
  if (data.status !== "failed") return null;
  return (
    <Alert variant="destructive">
      <CircleXIcon />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>Try again, or rephrase the topic.</AlertDescription>
    </Alert>
  );
}

const WorkflowUI = makeAssistantDataUI({ name: "workflow", render: WorkflowStatus });
const DiagnosticUI = makeAssistantDataUI({ name: "diagnostic", render: KnowledgeCheck });
const CourseUI = makeAssistantDataUI({ name: "course", render: CourseDraft });
/** The learner's structured answers travel with their message; the text says it all. */
const AnswersUI = makeAssistantDataUI({ name: "answers", render: () => null });

export function CourseDataRenderers() {
  return (
    <>
      <WorkflowUI />
      <DiagnosticUI />
      <CourseUI />
      <AnswersUI />
    </>
  );
}
