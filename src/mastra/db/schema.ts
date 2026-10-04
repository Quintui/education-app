import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Course, Lesson } from "../schemas";

/** Courses, lessons and progress. Mastra keeps its own tables (runs, memory) in the same file. */

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  data: text("data", { mode: "json" }).$type<Course>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  data: text("data", { mode: "json" }).$type<Lesson>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const UNDERSTANDING = ["got-it", "partly", "lost"] as const;

export const progress = sqliteTable("progress", {
  lessonId: text("lesson_id")
    .primaryKey()
    .references(() => lessons.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull(),
  watchedAt: integer("watched_at", { mode: "timestamp_ms" }),
  /** How the learner says the lesson landed. */
  understanding: text("understanding", { enum: UNDERSTANDING }),
  quizCorrect: integer("quiz_correct"),
  quizTotal: integer("quiz_total"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type LessonProgress = typeof progress.$inferSelect;
