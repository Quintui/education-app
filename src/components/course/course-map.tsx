"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CircleCheckIcon, CircleDashedIcon, CircleIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Course } from "@/mastra/schemas";

type CourseMapProps = {
  course: Course;
  builtIds: string[];
  currentId: string;
};

export function CourseMap({ course, builtIds, currentId }: CourseMapProps) {
  const built = new Set(builtIds);
  const total = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  let order = 0;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="order-last lg:sticky lg:top-4 lg:order-none lg:self-start"
    >
      <Card>
        <CardHeader>
          <CardDescription>Your course</CardDescription>
          <CardTitle className="font-heading text-xl leading-tight tracking-tight">{course.title}</CardTitle>
          <div className="mt-2 flex flex-col gap-1.5">
            <Progress value={(built.size / total) * 100} aria-label="Course progress" />
            <span className="text-muted-foreground text-xs tabular-nums">
              {built.size} of {total} lessons ready
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <nav aria-label="Lessons" className="flex flex-col gap-5">
            {course.modules.map((module) => (
              <div key={module.id} className="flex flex-col gap-1">
                <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">{module.title}</p>
                <ul className="flex flex-col">
                  {module.lessons.map((lesson) => {
                    const delay = 0.15 + order++ * 0.04;
                    const isCurrent = lesson.id === currentId;
                    const isBuilt = built.has(lesson.id);
                    return (
                      <motion.li
                        key={lesson.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay, ease: EASE_OUT }}
                      >
                        <Link
                          href={`?lesson=${lesson.id}`}
                          scroll={false}
                          aria-current={isCurrent ? "page" : undefined}
                          className={cn(
                            "hover:bg-muted relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                            isCurrent && "text-secondary-foreground font-medium",
                          )}
                        >
                          {isCurrent && (
                            <motion.span
                              layoutId="current-lesson"
                              className="bg-secondary absolute inset-0 -z-10 rounded-lg"
                              transition={{ type: "spring", stiffness: 400, damping: 34 }}
                            />
                          )}
                          <LessonIcon isBuilt={isBuilt} isBuilding={isCurrent && !isBuilt} isKnown={lesson.likelyKnown} />
                          <span className={cn("truncate", lesson.likelyKnown && !isCurrent && "text-muted-foreground")}>
                            {lesson.title}
                          </span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </CardContent>
      </Card>
    </motion.aside>
  );
}

function LessonIcon({ isBuilt, isBuilding, isKnown }: { isBuilt: boolean; isBuilding: boolean; isKnown: boolean }) {
  if (isBuilt) return <CircleCheckIcon className="text-primary size-4 shrink-0" />;
  if (isBuilding) return <Spinner className="text-primary shrink-0" />;
  if (isKnown) return <CircleDashedIcon className="text-muted-foreground size-4 shrink-0" />;
  return <CircleIcon className="text-muted-foreground/60 size-4 shrink-0" />;
}
