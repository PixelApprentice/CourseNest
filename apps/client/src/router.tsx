import { Routes, Route } from 'react-router-dom';
import { HomePage } from './features/home/HomePage';
import { LibraryPage } from './features/library/LibraryPage';
import { ImportPage } from './features/importer/ImportPage';
import { CourseLandingPage } from './features/course/CourseLandingPage';
import { LessonPlayerPage } from './features/player/LessonPlayerPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { LogsPage } from './features/logs/LogsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/course/:courseId" element={<CourseLandingPage />} />
      <Route path="/course/:courseId/lesson/:lessonId" element={<LessonPlayerPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
