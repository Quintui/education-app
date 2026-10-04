import { z } from "zod";
import { addLeaf } from "@/mastra/lib/course";
import { getCourse, saveCourse } from "@/mastra/lib/store";

const bodySchema = z.object({
  parentId: z.string(),
  title: z.string().min(1).max(80),
  goal: z.string().min(1).max(300),
  question: z.string().max(500),
});

/** Grows a learner's question into a new leaf lesson on their course tree. */
export async function POST(req: Request, { params }: RouteContext<"/api/course/[id]/leaves">) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Invalid leaf", { status: 400 });

  const course = await getCourse((await params).id);
  if (!course) return new Response("Course not found", { status: 404 });

  const { parentId, ...leaf } = parsed.data;
  const node = addLeaf(course, parentId, leaf);
  await saveCourse(course);
  return Response.json({ nodeId: node.id });
}
