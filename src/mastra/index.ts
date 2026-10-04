import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { coursePlanner, lessonPlanner, sceneAnimator, tutor } from "./agents";
import { askTutor } from "./agents/ask-tutor";
import { DATABASE_URL } from "./lib/paths";
import { courseWorkflow, diagnoseWorkflow } from "./workflows/course-workflows";
import { lessonWorkflow } from "./workflows/lesson-workflow";

export const mastra = new Mastra({
  agents: { askTutor, coursePlanner, lessonPlanner, sceneAnimator, tutor },
  workflows: { diagnoseWorkflow, courseWorkflow, lessonWorkflow },
  // Workflow runs, traces and Ask conversations, in the same local SQLite file as the app data.
  storage: new LibSQLStore({ id: "lumen", url: DATABASE_URL }),
});
