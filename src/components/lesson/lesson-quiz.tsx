"use client";

import { useState } from "react";
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { QuizQuestion } from "@/mastra/schemas";

type LessonQuizProps = {
  questions: QuizQuestion[];
  /** Called once every question is answered. */
  onComplete?: (correct: number, total: number) => void;
};

export function LessonQuiz({ questions, onComplete }: LessonQuizProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  function answer(index: number, option: number) {
    const next = { ...answers, [index]: option };
    setAnswers(next);
    if (Object.keys(next).length === questions.length) {
      onComplete?.(questions.filter((q, i) => next[i] === q.correctIndex).length, questions.length);
    }
  }

  const answered = Object.keys(answers).length;
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const done = answered === questions.length;

  return (
    <div className="flex flex-col gap-4">
      {questions.map((question, index) => (
        <QuizCard
          key={question.question}
          index={index}
          question={question}
          answer={answers[index]}
          onAnswer={(option) => answer(index, option)}
        />
      ))}

      {done && (
        <Alert>
          <AlertTitle>
            You got {correct} of {questions.length} right
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {correct === questions.length
              ? "Perfect. You really get this."
              : "Rewatch the chapters behind the ones you missed, then try again."}
            <Button variant="outline" size="sm" onClick={() => setAnswers({})}>
              <RotateCcwIcon data-icon="inline-start" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function QuizCard({
  index,
  question,
  answer,
  onAnswer,
}: {
  index: number;
  question: QuizQuestion;
  answer: number | undefined;
  onAnswer: (option: number) => void;
}) {
  const isAnswered = answer !== undefined;
  const isCorrect = answer === question.correctIndex;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start gap-2 leading-snug">
          <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RadioGroup
          value={answer === undefined ? "" : String(answer)}
          onValueChange={(value) => onAnswer(Number(value))}
          disabled={isAnswered}
        >
          {question.options.map((option, optionIndex) => {
            const id = `q${index}-o${optionIndex}`;
            const isRight = isAnswered && optionIndex === question.correctIndex;
            const isWrongPick = isAnswered && optionIndex === answer && !isCorrect;
            return (
              <FieldLabel key={id} htmlFor={id}>
                <Field orientation="horizontal" data-invalid={isWrongPick || undefined}>
                  <RadioGroupItem value={String(optionIndex)} id={id} aria-invalid={isWrongPick || undefined} />
                  <FieldContent>
                    <FieldTitle>{option}</FieldTitle>
                  </FieldContent>
                  {isRight && <CheckIcon className="text-primary" />}
                  {isWrongPick && <XIcon className="text-destructive" />}
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>

        {isAnswered && (
          <div className="flex flex-col items-start gap-2">
            <Badge variant={isCorrect ? "secondary" : "destructive"}>
              {isCorrect ? "Correct" : "Not quite"}
            </Badge>
            <p className="text-muted-foreground text-sm leading-relaxed">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
