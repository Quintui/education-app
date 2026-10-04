import { LightbulbIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Lesson } from "@/mastra/schemas";

export function LessonNotes({ notes }: { notes: Lesson["notes"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Reread this tomorrow and it will come back.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="leading-relaxed">{notes.summary}</p>
          <Separator />
          <div className="flex gap-3">
            <LightbulbIcon className="text-highlight-foreground bg-highlight mt-0.5 size-7 shrink-0 rounded-md p-1.5" />
            <p className="text-muted-foreground leading-relaxed">{notes.analogy}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key terms</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3">
            {notes.keyTerms.map((item) => (
              <div key={item.term} className="flex flex-col gap-0.5">
                <dt className="font-medium">{item.term}</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">{item.definition}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Key ideas</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-4 sm:grid-cols-2">
            {notes.keyIdeas.map((idea, index) => (
              <li key={idea.title} className="flex gap-3">
                <span className="bg-secondary text-secondary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{idea.title}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{idea.explanation}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
