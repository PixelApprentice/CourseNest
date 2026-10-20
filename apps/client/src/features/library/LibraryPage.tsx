import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVaultCourses, getCourseProgressPercent, removeCourseFromVault, type CourseData } from '../../lib/courseStore';
import { CourseCard } from '../../components/CourseCard';
import { 
  Search, 
  Grid3X3, 
  List, 
  Upload, 
  AlertTriangle, 
  BookOpen, 
  HardDrive 
} from 'lucide-react';

type FilterType = 'all' | 'in_progress' | 'completed';
type SortType = 'recent' | 'title' | 'duration' | 'progress';

export function LibraryPage() {
  const { courses } = useVaultCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Confirmation modal state for removing downloads
  const [removingCourseId, setRemovingCourseId] = useState<string | null>(null);

  const handleConfirmRemove = () => {
    if (removingCourseId) {
      removeCourseFromVault(removingCourseId);
      setRemovingCourseId(null);
    }
  };

  // Filter & Search Logic
  const filteredCourses = courses.filter((course: CourseData) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const progress = getCourseProgressPercent(course);

    if (activeFilter === 'in_progress') {
      return progress > 0 && progress < 100;
    }
    if (activeFilter === 'completed') {
      return progress === 100;
    }
    return true;
  });

  // Sort Logic
  filteredCourses.sort((a: CourseData, b: CourseData) => {
    if (activeSort === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (activeSort === 'duration') {
      return (b.estimatedDurationMinutes ?? 0) - (a.estimatedDurationMinutes ?? 0);
    }
    if (activeSort === 'progress') {
      return getCourseProgressPercent(b) - getCourseProgressPercent(a);
    }
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header & Main Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--cn-primary)] font-semibold mb-1">
            <HardDrive size={13} />
            <span>LOCAL REPOSITORY</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
            Course Vault
          </h1>
          <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] mt-1">
            Access your air-gapped university subjects, curriculum modules, and local media files.
          </p>
        </div>

        <Link
          to="/import"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors self-start md:self-auto shadow-sm"
        >
          <Upload size={14} />
          <span>Ingest New Package</span>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[var(--cn-surface)] p-4 rounded-xl border border-[var(--cn-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cn-text-muted)]" />
          <input
            type="text"
            placeholder="Search by subject, code, topic, or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] placeholder-[var(--cn-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)] transition-all font-mono"
          />
        </div>

        {/* Filter Chips & View Mode */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center bg-[var(--cn-bg)] p-1 rounded-lg border border-[var(--cn-border)] text-xs font-mono">
            {(['all', 'in_progress', 'completed'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setActiveFilter(filterKey)}
                className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                  activeFilter === filterKey
                    ? 'bg-[var(--cn-surface)] text-[var(--cn-primary)] shadow-xs font-semibold'
                    : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                {filterKey.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as SortType)}
            className="px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-secondary)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
          >
            <option value="recent">Recently Added</option>
            <option value="progress">Highest Progress</option>
            <option value="title">Title (A-Z)</option>
            <option value="duration">Longest Duration</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-[var(--cn-border)] rounded-lg overflow-hidden bg-[var(--cn-bg)]">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)]'
                  : 'text-[var(--cn-text-muted)] hover:bg-[var(--cn-surface)]'
              }`}
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)]'
                  : 'text-[var(--cn-text-muted)] hover:bg-[var(--cn-surface)]'
              }`}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Courses List / Grid */}
      {filteredCourses.length === 0 ? (
        <div className="border border-dashed border-[var(--cn-border)] rounded-2xl p-12 text-center bg-[var(--cn-surface)] space-y-4">
          <BookOpen size={44} className="mx-auto text-[var(--cn-text-muted)]" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
              {searchQuery ? 'No matching courses found in vault' : 'Your vault is currently empty'}
            </h3>
            <p className="text-xs text-[var(--cn-text-muted)] max-w-md mx-auto">
              {searchQuery
                ? `No courses matching "${searchQuery}". Try adjusting your keywords or clearing the filter.`
                : 'Ingest educational course packages, PDFs, and slide decks to study completely offline.'}
            </p>
          </div>
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Reset Search & Filters
            </button>
          ) : (
            <Link
              to="/import"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-semibold"
            >
              <Upload size={14} />
              <span>Ingest Course Package</span>
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
          {filteredCourses.map((course: CourseData) => {
            const progress = getCourseProgressPercent(course);
            const totalLessons = course.sections.reduce((acc: number, s) => acc + s.lessons.length, 0);

            return (
              <CourseCard
                key={course.id}
                course={course}
                viewMode={viewMode}
                progressPercent={progress}
                totalSections={course.sections.length}
                totalLessons={totalLessons}
                lastLessonId={course.sections[0]?.lessons[0]?.id}
                onRemoveDownload={(id) => setRemovingCourseId(id)}
              />
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog: Delete / Remove Course from Vault */}
      {removingCourseId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--cn-warning)]">
              <div className="w-10 h-10 rounded-full bg-[var(--cn-warning-tint)] flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Remove Course from Vault?
              </h3>
            </div>

            <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
              This will unregister this course and purge its cached curriculum from your local vault storage.
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
                className="px-4 py-2 rounded-lg bg-[var(--cn-danger)] text-white text-xs font-semibold hover:bg-[var(--cn-danger)]/90"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
