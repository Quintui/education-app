import { getLesson, readLessonFile } from "@/mastra/lib/store";
import { SANDBOX_CSP, renderPlaygroundHtml, renderStageHtml } from "@/mastra/lib/stage";

const AUDIO_FILES = new Set(["narration.mp3", "music.mp3"]);

export async function GET(
  req: Request,
  { params }: RouteContext<"/api/lessons/[id]/[file]">,
) {
  const { id, file } = await params;
  const lesson = await getLesson(id);
  if (!lesson) return new Response("Lesson not found", { status: 404 });

  if (AUDIO_FILES.has(file)) {
    const audio = await readLessonFile(id, file);
    return audio ? audioResponse(req, audio) : new Response("Not found", { status: 404 });
  }

  if (file === "stage") {
    const code = await Promise.all(
      lesson.video.scenes.map(async (scene) => {
        const source = await readLessonFile(id, `scenes/${scene.id}.js`);
        return [scene.id, source?.toString("utf8") ?? ""] as const;
      }),
    );
    return htmlResponse(renderStageHtml(lesson, Object.fromEntries(code)));
  }

  if (file === "playground") {
    const markup = await readLessonFile(id, "playground.html");
    if (!markup) return new Response("Not found", { status: 404 });
    return htmlResponse(renderPlaygroundHtml(lesson, markup.toString("utf8")));
  }

  return new Response("Not found", { status: 404 });
}

function htmlResponse(html: string) {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": SANDBOX_CSP,
    },
  });
}

/** Browsers need range support to seek inside audio. */
function audioResponse(req: Request, audio: Buffer) {
  const size = audio.byteLength;
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  const headers = { "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes" };

  if (!range) {
    return new Response(new Uint8Array(audio), {
      headers: { ...headers, "Content-Length": String(size) },
    });
  }

  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  return new Response(new Uint8Array(audio.subarray(start, end + 1)), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}
