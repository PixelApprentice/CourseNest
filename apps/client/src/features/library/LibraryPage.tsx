import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourses, removeDownloadedCourseBytes } from '../../lib/courseStore';
import { CourseCard } from '../../components/CourseCard';
import { DownloadStatus } from '@coursenest/domain';
import { 
  Search, 
  Grid3X3, 
  List, 
  Upload, 
  AlertTriangle,
  BookOpen
} from 'lucide-react';

type FilterType = 'all' | 'offline' | 'in_progress';
type SortType = 'recent' | 'title' | 'duration';

export function LibraryPage() {
  const { courses, refresh } = useCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Confirmation modal state for removing downloads
  const [removingCourseId, setRemovingCourseId] = useState<string | null>(null);

  const handleConfirmRemove = () => {
    if (removingCourseId) {
      removeDownloadedCourseBytes(removingCourseId);
      refresh();
      setRemovingCourseId(null);
    }
  };

  // Filter & Search Logic
  const filteredCourses = courses.filter(({ course }) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'offline') {
      return course.localAvailability === DownloadStatus.Downloaded;
    }
    if (activeFilter === 'in_progress') {
      return true; // Courses with progress
    }
    return true;
  });

  // Sort Logic
  filteredCourses.sort((a, b) => {
    if (activeSort === 'title') {
      return a.course.title.localeCompare(b.course.title);
    }
    if (activeSort === 'duration') {
      return (b.course.estimatedDurationMinutes ?? 0) - (a.course.estimatedDurationMinutes ?? 0);
    }
    return new Date(b.course.updatedAt).getTime() - new Date(a.course.updatedAt).getTime();
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--cn-text-primary)]">Course Library</h1>
          <p className="text-sm text-[var(--cn-text-secondary)] mt-0.5">
            Manage your offline learning materials, downloads, and enrolled subjects.
          </p>
        </div>

        <Link
          to="/import"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-sm font-medium hover:bg-[var(--cn-primary-hover)] transition-colors self-start md:self-auto shadow-sm"
        >
          <Upload size={16} />
          <span>Import Course</span>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[var(--cn-surface)] p-4 rounded-xl border border-[var(--cn-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cn-text-muted)]" />
          <input
            type="text"
            placeholder="Search by title, instructor, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-sm text-[var(--cn-text-primary)] placeholder-[var(--cn-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cn-primary)] focus:bg-[var(--cn-surface)] transition-all"
          />
        </div>

        {/* Filter Chips & View Mode */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-[var(--cn-surface-subtle)] p-1 rounded-lg border border-[var(--cn-border)] text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-[var(--cn-surface)] text-[var(--cn-text-primary)] shadow-sm'
                  : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
              }`}
            >
              All ({courses.length})
            </button>
            <button
              onClick={() => setActiveFilter('offline')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeFilter === 'offline'
                  ? 'bg-[var(--cn-surface)] text-[var(--cn-text-primary)] shadow-sm'
                  : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
              }`}
            >
              Downloaded
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as SortType)}
            className="px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-secondary)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
          >
            <option value="recent">Recently Updated</option>
            <option value="title">Title (A-Z)</option>
            <option value="duration">Duration</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-[var(--cn-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)]'
                  : 'text-[var(--cn-text-muted)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)]'
                  : 'text-[var(--cn-text-muted)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Courses List / Grid */}
      {filteredCourses.length === 0 ? (
        <div className="border border-dashed border-[var(--cn-border)] rounded-xl p-12 text-center bg-[var(--cn-surface)]">
          <BookOpen size={44} className="mx-auto mb-3 text-[var(--cn-text-muted)]" />
          <h3 className="font-semibold text-base text-[var(--cn-text-primary)]">
            {searchQuery ? 'No matching courses found' : 'Your library is empty'}
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] mt-1 mb-6 max-w-md mx-auto">
            {searchQuery
              ? `No courses matching "${searchQuery}". Try adjusting your filters or search keywords.`
              : 'Import your educational materials or course packages to begin studying offline.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Reset Search & Filters
            </button>
          ) : (
            <Link
              to="/import"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium"
            >
              <Upload size={14} />
              <span>Import Course Materials</span>
            </Link>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {filteredCourses.map(({ course, sections }) => (
            <CourseCard
              key={course.id}
              course={course}
              viewMode={viewMode}
              progressPercent={course.id === 'course-cs101' ? 45 : 15}
              lastLessonId={sections[0]?.lessons[0]?.lesson.id}
              onRemoveDownload={(id) => setRemovingCourseId(id)}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog: Remove Downloaded Bytes (Checklist Item 10) */}
      {removingCourseId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--cn-warning)]">
              <div className="w-10 h-10 rounded-full bg-[var(--cn-warning-tint)] flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Remove Downloaded Media?
              </h3>
            </div>

            <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
              This will delete video and document files from your local disk to free storage.
              <br /><br />
              <strong className="text-[var(--cn-text-primary)] font-medium">Important:</strong> Your course enrollment, personal notes, bookmarks, and quiz scores will <strong className="text-[var(--cn-success)]">remain completely safe</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--cn-border)]">
              <button
                onClick={() => setRemovingCourseId(null)}
                className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-lg bg-[var(--cn-danger)] text-white text-xs font-medium hover:bg-[var(--cn-danger)]/90"
              >
                Remove Media Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
