import { Agent } from "@mastra/core/agent";
import { model } from "../models";
import { ANIMATOR_INSTRUCTIONS } from "../prompts/animator";
import { COURSE_PLANNER_INSTRUCTIONS } from "../prompts/course";
import { PLANNER_INSTRUCTIONS } from "../prompts/planner";
import { TUTOR_INSTRUCTIONS } from "../prompts/tutor";

export const coursePlanner = new Agent({
  id: "course-planner",
  name: "Course Planner",
  instructions: COURSE_PLANNER_INSTRUCTIONS,
  model,
});

export const lessonPlanner = new Agent({
  id: "lesson-planner",
  name: "Lesson Planner",
  instructions: PLANNER_INSTRUCTIONS,
  model,
});

export const sceneAnimator = new Agent({
  id: "scene-animator",
  name: "Scene Animator",
  instructions: ANIMATOR_INSTRUCTIONS,
  model,
});

export const tutor = new Agent({
  id: "tutor",
  name: "Tutor",
  instructions: TUTOR_INSTRUCTIONS,
  model,
});
