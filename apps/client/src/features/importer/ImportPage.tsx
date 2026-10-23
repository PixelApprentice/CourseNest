import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorageConfig } from '../../lib/storageConfig';
import { addLog } from '../../lib/logger';
import { 
  parseCourseArchives, 
  parseCourseFolder,
  commitImportedCourse, 
  type ProposalSection,
  type DiscoveredArchiveFile 
} from '../../lib/zipImporter';
import { transformManifest } from '../../lib/courseStore';
import { 
  IconArchive, 
  IconFolder,
  IconCircleCheck, 
  IconLoader2, 
  IconArrowRight, 
  IconShieldCheck, 
  IconCheck, 
  IconPlus, 
  IconTrash, 
  IconDeviceFloppy, 
  IconVideo, 
  IconFileText, 
  IconCode, 
  IconChecklist
} from '@tabler/icons-react';

type WizardStep = 'select' | 'inventory' | 'review' | 'importing' | 'complete';

interface ArchiveMeta {
  id: string;
  name: string;
  type: 'zip' | 'folder' | 'manifest';
  sizeBytes: number;
  filesCount: number;
}

export function ImportPage() {
  const navigate = useNavigate();
  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const { config: storageConfig } = useStorageConfig();

  const [step, setStep] = useState<WizardStep>('select');
  
  // Accumulated raw uploaded files
  const [accumulatedZipFiles, setAccumulatedZipFiles] = useState<File[]>([]);
  const [accumulatedFolderFiles, setAccumulatedFolderFiles] = useState<File[]>([]);
  
  const [archivesList, setArchivesList] = useState<ArchiveMeta[]>([]);
  const [discoveredFiles, setDiscoveredFiles] = useState<DiscoveredArchiveFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [importProgress, setImportProgress] = useState(0);

  // Storage Target Selection
  const [targetStorage, setTargetStorage] = useState<'internal' | 'external'>('internal');

  // Course metadata state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSubject, setCourseSubject] = useState('General');
  const [instructorName, setInstructorName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'json'>('file');

  // Curriculum proposal state
  const [proposedSections, setProposedSections] = useState<ProposalSection[]>([]);
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null);

  // Aggregate and parse all uploaded ZIPs and Folder files
  const reprocessFiles = async (zips: File[], folders: File[]) => {
    setIsProcessing(true);
    setStatusMessage('Analyzing course files and chapter hierarchy...');

    try {
      const allDiscovered: DiscoveredArchiveFile[] = [];
      const metas: ArchiveMeta[] = [];
      let combinedSections: ProposalSection[] = [];
      let detectedTitle = courseTitle;

      // 1. Process ZIP archives
      if (zips.length > 0) {
        const zipResult = await parseCourseArchives(zips);
        allDiscovered.push(...zipResult.discoveredFiles);
        combinedSections.push(...zipResult.sections);
        if (!detectedTitle) detectedTitle = zipResult.suggestedTitle;

        for (let i = 0; i < zips.length; i++) {
          const zf = zips[i]!;
          metas.push({
            id: `zip-${zf.name}-${zf.size}`,
            name: zf.name,
            type: 'zip',
            sizeBytes: zf.size,
            filesCount: zipResult.discoveredFiles.filter((df) => df.archiveName === zf.name.replace(/\.[^/.]+$/, '')).length,
          });
        }
      }

      // 2. Process Folder files (webkitdirectory)
      if (folders.length > 0) {
        const folderResult = await parseCourseFolder(folders);
        allDiscovered.push(...folderResult.discoveredFiles);
        
        // Merge sections
        const offset = combinedSections.length;
        const adjustedFolderSections = folderResult.sections.map((s, idx) => ({
          ...s,
          position: s.position + offset,
          id: `sec-folder-${idx + offset + 1}`,
        }));
        combinedSections.push(...adjustedFolderSections);
        
        if (!detectedTitle) detectedTitle = folderResult.suggestedTitle;

        // Group folder metas by top-level directory
        const topDirs = new Set<string>();
        for (const f of folders) {
          const parts = (f.webkitRelativePath || f.name).split('/');
          topDirs.add(parts[0] || 'Course Folder');
        }

        for (const dir of topDirs) {
          const dirFiles = folders.filter((f) => (f.webkitRelativePath || f.name).startsWith(dir));
          const dirSize = dirFiles.reduce((acc, f) => acc + f.size, 0);
          metas.push({
            id: `folder-${dir}`,
            name: dir,
            type: 'folder',
            sizeBytes: dirSize,
            filesCount: dirFiles.length,
          });
        }
      }

      // Renumber sections consistently
      combinedSections.sort((a, b) => a.position - b.position);
      combinedSections = combinedSections.map((s, idx) => ({
        ...s,
        position: idx + 1,
      }));

      setDiscoveredFiles(allDiscovered);
      setProposedSections(combinedSections);
      setArchivesList(metas);

      if (detectedTitle && !courseTitle) {
        setCourseTitle(detectedTitle);
      }
      if (metas.length > 0) {
        setStep('inventory');
      }
    } catch (err: any) {
      console.error('Archive processing error:', err);
      alert(`Error reading course files: ${err.message || 'Unknown error'}`);
      addLog('ERROR', 'IMPORTER', 'Failed to inspect files', err.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
      if (zipInputRef.current) zipInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Add ZIP files handler (appends to existing)
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles = Array.from(fileList);
    const existingNames = new Set(accumulatedZipFiles.map((f) => f.name));
    const toAdd = newFiles.filter((f) => !existingNames.has(f.name));

    if (toAdd.length === 0) {
      alert('Selected file(s) are already added.');
      return;
    }

    const updatedZips = [...accumulatedZipFiles, ...toAdd];
    setAccumulatedZipFiles(updatedZips);
    await reprocessFiles(updatedZips, accumulatedFolderFiles);
  };

  // Add Extracted Folder handler (appends to existing)
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles = Array.from(fileList);
    const updatedFolders = [...accumulatedFolderFiles, ...newFiles];
    setAccumulatedFolderFiles(updatedFolders);
    await reprocessFiles(accumulatedZipFiles, updatedFolders);
  };

  // Remove an archive/folder from the list
  const handleRemoveArchive = async (meta: ArchiveMeta) => {
    if (meta.type === 'zip') {
      const updated = accumulatedZipFiles.filter((f) => f.name !== meta.name);
      setAccumulatedZipFiles(updated);
      if (updated.length === 0 && accumulatedFolderFiles.length === 0) {
        setArchivesList([]);
        setDiscoveredFiles([]);
        setProposedSections([]);
        setStep('select');
      } else {
        await reprocessFiles(updated, accumulatedFolderFiles);
      }
    } else if (meta.type === 'folder') {
      const updated = accumulatedFolderFiles.filter((f) => {
        const parts = (f.webkitRelativePath || f.name).split('/');
        return parts[0] !== meta.name;
      });
      setAccumulatedFolderFiles(updated);
      if (accumulatedZipFiles.length === 0 && updated.length === 0) {
        setArchivesList([]);
        setDiscoveredFiles([]);
        setProposedSections([]);
        setStep('select');
      } else {
        await reprocessFiles(accumulatedZipFiles, updated);
      }
    }
  };

  // Toggle approval on a lesson
  const toggleLessonApproval = (secId: string, lesId: string) => {
    setProposedSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lessons: sec.lessons.map((les) =>
            les.id === lesId ? { ...les, isApproved: !les.isApproved } : les
          ),
        };
      })
    );
  };

  // Rename a section
  const handleRenameSection = (secId: string, newTitle: string) => {
    setProposedSections((prev) =>
      prev.map((sec) => (sec.id === secId ? { ...sec, title: newTitle } : sec))
    );
  };

  // Rename a lesson
  const handleRenameLesson = (secId: string, lesId: string, newTitle: string) => {
    setProposedSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lessons: sec.lessons.map((les) =>
            les.id === lesId ? { ...les, title: newTitle } : les
          ),
        };
      })
    );
  };

  // Add a new empty section
  const handleAddSection = () => {
    const title = prompt('Enter title for the new section or chapter:');
    if (!title || !title.trim()) return;

    const newSec: ProposalSection = {
      id: `sec-${Date.now()}`,
      title: title.trim(),
      position: proposedSections.length + 1,
      sourceConfidence: 'numbered',
      lessons: [],
    };
    setProposedSections((prev) => [...prev, newSec]);
  };

  // Delete a section
  const handleDeleteSection = (secId: string) => {
    if (!confirm('Are you sure you want to remove this section?')) return;
    setProposedSections((prev) => prev.filter((s) => s.id !== secId));
  };

  // Add a new lesson to a section
  const handleAddLesson = (secId: string) => {
    const title = prompt('Enter new lesson title:');
    if (!title || !title.trim()) return;

    setProposedSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lessons: [
            ...sec.lessons,
            {
              id: `les-${Date.now()}`,
              title: title.trim(),
              position: sec.lessons.length + 1,
              files: [],
              subtitleFiles: [],
              isApproved: true,
            },
          ],
        };
      })
    );
  };

  // Delete a lesson
  const handleDeleteLesson = (secId: string, lesId: string) => {
    setProposedSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lessons: sec.lessons.filter((l) => l.id !== lesId),
        };
      })
    );
  };

  // Execute Final Commit into Offline Vault
  const handleFinalImport = async () => {
    if (!courseTitle.trim()) {
      alert('Please enter a course title.');
      return;
    }

    setIsProcessing(true);
    setStep('importing');
    setImportProgress(5);
    setStatusMessage('Extracting course files and saving to local vault...');

    const newCourseId = `course-${Date.now()}`;

    try {
      await commitImportedCourse({
        courseId: newCourseId,
        courseTitle: courseTitle.trim(),
        courseSubject: courseSubject.trim() || 'General',
        instructorName: instructorName.trim() || 'Course Instructor',
        courseDescription: courseDescription.trim() || `Course with ${proposedSections.length} chapter(s).`,
        targetStorage,
        sections: proposedSections,
        onProgress: (percent, msg) => {
          setImportProgress(percent);
          setStatusMessage(msg);
        },
      });

      setSavedCourseId(newCourseId);
      setStep('complete');
    } catch (err: any) {
      console.error('Final import failed:', err);
      alert(`Import failed: ${err.message || 'Unknown error'}`);
      setStep('review');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const totalBytes = archivesList.reduce((acc, a) => acc + a.sizeBytes, 0);
  const totalApprovedLessons = proposedSections.reduce(
    (acc, s) => acc + s.lessons.filter((l) => l.isApproved).length,
    0
  );

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Modern Responsive Step Progress Tracker */}
      <nav aria-label="Import Progress" className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-4 sm:p-5 shadow-xs">
        <ol className="flex items-center w-full">
          {[
            { id: 'select', title: 'Select Files', short: 'Files' },
            { id: 'inventory', title: 'Archive Scan', short: 'Scan' },
            { id: 'review', title: 'Review Structure', short: 'Review' },
            { id: 'complete', title: 'Import Ready', short: 'Ready' },
          ].map((item, idx) => {
            const isCurrent = step === item.id;
            const isDone =
              (item.id === 'select' && step !== 'select') ||
              (item.id === 'inventory' && (step === 'review' || step === 'complete')) ||
              (item.id === 'review' && step === 'complete');

            return (
              <li key={item.id} className={`flex items-center ${idx < 3 ? 'flex-1' : ''}`}>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                      isDone
                        ? 'bg-[var(--cn-success)] text-white shadow-xs'
                        : isCurrent
                          ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] ring-2 ring-[var(--cn-primary)]/30 font-bold'
                          : 'bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]'
                    }`}
                  >
                    {isDone ? <IconCheck size={14} strokeWidth={2.5} /> : idx + 1}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={`text-xs font-medium font-sans whitespace-nowrap ${
                        isCurrent
                          ? 'text-[var(--cn-text-primary)] font-bold'
                          : isDone
                            ? 'text-[var(--cn-text-secondary)]'
                            : 'text-[var(--cn-text-muted)]'
                      }`}
                    >
                      {item.title}
                    </p>
                  </div>
                </div>

                {idx < 3 && (
                  <div className="flex-1 mx-2 sm:mx-4 h-0.5 rounded-full overflow-hidden bg-[var(--cn-border)] min-w-[16px]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isDone ? 'bg-[var(--cn-success)] w-full' : isCurrent ? 'bg-[var(--cn-primary)]/60 w-1/2' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Hidden File Inputs */}
      <input
        ref={zipInputRef}
        type="file"
        multiple
        accept=".zip,.tar.gz,.tgz"
        onChange={handleZipUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        onChange={handleFolderUpload}
        className="hidden"
      />

      {/* STEP 1: SELECT SOURCE */}
      {step === 'select' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30">
              <IconShieldCheck size={14} />
              <span>OFFLINE COURSE IMPORTER</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--cn-text-primary)]">
              Add Your Course Files
            </h2>
            <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] leading-relaxed">
              Import course archives (ZIP files) or an unzipped course directory from your computer.
              CourseNest inspects your files, detects chapters and companion notes, and stores them safely for offline study.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex justify-center gap-2 text-xs font-mono">
            <button
              onClick={() => setImportMode('file')}
              className={`px-4 py-1.5 rounded-lg border transition-colors ${
                importMode === 'file'
                  ? 'bg-[var(--cn-primary)] text-white border-[var(--cn-primary)] font-semibold'
                  : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
            >
              Course Files & Folders
            </button>
            <button
              onClick={() => setImportMode('json')}
              className={`px-4 py-1.5 rounded-lg border transition-colors ${
                importMode === 'json'
                  ? 'bg-[var(--cn-primary)] text-white border-[var(--cn-primary)] font-semibold'
                  : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
            >
              Paste Course JSON
            </button>
          </div>

          {isProcessing ? (
            <div className="py-16 text-center space-y-4">
              <IconLoader2 size={36} className="animate-spin text-[var(--cn-primary)] mx-auto" />
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Inspecting Course Materials...
              </h3>
              <p className="text-xs text-[var(--cn-text-muted)] font-mono">
                {statusMessage || 'Reading directory structure and detecting chapters...'}
              </p>
            </div>
          ) : importMode === 'file' ? (
            /* Upload Action Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Option 1: ZIP Archive(s) */}
              <div
                onClick={() => zipInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--cn-border)] hover:border-[var(--cn-primary)] rounded-2xl p-8 bg-[var(--cn-bg)] transition-[border-color,background-color] duration-150 ease-out cursor-pointer space-y-3 text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <IconArchive size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[var(--cn-text-primary)]">
                    Add ZIP Archive(s)
                  </p>
                  <p className="text-xs text-[var(--cn-text-muted)] font-mono leading-relaxed">
                    Select one or multiple .zip files (e.g. 01. Intro.zip, 02. Basics.zip). You can add more later.
                  </p>
                </div>
              </div>

              {/* Option 2: Extracted Folder */}
              <div
                onClick={() => folderInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--cn-border)] hover:border-[var(--cn-primary)] rounded-2xl p-8 bg-[var(--cn-bg)] transition-[border-color,background-color] duration-150 ease-out cursor-pointer space-y-3 text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <IconFolder size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[var(--cn-text-primary)]">
                    Add Course Folder
                  </p>
                  <p className="text-xs text-[var(--cn-text-muted)] font-mono leading-relaxed">
                    Select an unzipped folder containing lectures, videos, and reading materials.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Paste JSON Manifest */
            <div className="space-y-3 text-left max-w-2xl mx-auto">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">
                Course JSON Structure
              </label>
              <textarea
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                placeholder='{\n  "title": "My Custom Course",\n  "subject": "Computer Science",\n  "instructor": "Professor",\n  "sections": []\n}'
                rows={8}
                className="w-full p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(rawJsonInput);
                    const transformed = transformManifest(parsed);
                    setCourseTitle(transformed.title);
                    setCourseSubject(transformed.subject);
                    setInstructorName(transformed.instructorName);
                    setCourseDescription(transformed.description);
                    setProposedSections(
                      transformed.sections.map((s) => ({
                        id: s.id,
                        title: s.title,
                        position: s.position,
                        sourceConfidence: 'manifest',
                        lessons: s.lessons.map((l) => ({
                          id: l.id,
                          title: l.title,
                          position: l.position,
                          files: [],
                          subtitleFiles: [],
                          isApproved: true,
                        })),
                      }))
                    );
                    setStep('review');
                  } catch {
                    alert('Invalid JSON structure. Please check the JSON format.');
                  }
                }}
                disabled={!rawJsonInput.trim()}
                className="px-5 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] disabled:opacity-50 transition-colors"
              >
                Preview & Review
              </button>
            </div>
          )}

          {/* Real Safeguards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <IconShieldCheck size={14} className="text-[var(--cn-success)]" />
                Automatic Chapter Detection
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                Detects chapters, numbered folders, lectures, and sub-chapters automatically.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <IconShieldCheck size={14} className="text-[var(--cn-success)]" />
                Safe Offline Extraction
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                Prevents directory traversal attacks and extracts files safely inside device storage.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <IconShieldCheck size={14} className="text-[var(--cn-success)]" />
                External Media Support
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                Can store media files directly on an external USB flash drive or SD card.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: INVENTORY SCAN */}
      {step === 'inventory' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--cn-border)] pb-4 gap-3">
            <div>
              <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
                Selected Course Materials: {archivesList.length} Item(s)
              </h3>
              <p className="text-xs text-[var(--cn-text-muted)] font-mono mt-0.5">
                {(totalBytes / 1024 / 1024).toFixed(1)} MB total • {discoveredFiles.length} course files found
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => zipInputRef.current?.click()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-[var(--cn-text-primary)] hover:border-[var(--cn-primary)] transition-colors"
                title="Add another ZIP archive to this course"
              >
                <IconPlus size={13} />
                <span>Add More ZIPs</span>
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-[var(--cn-text-primary)] hover:border-[var(--cn-primary)] transition-colors"
                title="Add an extracted course folder"
              >
                <IconPlus size={13} />
                <span>Add Folder</span>
              </button>
            </div>
          </div>

          {/* Archive cards list */}
          <div className="space-y-3">
            {archivesList.map((arch) => (
              <div
                key={arch.id}
                className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] flex items-center justify-between gap-4 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center shrink-0">
                    {arch.type === 'folder' ? <IconFolder size={16} /> : <IconArchive size={16} />}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--cn-text-primary)]">{arch.name}</p>
                    <p className="text-[11px] text-[var(--cn-text-muted)]">
                      {(arch.sizeBytes / 1024 / 1024).toFixed(1)} MB • {arch.filesCount} files detected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[var(--cn-success)] flex items-center gap-1 font-semibold text-[11px]">
                    <IconCheck size={13} />
                    Verified
                  </span>
                  <button
                    onClick={() => handleRemoveArchive(arch)}
                    className="p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] transition-colors"
                    title="Remove this archive"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Storage Destination Selector */}
          <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/40 space-y-2">
            <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5">
              <IconDeviceFloppy size={15} className="text-[var(--cn-primary)]" />
              Storage Destination
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <label
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-colors ${
                  targetStorage === 'internal'
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-surface)] font-semibold text-[var(--cn-text-primary)]'
                    : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'
                }`}
              >
                <input
                  type="radio"
                  name="targetStorage"
                  checked={targetStorage === 'internal'}
                  onChange={() => setTargetStorage('internal')}
                  className="accent-[var(--cn-primary)]"
                />
                <div>
                  <p>Internal App Storage</p>
                  <p className="text-[10px] text-[var(--cn-text-muted)] font-normal">Fast internal disk (Recommended)</p>
                </div>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-colors ${
                  targetStorage === 'external'
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-surface)] font-semibold text-[var(--cn-text-primary)]'
                    : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'
                }`}
              >
                <input
                  type="radio"
                  name="targetStorage"
                  checked={targetStorage === 'external'}
                  onChange={() => setTargetStorage('external')}
                  className="accent-[var(--cn-primary)]"
                />
                <div>
                  <p>Removable USB / SD Card</p>
                  <p className="text-[10px] text-[var(--cn-text-muted)] font-normal truncate max-w-xs">
                    {storageConfig.externalMountPath || 'Removable media slot'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--cn-border)]">
            <button
              onClick={() => {
                setStep('select');
                setAccumulatedZipFiles([]);
                setAccumulatedFolderFiles([]);
                setArchivesList([]);
                setDiscoveredFiles([]);
              }}
              className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Start Over
            </button>

            <button
              onClick={() => setStep('review')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-sm"
            >
              <span>Review Course Structure</span>
              <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROPOSED STRUCTURE REVIEW */}
      {step === 'review' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 space-y-6">
          <div className="border-b border-[var(--cn-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
                Course Structure & Chapter Review
              </h3>
              <p className="text-xs text-[var(--cn-text-secondary)] mt-0.5">
                Check and adjust how your chapters, sections, and lessons are arranged before saving.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => zipInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-mono text-[var(--cn-text-primary)] hover:border-[var(--cn-primary)] transition-colors"
                title="Add another ZIP archive"
              >
                <IconPlus size={13} />
                <span>Add More ZIPs</span>
              </button>
              <button
                onClick={handleAddSection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30 text-xs font-mono font-semibold hover:bg-[var(--cn-primary)] hover:text-white transition-colors"
              >
                <IconPlus size={13} />
                <span>New Section</span>
              </button>
            </div>
          </div>

          {/* Course Metadata Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">Course Title</label>
              <input
                type="text"
                value={courseTitle}
                placeholder="e.g. Modern Web Architecture"
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-semibold text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">Subject / Category</label>
              <input
                type="text"
                value={courseSubject}
                placeholder="e.g. Computer Science"
                onChange={(e) => setCourseSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">Instructor Name</label>
              <input
                type="text"
                value={instructorName}
                placeholder="e.g. Course Instructor"
                onChange={(e) => setInstructorName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">Description</label>
              <input
                type="text"
                value={courseDescription}
                placeholder="Brief course overview"
                onChange={(e) => setCourseDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>
          </div>

          {/* Section & Lesson Review List */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--cn-text-muted)]">
                Sections & Chapters ({proposedSections.length} Sections • {totalApprovedLessons} Lessons)
              </span>
            </div>

            {proposedSections.length === 0 ? (
              <div className="p-8 border border-dashed border-[var(--cn-border)] rounded-xl text-center text-xs text-[var(--cn-text-muted)] space-y-2">
                <p>No sections found in this course.</p>
                <button
                  onClick={handleAddSection}
                  className="px-3 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white font-mono"
                >
                  Create First Section
                </button>
              </div>
            ) : (
              proposedSections.map((sec, sIdx) => (
                <div key={sec.id} className="border border-[var(--cn-border)] rounded-xl p-5 bg-[var(--cn-bg)] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--cn-border)]/60 pb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-mono text-[var(--cn-text-muted)] font-semibold shrink-0">
                        Section {sIdx + 1}:
                      </span>
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => handleRenameSection(sec.id, e.target.value)}
                        className="font-bold text-sm text-[var(--cn-text-primary)] bg-transparent border-b border-dashed border-[var(--cn-border)] hover:border-[var(--cn-primary)] focus:border-[var(--cn-primary)] focus:outline-none px-1 py-0.5 w-full max-w-md"
                      />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleAddLesson(sec.id)}
                        className="flex items-center gap-1 text-[11px] font-mono text-[var(--cn-primary)] hover:underline"
                        title="Add a lesson to this section"
                      >
                        <IconPlus size={13} />
                        <span>Add Lesson</span>
                      </button>
                      <span className="text-[var(--cn-border)]">|</span>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] transition-colors"
                        title="Delete Section"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Lessons */}
                  <div className="space-y-2">
                    {sec.lessons.length === 0 ? (
                      <p className="text-xs text-[var(--cn-text-muted)] italic py-2">
                        No lessons in this section yet. Click "Add Lesson" above.
                      </p>
                    ) : (
                      sec.lessons.map((les) => (
                        <div
                          key={les.id}
                          className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                            les.isApproved
                              ? 'border-[var(--cn-border)] bg-[var(--cn-surface)]'
                              : 'border-dashed border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] opacity-50'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={les.title}
                                onChange={(e) => handleRenameLesson(sec.id, les.id, e.target.value)}
                                className="font-semibold text-[var(--cn-text-primary)] bg-transparent border-b border-dashed border-transparent hover:border-[var(--cn-border)] focus:border-[var(--cn-primary)] focus:outline-none px-1 py-0.5"
                              />
                            </div>

                            {les.files.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--cn-text-muted)] font-mono">
                                {les.files.map((f, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--cn-bg)] border border-[var(--cn-border)]"
                                  >
                                    {f.type === 'video' ? (
                                      <IconVideo size={11} className="text-orange-400" />
                                    ) : f.type === 'document' ? (
                                      <IconFileText size={11} className="text-sky-400" />
                                    ) : f.type === 'code' ? (
                                      <IconCode size={11} className="text-emerald-400" />
                                    ) : (
                                      <IconFileText size={11} className="text-purple-400" />
                                    )}
                                    <span>{f.filename}</span>
                                    {f.sizeBytes > 0 && <span>({(f.sizeBytes / 1024 / 1024).toFixed(1)}MB)</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => toggleLessonApproval(sec.id, les.id)}
                              className={`px-3 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                                les.isApproved
                                  ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/30'
                                  : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'
                              }`}
                            >
                              {les.isApproved ? 'Included' : 'Skipped'}
                            </button>

                            <button
                              onClick={() => handleDeleteLesson(sec.id, les.id)}
                              className="p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] transition-colors"
                              title="Delete Lesson"
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--cn-border)]">
            <button
              onClick={() => setStep(archivesList.length > 0 ? 'inventory' : 'select')}
              className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Back
            </button>
            <button
              onClick={handleFinalImport}
              disabled={proposedSections.length === 0 || totalApprovedLessons === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] disabled:opacity-50 transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-sm"
            >
              <IconChecklist size={16} />
              <span>Save Course to Offline Vault</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING IN PROGRESS */}
      {step === 'importing' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-12 text-center space-y-5">
          <IconLoader2 size={40} className="animate-spin text-[var(--cn-primary)] mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
              Saving Course into Offline Storage...
            </h3>
            <p className="text-xs text-[var(--cn-text-muted)] font-mono">
              {statusMessage || 'Extracting files and registering course modules'}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <div className="w-full bg-[var(--cn-surface-subtle)] h-2 rounded-full overflow-hidden border border-[var(--cn-border)]">
              <div
                className="bg-[var(--cn-primary)] h-full transition-[width] duration-300 ease-out"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-[var(--cn-text-muted)] text-right">
              {importProgress}%
            </p>
          </div>
        </div>
      )}

      {/* STEP 5: IMPORT COMPLETE */}
      {step === 'complete' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[var(--cn-success-tint)] text-[var(--cn-success)] flex items-center justify-center mx-auto border border-[var(--cn-success)]/40 shadow-sm">
            <IconCircleCheck size={28} />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-[var(--cn-text-primary)]">
              Course Added Successfully!
            </h2>
            <p className="text-xs text-[var(--cn-text-secondary)] font-mono">
              {courseTitle} is saved and ready for offline study.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Course Sections:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">{proposedSections.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Approved Lessons:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">{totalApprovedLessons}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Storage Location:</span>
              <span className="font-semibold text-[var(--cn-primary)]">
                {targetStorage === 'external' ? 'Removable Media' : 'Internal Storage'}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            {savedCourseId ? (
              <button
                onClick={() => navigate(`/course/${savedCourseId}`)}
                className="px-6 py-2.5 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-sm"
              >
                Open Course Now
              </button>
            ) : null}
            <button
              onClick={() => navigate('/library')}
              className="px-5 py-2.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-mono font-semibold hover:bg-[var(--cn-surface-subtle)] transition-colors"
            >
              Go to My Courses
            </button>
            <button
              onClick={() => {
                setStep('select');
                setAccumulatedZipFiles([]);
                setAccumulatedFolderFiles([]);
                setArchivesList([]);
                setDiscoveredFiles([]);
                setProposedSections([]);
                setCourseTitle('');
                setInstructorName('');
                setCourseDescription('');
              }}
              className="px-4 py-2.5 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Add Another Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
