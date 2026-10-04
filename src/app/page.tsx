import { AppHeader } from "@/components/app-header";
import { CourseStudio } from "@/components/course-studio";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <main className="min-h-0 flex-1">
        <CourseStudio />
      </main>
    </div>
  );
}
