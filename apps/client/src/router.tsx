import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './features/home/HomePage';
import { LandingPage } from './features/landing/LandingPage';
import { LibraryPage } from './features/library/LibraryPage';
import { ImportPage } from './features/importer/ImportPage';
import { CourseLandingPage } from './features/course/CourseLandingPage';
import { LessonPlayerPage } from './features/player/LessonPlayerPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export function AppRouter() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/course/:courseId" element={<CourseLandingPage />} />
        <Route path="/course/:courseId/lesson/:lessonId" element={<LessonPlayerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/logs" element={<Navigate to="/settings?tab=logs" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
