import { Mastra } from "@mastra/core";
import { coursePlanner, lessonPlanner, sceneAnimator, tutor } from "./agents";
import { askTutor } from "./agents/ask-tutor";
import { courseWorkflow, diagnoseWorkflow } from "./workflows/course-workflows";
import { lessonWorkflow } from "./workflows/lesson-workflow";

export const mastra = new Mastra({
  agents: { askTutor, coursePlanner, lessonPlanner, sceneAnimator, tutor },
  workflows: { diagnoseWorkflow, courseWorkflow, lessonWorkflow },
});
