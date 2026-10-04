import { Mastra } from "@mastra/core";
import { coursePlanner, lessonPlanner, sceneAnimator, tutor } from "./agents";
import { courseWorkflow, diagnoseWorkflow } from "./workflows/course-workflows";
import { lessonWorkflow } from "./workflows/lesson-workflow";

export const mastra = new Mastra({
  agents: { coursePlanner, lessonPlanner, sceneAnimator, tutor },
  workflows: { diagnoseWorkflow, courseWorkflow, lessonWorkflow },
});
