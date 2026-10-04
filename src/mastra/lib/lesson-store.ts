import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { courseSchema, lessonSchema, type Course, type Lesson } from "../schemas";

// Local disk storage keeps the demo simple. Swap for S3/R2/Vercel Blob in production.
const ROOT = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");

const ID_PATTERN = /^[a-z0-9-]+$/;
const FILE_PATTERN = /^(?:[a-z0-9-]+\/)?[a-z0-9-]+\.(?:mp3|js|json|html)$/;

function lessonPath(lessonId: string, file: string) {
  if (!ID_PATTERN.test(lessonId) || !FILE_PATTERN.test(file)) {
    throw new Error(`Invalid lesson path: ${lessonId}/${file}`);
  }
  return path.join(ROOT, "lessons", lessonId, file);
}

function coursePath(courseId: string) {
  if (!ID_PATTERN.test(courseId)) throw new Error(`Invalid course id: ${courseId}`);
  return path.join(ROOT, "courses", `${courseId}.json`);
}

async function write(target: string, data: string | Uint8Array) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

async function read(target: string) {
  try {
    return await readFile(target);
  } catch {
    return null;
  }
}

export function slugId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "course"}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Lessons are addressed by their place in a course, so "is it built?" is a file lookup. */
export function lessonIdFor(courseId: string, nodeId: string) {
  return `${courseId}-${nodeId}`;
}

// ── Lessons ──────────────────────────────────────────────────────────────

export function writeLessonFile(lessonId: string, file: string, data: string | Uint8Array) {
  return write(lessonPath(lessonId, file), data);
}

export function readLessonFile(lessonId: string, file: string) {
  return read(lessonPath(lessonId, file));
}

export function saveLesson(lesson: Lesson) {
  return writeLessonFile(lesson.id, "lesson.json", JSON.stringify(lesson, null, 2));
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  if (!ID_PATTERN.test(lessonId)) return null;
  const raw = await readLessonFile(lessonId, "lesson.json");
  return raw ? lessonSchema.parse(JSON.parse(raw.toString("utf8"))) : null;
}

// ── Courses ──────────────────────────────────────────────────────────────

export function saveCourse(course: Course) {
  return write(coursePath(course.id), JSON.stringify(course, null, 2));
}

export async function getCourse(courseId: string): Promise<Course | null> {
  if (!ID_PATTERN.test(courseId)) return null;
  const raw = await read(coursePath(courseId));
  return raw ? courseSchema.parse(JSON.parse(raw.toString("utf8"))) : null;
}

/** Built lessons of a course, keyed by node id. */
export async function getCourseLessons(course: Course) {
  const nodes = course.modules.flatMap((m) => m.lessons);
  const lessons = await Promise.all(nodes.map((node) => getLesson(lessonIdFor(course.id, node.id))));
  return new Map(
    lessons.flatMap((lesson) => (lesson ? [[lesson.nodeId, lesson] as const] : [])),
  );
}
