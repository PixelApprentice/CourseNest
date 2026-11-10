import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useStorageConfig, setExternalMountPath } from '../../lib/storageConfig';
import { addLog } from '../../lib/logger';
import { ArchivePasswordModal } from '../../components/ArchivePasswordModal';
import { 
  parseCourseArchives, 
  parseCourseFolder,
  commitImportedCourse, 
  type ProposalSection,
  type DiscoveredArchiveFile 
} from '../../lib/zipImporter';
import { transformManifest, getCourseById } from '../../lib/courseStore';
import { coursePasswordManager } from '../../lib/coursePasswordManager';
import { 
  IconArchive, 
  IconFolder,
  IconFolderPlus,
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
  IconChecklist,
  IconArrowUp,
  IconArrowDown,
  IconGripVertical,
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
  IconPencil
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
  const [searchParams] = useSearchParams();
  const appendToCourseId = searchParams.get('courseId') || searchParams.get('appendTo') || null;
  const targetExistingCourse = appendToCourseId ? getCourseById(appendToCourseId) : null;

  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const { config: storageConfig } = useStorageConfig();

  const [step, setStep] = useState<WizardStep>('select');
  const location = useLocation();
  const handledInitialDropRef = useRef(false);
  
  // Accumulated raw uploaded files
  const [accumulatedZipFiles, setAccumulatedZipFiles] = useState<File[]>([]);
  const [accumulatedFolderFiles, setAccumulatedFolderFiles] = useState<File[]>([]);
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  
  const [archivesList, setArchivesList] = useState<ArchiveMeta[]>([]);
  const [discoveredFiles, setDiscoveredFiles] = useState<DiscoveredArchiveFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [importProgress, setImportProgress] = useState(0);

  // Storage Target Selection (syncs with user preference)
  const [targetStorage, setTargetStorage] = useState<'internal' | 'external'>(() => storageConfig.volumeType || 'internal');

  useEffect(() => {
    if (storageConfig.volumeType) {
      setTargetStorage(storageConfig.volumeType);
    }
  }, [storageConfig.volumeType]);

  // Course metadata state
  const [courseTitle, setCourseTitle] = useState(targetExistingCourse?.title || '');
  const [courseSubject, setCourseSubject] = useState(targetExistingCourse?.subject || 'General');
  const [instructorName, setInstructorName] = useState(targetExistingCourse?.instructorName || '');
  const [courseDescription, setCourseDescription] = useState(targetExistingCourse?.description || '');
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'json'>('file');

  // Sync title if target course changes
  useEffect(() => {
    if (targetExistingCourse) {
      setCourseTitle(targetExistingCourse.title);
      setCourseSubject(targetExistingCourse.subject || 'General');
      setInstructorName(targetExistingCourse.instructorName || '');
      setCourseDescription(targetExistingCourse.description || '');
    }
  }, [targetExistingCourse?.id]);

  // Curriculum proposal state
  const [proposedSections, setProposedSections] = useState<ProposalSection[]>([]);
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null);
  const rememberPasswordRef = useRef<{ password: string; remember: boolean } | null>(null);

  // Password Prompt Modal State for Encrypted Archives (Fixes Issue A)
  const [passwordModalState, setPasswordModalState] = useState<{
    isOpen: boolean;
    archiveName: string;
    errorMessage: string | null;
    isLoading: boolean;
    resolve?: (result: { password: string; rememberForCourse: boolean } | null) => void;
  }>({
    isOpen: false,
    archiveName: '',
    errorMessage: null,
    isLoading: false,
  });

  const requestPassword = (
    archiveName: string,
    _attemptCount: number,
    errorMsg?: string
  ): Promise<{ password: string; rememberForCourse: boolean } | null> => {
    return new Promise((resolve) => {
      setPasswordModalState({
        isOpen: true,
        archiveName,
        errorMessage: errorMsg || null,
        isLoading: false,
        resolve: (res) => {
          if (res) {
            rememberPasswordRef.current = { password: res.password, remember: res.rememberForCourse };
          }
          resolve(res);
        },
      });
    });
  };

  // Aggregate and parse all uploaded ZIPs and Folder files
  const reprocessFiles = async (zips: File[], folders: File[]) => {
    setIsProcessing(true);
    setStatusMessage('Analyzing course files and chapter hierarchy...');

    try {
      const allDiscovered: DiscoveredArchiveFile[] = [];
      const metas: ArchiveMeta[] = [];
      let combinedSections: ProposalSection[] = [];
      let detectedTitle = courseTitle;

      const hasZips = zips.length > 0;
      const hasFolders = folders.length > 0;
      const zipWeight = hasZips && hasFolders ? 0.5 : 1.0;
      const folderWeight = hasZips && hasFolders ? 0.5 : 1.0;
      const folderOffset = hasZips && hasFolders ? 50 : 0;

      // 1. Process ZIP archives with real-time monotonic progress
      if (hasZips) {
        setImportProgress(5);
        const zipResult = await parseCourseArchives(
          zips,
          (pct, msg) => {
            setImportProgress(Math.min(hasFolders ? 50 : 100, Math.round(pct * zipWeight)));
            setStatusMessage(msg);
          },
          requestPassword,
          appendToCourseId || undefined,
        );
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

      // 2. Process Folder files (webkitdirectory) with real-time monotonic progress
      if (hasFolders) {
        const folderResult = await parseCourseFolder(folders, (pct, msg) => {
          setImportProgress(Math.min(100, Math.round(folderOffset + pct * folderWeight)));
          setStatusMessage(msg);
        });
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
      setPasswordModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
      if (zipInputRef.current) zipInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Handle files passed via navigation (e.g. dropped onto Library page)
  useEffect(() => {
    if (handledInitialDropRef.current) return;
    const initialFiles = (location.state as any)?.droppedFiles as File[] | undefined;
    if (initialFiles && initialFiles.length > 0) {
      handledInitialDropRef.current = true;
      const zips: File[] = [];
      const others: File[] = [];
      for (const f of initialFiles) {
        const lower = f.name.toLowerCase();
        if (
          lower.endsWith('.zip') ||
          lower.endsWith('.rar') ||
          lower.endsWith('.7z') ||
          lower.endsWith('.7zip') ||
          lower.endsWith('.tar') ||
          lower.endsWith('.tar.gz') ||
          lower.endsWith('.tgz')
        ) {
          zips.push(f);
        } else {
          others.push(f);
        }
      }
      if (zips.length > 0 || others.length > 0) {
        setAccumulatedZipFiles(zips);
        setAccumulatedFolderFiles(others);
        reprocessFiles(zips, others);
      }
    }
  }, [location.state]);

  // Drag and drop handler for anywhere on Step 1 card/area
  const handleGeneralDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPage(false);
    setIsDraggingZip(false);
    setIsDraggingFolder(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const zips: File[] = [];
    const folders: File[] = [];

    for (const f of droppedFiles) {
      const lower = f.name.toLowerCase();
      if (
        lower.endsWith('.zip') ||
        lower.endsWith('.rar') ||
        lower.endsWith('.7z') ||
        lower.endsWith('.7zip') ||
        lower.endsWith('.tar') ||
        lower.endsWith('.tar.gz') ||
        lower.endsWith('.tgz')
      ) {
        zips.push(f);
      } else {
        folders.push(f);
      }
    }

    const existingZipNames = new Set(accumulatedZipFiles.map((f) => f.name));
    const newZips = zips.filter((f) => !existingZipNames.has(f.name));

    const updatedZips = [...accumulatedZipFiles, ...newZips];
    const updatedFolders = [...accumulatedFolderFiles, ...folders];

    if (updatedZips.length === 0 && updatedFolders.length === 0) {
      alert('Please drop valid course archive file(s) (.zip, .rar, .7z, or .tar) or a course folder.');
      return;
    }

    setAccumulatedZipFiles(updatedZips);
    setAccumulatedFolderFiles(updatedFolders);
    await reprocessFiles(updatedZips, updatedFolders);
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

  // Drag and drop handler for ZIP archives
  const handleZipDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingZip(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const archiveFiles = droppedFiles.filter((f) => {
      const lower = f.name.toLowerCase();
      return (
        lower.endsWith('.zip') ||
        lower.endsWith('.rar') ||
        lower.endsWith('.7z') ||
        lower.endsWith('.7zip') ||
        lower.endsWith('.tar') ||
        lower.endsWith('.tar.gz') ||
        lower.endsWith('.tgz')
      );
    });

    if (archiveFiles.length === 0) {
      alert('Please drop valid course archive file(s) (.zip, .rar, .7z, or .tar).');
      return;
    }

    const existingNames = new Set(accumulatedZipFiles.map((f) => f.name));
    const toAdd = archiveFiles.filter((f) => !existingNames.has(f.name));

    if (toAdd.length === 0) {
      alert('Dropped archive(s) are already in the list.');
      return;
    }

    const updatedZips = [...accumulatedZipFiles, ...toAdd];
    setAccumulatedZipFiles(updatedZips);
    await reprocessFiles(updatedZips, accumulatedFolderFiles);
  };

  // Drag and drop handler for unzipped folder
  const handleFolderDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFolder(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const updatedFolders = [...accumulatedFolderFiles, ...droppedFiles];
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

  // Drag and drop state for materials list
  const [draggedArchiveIndex, setDraggedArchiveIndex] = useState<number | null>(null);
  const [dragOverArchiveIndex, setDragOverArchiveIndex] = useState<number | null>(null);

  // Synchronize new materials order with underlying files and proposed sections
  const syncArchiveOrder = (newMetas: ArchiveMeta[]) => {
    setArchivesList(newMetas);

    // Sync accumulated ZIP files order to match user confirmed list (Review Item 18)
    const zipNames = newMetas.filter((m) => m.type === 'zip').map((m) => m.name);
    setAccumulatedZipFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      const reordered: File[] = [];
      for (const name of zipNames) {
        const file = map.get(name);
        if (file) reordered.push(file);
      }
      for (const f of prev) {
        if (!reordered.includes(f)) reordered.push(f);
      }
      return reordered;
    });

    // Sync accumulated Folder files order to match user confirmed list (Review Item 18)
    const folderNames = newMetas.filter((m) => m.type === 'folder').map((m) => m.name);
    setAccumulatedFolderFiles((prev) => {
      const reorderedFolders: File[] = [];
      for (const name of folderNames) {
        const matching = prev.filter((f) => {
          const parts = (f.webkitRelativePath || f.name).split('/');
          return parts[0] === name;
        });
        reorderedFolders.push(...matching);
      }
      for (const f of prev) {
        if (!reorderedFolders.includes(f)) reorderedFolders.push(f);
      }
      return reorderedFolders;
    });

    // Reorder proposed sections based on the new archive sequence
    setProposedSections((prevSections) => {
      if (prevSections.length === 0) return prevSections;

      const metaBaseNames = newMetas.map((m) => m.name.replace(/\.[^/.]+$/, '').toLowerCase());

      const getArchiveIndex = (sec: ProposalSection) => {
        const secArchive = (sec.archiveName || '').toLowerCase();
        const secTitle = sec.title.toLowerCase();
        for (let i = 0; i < metaBaseNames.length; i++) {
          const metaBase = metaBaseNames[i]!;
          if (secArchive && (secArchive === metaBase || secArchive.includes(metaBase) || metaBase.includes(secArchive))) {
            return i;
          }
          if (secTitle && (secTitle.includes(metaBase) || metaBase.includes(secTitle))) {
            return i;
          }
        }
        return 999;
      };

      const sorted = [...prevSections].sort((a, b) => {
        const idxA = getArchiveIndex(a);
        const idxB = getArchiveIndex(b);
        if (idxA !== idxB) return idxA - idxB;
        return a.position - b.position;
      });

      return sorted.map((s, idx) => ({
        ...s,
        position: idx + 1,
      }));
    });
  };

  // Move archive up or down via keyboard/touch button
  const handleMoveArchive = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= archivesList.length) return;
    const copy = [...archivesList];
    const item = copy.splice(index, 1)[0]!;
    copy.splice(targetIndex, 0, item);
    syncArchiveOrder(copy);
  };

  // Sorting handlers for materials list
  const handleSortNatural = () => {
    const sorted = [...archivesList].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    syncArchiveOrder(sorted);
  };

  const handleSortAlphaAsc = () => {
    const sorted = [...archivesList].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: false, sensitivity: 'base' })
    );
    syncArchiveOrder(sorted);
  };

  const handleSortAlphaDesc = () => {
    const sorted = [...archivesList].sort((a, b) =>
      b.name.localeCompare(a.name, undefined, { numeric: false, sensitivity: 'base' })
    );
    syncArchiveOrder(sorted);
  };

  const handleSortSizeAsc = () => {
    const sorted = [...archivesList].sort((a, b) => a.sizeBytes - b.sizeBytes);
    syncArchiveOrder(sorted);
  };

  const handleSortSizeDesc = () => {
    const sorted = [...archivesList].sort((a, b) => b.sizeBytes - a.sizeBytes);
    syncArchiveOrder(sorted);
  };

  // Section Drag & Drop State in Step 3
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);

  const handleSectionDrop = (targetIndex: number) => {
    if (draggedSectionIndex === null || draggedSectionIndex === targetIndex) {
      setDraggedSectionIndex(null);
      setDragOverSectionIndex(null);
      return;
    }
    setProposedSections((prev) => {
      const copy = [...prev];
      const item = copy.splice(draggedSectionIndex, 1)[0]!;
      copy.splice(targetIndex, 0, item);
      return copy.map((sec, idx) => ({ ...sec, position: idx + 1 }));
    });
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  };

  // Lesson Drag & Drop State in Step 3 (reorder within section or across sections)
  const [draggedLesson, setDraggedLesson] = useState<{ secId: string; lessonIndex: number } | null>(null);
  const [dragOverLesson, setDragOverLesson] = useState<{ secId: string; lessonIndex: number } | null>(null);

  const handleLessonDrop = (targetSecId: string, targetLessonIndex: number) => {
    if (!draggedLesson) {
      setDraggedLesson(null);
      setDragOverLesson(null);
      return;
    }

    const { secId: sourceSecId, lessonIndex: sourceLessonIndex } = draggedLesson;

    setProposedSections((prev) => {
      const newSections = prev.map((s) => ({
        ...s,
        lessons: [...s.lessons],
      }));

      const sourceSec = newSections.find((s) => s.id === sourceSecId);
      const targetSec = newSections.find((s) => s.id === targetSecId);

      if (!sourceSec || !targetSec) return prev;

      if (sourceSecId === targetSecId) {
        if (sourceLessonIndex === targetLessonIndex) return prev;
        const lesson = sourceSec.lessons.splice(sourceLessonIndex, 1)[0]!;
        sourceSec.lessons.splice(targetLessonIndex, 0, lesson);
        sourceSec.lessons = sourceSec.lessons.map((l, idx) => ({ ...l, position: idx + 1 }));
      } else {
        const lesson = sourceSec.lessons.splice(sourceLessonIndex, 1)[0]!;
        targetSec.lessons.splice(targetLessonIndex, 0, lesson);
        sourceSec.lessons = sourceSec.lessons.map((l, idx) => ({ ...l, position: idx + 1 }));
        targetSec.lessons = targetSec.lessons.map((l, idx) => ({ ...l, position: idx + 1 }));
      }

      return newSections;
    });

    setDraggedLesson(null);
    setDragOverLesson(null);
  };

  const handleLessonDropOnSection = (targetSecId: string) => {
    if (!draggedLesson) return;
    const { secId: sourceSecId, lessonIndex: sourceLessonIndex } = draggedLesson;
    if (sourceSecId === targetSecId) {
      setDraggedLesson(null);
      setDragOverLesson(null);
      return;
    }

    setProposedSections((prev) => {
      const newSections = prev.map((s) => ({
        ...s,
        lessons: [...s.lessons],
      }));

      const sourceSec = newSections.find((s) => s.id === sourceSecId);
      const targetSec = newSections.find((s) => s.id === targetSecId);

      if (!sourceSec || !targetSec) return prev;

      const lesson = sourceSec.lessons.splice(sourceLessonIndex, 1)[0]!;
      targetSec.lessons.push(lesson);
      sourceSec.lessons = sourceSec.lessons.map((l, idx) => ({ ...l, position: idx + 1 }));
      targetSec.lessons = targetSec.lessons.map((l, idx) => ({ ...l, position: idx + 1 }));

      return newSections;
    });

    setDraggedLesson(null);
    setDragOverLesson(null);
  };

  // Move entire section up or down in Step 3 review
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= proposedSections.length) return;
    setProposedSections((prev) => {
      const copy = [...prev];
      const item = copy.splice(index, 1)[0]!;
      copy.splice(targetIndex, 0, item);
      return copy.map((sec, idx) => ({ ...sec, position: idx + 1 }));
    });
  };

  // Move individual lesson up or down in Step 3 review
  const handleMoveLesson = (secId: string, lessonIndex: number, direction: 'up' | 'down') => {
    setProposedSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
        if (targetIndex < 0 || targetIndex >= sec.lessons.length) return sec;
        const copy = [...sec.lessons];
        const item = copy.splice(lessonIndex, 1)[0]!;
        copy.splice(targetIndex, 0, item);
        return {
          ...sec,
          lessons: copy.map((l, idx) => ({ ...l, position: idx + 1 })),
        };
      })
    );
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

  const handleSelectExternalFolder = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    if (electron?.dialog?.openDirectory) {
      const selected = await electron.dialog.openDirectory();
      if (selected) {
        setExternalMountPath(selected);
        setTargetStorage('external');
      }
    }
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

    const targetCourseId = appendToCourseId || `course-${Date.now()}`;

    try {
      await commitImportedCourse({
        courseId: targetCourseId,
        courseTitle: courseTitle.trim() || targetExistingCourse?.title || 'Course',
        courseSubject: courseSubject.trim() || targetExistingCourse?.subject || 'General',
        instructorName: instructorName.trim() || targetExistingCourse?.instructorName || 'Course Instructor',
        courseDescription: courseDescription.trim() || targetExistingCourse?.description || `Course with ${proposedSections.length} chapter(s).`,
        targetStorage,
        sections: proposedSections,
        appendToCourseId: appendToCourseId || undefined,
        onProgress: (percent, msg) => {
          setImportProgress(percent);
          setStatusMessage(msg);
        },
      });

      setSavedCourseId(targetCourseId);

      // If user provided a password, store in memory and optionally in safeStorage (Fixes Issue A)
      if (rememberPasswordRef.current?.password) {
        coursePasswordManager.setSessionPassword(targetCourseId, rememberPasswordRef.current.password);
        const batchKey = `import-batch-${accumulatedZipFiles.map((f: File) => f.name).sort().join('|')}`;
        coursePasswordManager.aliasCourse(batchKey, targetCourseId);
        if (rememberPasswordRef.current.remember) {
          const electron = (window as any).electron || (window as any).__ELECTRON__;
          if (electron?.storage?.saveCoursePassword) {
            electron.storage.saveCoursePassword(targetCourseId, rememberPasswordRef.current.password).catch?.(() => {});
          }
        }
      }

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
      {/* Existing Course Append Notice */}
      {targetExistingCourse && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--cn-primary-tint)] border border-[var(--cn-primary)]/40 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-bold shrink-0">
              <IconFolderPlus size={18} />
            </div>
            <div>
              <p className="font-bold text-[var(--cn-text-primary)] text-sm">
                Appending Materials to: {targetExistingCourse.title}
              </p>
              <p className="text-[var(--cn-text-muted)] text-[11px] pt-0.5">
                New chapters, slides, code, and videos will merge into your active curriculum. Existing notes and lesson progress are fully preserved.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/import')}
            className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] font-mono text-[11px] transition-colors"
          >
            Switch to New Course
          </button>
        </div>
      )}

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
        accept=".zip,.rar,.7z,.7zip,.tar,.tar.gz,.tgz"
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
        <div 
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingPage(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) {
              setIsDraggingPage(false);
            }
          }}
          onDrop={handleGeneralDrop}
          className={`border rounded-2xl bg-[var(--cn-surface)] p-8 text-center space-y-6 relative transition-all duration-150 ${
            isDraggingPage
              ? 'border-[var(--cn-primary)] ring-4 ring-[var(--cn-primary)]/20 shadow-xl'
              : 'border-[var(--cn-border)]'
          }`}
        >
          {isDraggingPage && (
            <div className="absolute inset-0 z-20 rounded-2xl bg-[var(--cn-surface)]/95 backdrop-blur-sm border-2 border-dashed border-[var(--cn-primary)] flex flex-col items-center justify-center p-8 space-y-3 pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center animate-bounce">
                <IconArchive size={32} />
              </div>
              <h3 className="text-lg font-bold text-[var(--cn-text-primary)]">
                Drop Course Archive(s) or Folder Anywhere Here
              </h3>
              <p className="text-xs font-mono text-[var(--cn-text-muted)]">
                Release files to start inspecting and extracting materials automatically.
              </p>
            </div>
          )}
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
            <div className="py-12 text-center space-y-5 max-w-md mx-auto">
              <IconLoader2 size={36} className="animate-spin text-[var(--cn-primary)] mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                  Inspecting Course Materials...
                </h3>
                <p className="text-xs text-[var(--cn-text-secondary)] font-mono">
                  {statusMessage || 'Reading directory structure and detecting chapters...'}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-[var(--cn-surface-subtle)] h-2.5 rounded-full overflow-hidden border border-[var(--cn-border)]">
                  <div
                    className="bg-[var(--cn-primary)] h-full transition-[width] duration-150 ease-out"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-[11px] font-mono text-[var(--cn-text-muted)] text-right">
                  {importProgress}%
                </p>
              </div>
            </div>
          ) : importMode === 'file' ? (
            /* Upload Action Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Option 1: ZIP Archive(s) */}
              <div
                onClick={() => zipInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingZip(true);
                }}
                onDragLeave={() => setIsDraggingZip(false)}
                onDrop={handleZipDrop}
                className={`border-2 border-dashed rounded-2xl p-8 transition-[border-color,background-color,transform] duration-150 ease-out cursor-pointer space-y-3 text-center group ${
                  isDraggingZip
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/25 scale-[1.02] shadow-md'
                    : 'border-[var(--cn-border)] hover:border-[var(--cn-primary)] bg-[var(--cn-bg)]'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <IconArchive size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[var(--cn-text-primary)]">
                    {isDraggingZip ? 'Drop Archives Here' : 'Add Archive(s) (.zip, .rar, .7z, .7zip)'}
                  </p>
                  <p className="text-xs text-[var(--cn-text-muted)] font-mono leading-relaxed">
                    Click to select or drag & drop multiple archives. Decompresses in queue safely.
                  </p>
                </div>
              </div>

              {/* Option 2: Extracted Folder */}
              <div
                onClick={() => folderInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFolder(true);
                }}
                onDragLeave={() => setIsDraggingFolder(false)}
                onDrop={handleFolderDrop}
                className={`border-2 border-dashed rounded-2xl p-8 transition-[border-color,background-color,transform] duration-150 ease-out cursor-pointer space-y-3 text-center group ${
                  isDraggingFolder
                    ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/25 scale-[1.02] shadow-md'
                    : 'border-[var(--cn-border)] hover:border-[var(--cn-primary)] bg-[var(--cn-bg)]'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <IconFolder size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[var(--cn-text-primary)]">
                    {isDraggingFolder ? 'Drop Folder Files Here' : 'Add Course Folder'}
                  </p>
                  <p className="text-xs text-[var(--cn-text-muted)] font-mono leading-relaxed">
                    Select or drop an unzipped folder containing lectures, videos, and reading materials.
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

          {/* Real-time queue progress indicator if user is adding additional archives */}
          {isProcessing && (
            <div className="p-4 rounded-xl border border-[var(--cn-primary)]/40 bg-[var(--cn-primary-tint)]/20 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-2 text-[var(--cn-primary)] font-semibold">
                  <IconLoader2 size={16} className="animate-spin" />
                  Decompressing archive queue...
                </span>
                <span className="text-[var(--cn-text-muted)] font-bold">{importProgress}%</span>
              </div>
              <p className="text-[11px] font-mono text-[var(--cn-text-secondary)] truncate">
                {statusMessage}
              </p>
              <div className="w-full bg-[var(--cn-surface)] h-2 rounded-full overflow-hidden border border-[var(--cn-border)]">
                <div
                  className="bg-[var(--cn-primary)] h-full transition-[width] duration-150 ease-out"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Sorting & Filter Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-xl bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)] text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[var(--cn-text-secondary)] font-semibold">
              <IconArrowsSort size={15} className="text-[var(--cn-primary)]" />
              <span>Sort & Order Materials:</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSortNatural}
                title="Natural numeric sort (Part 2 before Part 10)"
                className="px-2.5 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] hover:bg-[var(--cn-surface)] hover:border-[var(--cn-primary)] text-[var(--cn-text-primary)] transition-colors flex items-center gap-1 font-semibold"
              >
                <span>Natural (1, 2, 10)</span>
              </button>
              <button
                type="button"
                onClick={handleSortAlphaAsc}
                title="Sort Alphabetical A to Z"
                className="px-2.5 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] hover:bg-[var(--cn-surface)] hover:border-[var(--cn-primary)] text-[var(--cn-text-primary)] transition-colors flex items-center gap-1"
              >
                <IconSortAscending size={13} />
                <span>A → Z</span>
              </button>
              <button
                type="button"
                onClick={handleSortAlphaDesc}
                title="Sort Alphabetical Z to A"
                className="px-2.5 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] hover:bg-[var(--cn-surface)] hover:border-[var(--cn-primary)] text-[var(--cn-text-primary)] transition-colors flex items-center gap-1"
              >
                <IconSortDescending size={13} />
                <span>Z → A</span>
              </button>
              <button
                type="button"
                onClick={handleSortSizeAsc}
                title="Sort by file size, smallest first"
                className="px-2.5 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] hover:bg-[var(--cn-surface)] hover:border-[var(--cn-primary)] text-[var(--cn-text-primary)] transition-colors"
              >
                <span>Size (Smallest)</span>
              </button>
              <button
                type="button"
                onClick={handleSortSizeDesc}
                title="Sort by file size, largest first"
                className="px-2.5 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] hover:bg-[var(--cn-surface)] hover:border-[var(--cn-primary)] text-[var(--cn-text-primary)] transition-colors"
              >
                <span>Size (Largest)</span>
              </button>
            </div>
          </div>

          {/* Archive cards list with Drag-and-Drop and Accessible Up/Down Buttons */}
          <div className="space-y-3">
            {archivesList.map((arch, index) => {
              const isDragging = draggedArchiveIndex === index;
              const isDragOver = dragOverArchiveIndex === index;

              return (
                <div
                  key={arch.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                    setDraggedArchiveIndex(index);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverArchiveIndex !== index) {
                      setDragOverArchiveIndex(index);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedArchiveIndex !== null && draggedArchiveIndex !== index) {
                      const copy = [...archivesList];
                      const item = copy.splice(draggedArchiveIndex, 1)[0]!;
                      copy.splice(index, 0, item);
                      syncArchiveOrder(copy);
                    }
                    setDraggedArchiveIndex(null);
                    setDragOverArchiveIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedArchiveIndex(null);
                    setDragOverArchiveIndex(null);
                  }}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs font-mono transition-all duration-150 select-none ${
                    isDragging
                      ? 'opacity-40 scale-[0.98] border-[var(--cn-primary)]'
                      : isDragOver
                      ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/25 shadow-md ring-2 ring-[var(--cn-primary)]/40'
                      : 'border-[var(--cn-border)] bg-[var(--cn-bg)] hover:border-[var(--cn-primary)]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Drag Handle & Position Index */}
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] shrink-0 flex items-center gap-1.5"
                      title="Drag to reorder"
                    >
                      <IconGripVertical size={16} />
                      <span className="w-5 text-center font-bold text-[var(--cn-text-muted)] text-[11px]">
                        {index + 1}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center shrink-0">
                      {arch.type === 'folder' ? <IconFolder size={16} /> : <IconArchive size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--cn-text-primary)] truncate">{arch.name}</p>
                      <p className="text-[11px] text-[var(--cn-text-muted)]">
                        {(arch.sizeBytes / 1024 / 1024).toFixed(1)} MB • {arch.filesCount} files detected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Tactile / Keyboard Accessible Move Buttons */}
                    <div className="flex items-center border border-[var(--cn-border)] rounded-lg overflow-hidden bg-[var(--cn-surface)]">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveArchive(index, 'up')}
                        aria-label={`Move ${arch.name} up`}
                        title="Move up"
                        className="p-1.5 text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                      >
                        <IconArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === archivesList.length - 1}
                        onClick={() => handleMoveArchive(index, 'down')}
                        aria-label={`Move ${arch.name} down`}
                        title="Move down"
                        className="p-1.5 text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] disabled:opacity-25 disabled:hover:bg-transparent transition-colors border-l border-[var(--cn-border)]"
                      >
                        <IconArrowDown size={14} />
                      </button>
                    </div>

                    <span className="text-[var(--cn-success)] flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded bg-[var(--cn-success-tint)]">
                      <IconCheck size={12} />
                      Verified
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveArchive(arch)}
                      className="p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] hover:bg-[var(--cn-danger-tint)] transition-colors"
                      title="Remove this archive"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
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
                <div className="flex-1 min-w-0">
                  <p>Removable USB / SD Card</p>
                  <p className="text-[10px] text-[var(--cn-text-muted)] font-normal truncate max-w-xs">
                    {storageConfig.externalMountPath || 'Removable media slot'}
                  </p>
                  <button
                    type="button"
                    onClick={handleSelectExternalFolder}
                    className="mt-1 px-2 py-0.5 rounded text-[10px] font-mono border border-[var(--cn-primary)]/40 bg-[var(--cn-primary-tint)]/40 text-[var(--cn-primary)] hover:bg-[var(--cn-primary-tint)] transition-colors inline-block"
                  >
                    Select Folder on External Drive...
                  </button>
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
              className="cn-btn cn-btn-md cn-btn-secondary"
            >
              Start Over
            </button>

            <button
              onClick={() => setStep('review')}
              className="cn-btn cn-btn-md cn-btn-primary"
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
              proposedSections.map((sec, sIdx) => {
                const isSectionDragging = draggedSectionIndex === sIdx;
                const isSectionDragOver = dragOverSectionIndex === sIdx;

                return (
                  <div
                    key={sec.id}
                    draggable
                    onDragStart={(e) => {
                      if (draggedLesson) return;
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(sIdx));
                      setDraggedSectionIndex(sIdx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedLesson) return;
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverSectionIndex !== sIdx) {
                        setDragOverSectionIndex(sIdx);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedLesson) {
                        handleLessonDropOnSection(sec.id);
                        return;
                      }
                      handleSectionDrop(sIdx);
                    }}
                    onDragEnd={() => {
                      setDraggedSectionIndex(null);
                      setDragOverSectionIndex(null);
                    }}
                    className={`border rounded-xl p-5 bg-[var(--cn-bg)] space-y-3 transition-all duration-150 ${
                      isSectionDragging
                        ? 'opacity-40 scale-[0.99] border-[var(--cn-primary)] ring-2 ring-[var(--cn-primary)]/40'
                        : isSectionDragOver
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/25 shadow-md ring-2 ring-[var(--cn-primary)]/40'
                        : 'border-[var(--cn-border)]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--cn-border)]/60 pb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Section Drag Grip Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing p-1.5 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] shrink-0 flex items-center justify-center rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] hover:bg-[var(--cn-surface-subtle)]"
                          title="Drag to reorder Section"
                        >
                          <IconGripVertical size={14} />
                        </div>

                        {/* Section Move Up / Down Buttons */}
                        <div className="flex items-center border border-[var(--cn-border)] rounded-lg overflow-hidden bg-[var(--cn-surface)] shrink-0">
                          <button
                            type="button"
                            disabled={sIdx === 0}
                            onClick={() => handleMoveSection(sIdx, 'up')}
                            aria-label={`Move section ${sec.title} up`}
                            title="Move section up"
                            className="p-1.5 text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                          >
                            <IconArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={sIdx === proposedSections.length - 1}
                            onClick={() => handleMoveSection(sIdx, 'down')}
                            aria-label={`Move section ${sec.title} down`}
                            title="Move section down"
                            className="p-1.5 text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] disabled:opacity-25 disabled:hover:bg-transparent transition-colors border-l border-[var(--cn-border)]"
                          >
                            <IconArrowDown size={13} />
                          </button>
                        </div>

                        <span className="text-xs font-mono text-[var(--cn-text-muted)] font-semibold shrink-0">
                          Section {sIdx + 1}:
                        </span>
                        <div className="relative flex-1 max-w-md flex items-center">
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) => handleRenameSection(sec.id, e.target.value)}
                            aria-label={`Edit title for Section ${sIdx + 1}`}
                            className="font-bold text-sm text-[var(--cn-text-primary)] bg-[var(--cn-surface)] border border-[var(--cn-border)] hover:border-[var(--cn-primary)] focus:border-[var(--cn-primary)] rounded-lg focus:outline-none px-2.5 py-1 w-full pr-7"
                          />
                          <IconPencil size={13} className="text-[var(--cn-text-muted)] absolute right-2.5 pointer-events-none" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
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

                    {/* Lessons Container (Accepts dropped lessons from other sections) */}
                    <div
                      onDragOver={(e) => {
                        if (draggedLesson && draggedLesson.secId !== sec.id) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }
                      }}
                      onDrop={(e) => {
                        if (draggedLesson && draggedLesson.secId !== sec.id) {
                          e.preventDefault();
                          handleLessonDropOnSection(sec.id);
                        }
                      }}
                      className="space-y-2"
                    >
                      {sec.lessons.length === 0 ? (
                        <div
                          onDragOver={(e) => {
                            if (draggedLesson) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }
                          }}
                          onDrop={(e) => {
                            if (draggedLesson) {
                              e.preventDefault();
                              handleLessonDropOnSection(sec.id);
                            }
                          }}
                          className="p-4 border border-dashed border-[var(--cn-border)] rounded-lg text-center text-xs text-[var(--cn-text-muted)] italic"
                        >
                          No lessons in this section yet. Drag lessons here or click "Add Lesson" above.
                        </div>
                      ) : (
                        sec.lessons.map((les, lIdx) => {
                          const isLessonDragging = draggedLesson?.secId === sec.id && draggedLesson?.lessonIndex === lIdx;
                          const isLessonDragOver = dragOverLesson?.secId === sec.id && dragOverLesson?.lessonIndex === lIdx;

                          return (
                            <div
                              key={les.id}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('application/coursenest-lesson', JSON.stringify({ secId: sec.id, lessonIndex: lIdx }));
                                setDraggedLesson({ secId: sec.id, lessonIndex: lIdx });
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverLesson?.secId !== sec.id || dragOverLesson?.lessonIndex !== lIdx) {
                                  setDragOverLesson({ secId: sec.id, lessonIndex: lIdx });
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleLessonDrop(sec.id, lIdx);
                              }}
                              onDragEnd={(e) => {
                                e.stopPropagation();
                                setDraggedLesson(null);
                                setDragOverLesson(null);
                              }}
                              className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all duration-150 select-none ${
                                isLessonDragging
                                  ? 'opacity-40 scale-[0.99] border-[var(--cn-primary)]'
                                  : isLessonDragOver
                                  ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/25 shadow-sm ring-2 ring-[var(--cn-primary)]/40'
                                  : les.isApproved
                                  ? 'border-[var(--cn-border)] bg-[var(--cn-surface)] hover:border-[var(--cn-border-highlight)]'
                                  : 'border-dashed border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] opacity-50'
                              }`}
                            >
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {/* Lesson Drag Grip Handle */}
                                  <div
                                    className="cursor-grab active:cursor-grabbing p-1 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] shrink-0 flex items-center justify-center rounded border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] hover:bg-[var(--cn-surface)]"
                                    title="Drag to reorder lesson (within or across sections)"
                                  >
                                    <IconGripVertical size={13} />
                                  </div>

                                  {/* Lesson Move Up / Down Buttons */}
                                  <div className="flex items-center border border-[var(--cn-border)] rounded-md overflow-hidden bg-[var(--cn-surface-subtle)] shrink-0">
                                    <button
                                      type="button"
                                      disabled={lIdx === 0}
                                      onClick={() => handleMoveLesson(sec.id, lIdx, 'up')}
                                      aria-label={`Move lesson ${les.title} up`}
                                      title="Move lesson up"
                                      className="p-1 text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface)] disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                                    >
                                      <IconArrowUp size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={lIdx === sec.lessons.length - 1}
                                      onClick={() => handleMoveLesson(sec.id, lIdx, 'down')}
                                      aria-label={`Move lesson ${les.title} down`}
                                      title="Move lesson down"
                                      className="p-1 text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface)] disabled:opacity-25 disabled:hover:bg-transparent transition-colors border-l border-[var(--cn-border)]"
                                    >
                                      <IconArrowDown size={11} />
                                    </button>
                                  </div>

                                  <div className="relative flex-1 max-w-sm flex items-center">
                                    <input
                                      type="text"
                                      value={les.title}
                                      onChange={(e) => handleRenameLesson(sec.id, les.id, e.target.value)}
                                      aria-label={`Edit title for lesson ${lIdx + 1}`}
                                      className="font-semibold text-[var(--cn-text-primary)] bg-[var(--cn-bg)] border border-[var(--cn-border)] hover:border-[var(--cn-primary)] focus:border-[var(--cn-primary)] rounded px-2 py-0.5 w-full pr-6 text-xs focus:outline-none"
                                    />
                                    <IconPencil size={11} className="text-[var(--cn-text-muted)] absolute right-1.5 pointer-events-none" />
                                  </div>
                                </div>

                                {les.files.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--cn-text-muted)] font-mono pl-6">
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
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--cn-border)]">
            <button
              onClick={() => setStep(archivesList.length > 0 ? 'inventory' : 'select')}
              className="cn-btn cn-btn-md cn-btn-secondary"
            >
              Back
            </button>
            <button
              onClick={handleFinalImport}
              disabled={proposedSections.length === 0 || totalApprovedLessons === 0}
              className="cn-btn cn-btn-lg cn-btn-primary"
            >
              <IconChecklist size={16} />
              <span>Save Course to Offline Vault</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING IN PROGRESS */}
      {step === 'importing' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-10 md:p-12 text-center space-y-6">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-[var(--cn-surface-subtle)] border-t-[var(--cn-primary)] animate-spin" />
            <IconDeviceFloppy size={24} className="text-[var(--cn-primary)] absolute" />
          </div>

          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
              Saving Course into Offline Storage
            </h3>
            <p className="text-xs text-[var(--cn-text-secondary)] font-mono">
              {statusMessage || 'Extracting files and registering course modules'}
            </p>
          </div>

          {/* Stepped Progress Stages Indicator */}
          <div className="max-w-md mx-auto grid grid-cols-4 gap-2 text-[10px] font-mono">
            <div className={`p-1.5 rounded border text-center transition-colors ${importProgress >= 5 ? 'bg-[var(--cn-primary-tint)] border-[var(--cn-primary)]/40 text-[var(--cn-primary)] font-bold' : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'}`}>
              1. Scanning
            </div>
            <div className={`p-1.5 rounded border text-center transition-colors ${importProgress >= 20 ? 'bg-[var(--cn-primary-tint)] border-[var(--cn-primary)]/40 text-[var(--cn-primary)] font-bold' : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'}`}>
              2. Extracting
            </div>
            <div className={`p-1.5 rounded border text-center transition-colors ${importProgress >= 80 ? 'bg-[var(--cn-primary-tint)] border-[var(--cn-primary)]/40 text-[var(--cn-primary)] font-bold' : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'}`}>
              3. Subtitles
            </div>
            <div className={`p-1.5 rounded border text-center transition-colors ${importProgress >= 95 ? 'bg-[var(--cn-primary-tint)] border-[var(--cn-primary)]/40 text-[var(--cn-primary)] font-bold' : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'}`}>
              4. Indexing
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <div className="w-full bg-[var(--cn-surface-subtle)] h-2.5 rounded-full overflow-hidden border border-[var(--cn-border)]">
              <div
                className="bg-[var(--cn-primary)] h-full transition-[width] duration-200 ease-out"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--cn-text-muted)]">
              <span>{importProgress < 100 ? 'Writing to local vault...' : 'Complete!'}</span>
              <span className="font-bold text-[var(--cn-text-primary)]">{importProgress}%</span>
            </div>
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
                className="cn-btn cn-btn-lg cn-btn-primary"
              >
                Open Course Now
              </button>
            ) : null}
            <button
              onClick={() => navigate('/library')}
              className="cn-btn cn-btn-md cn-btn-secondary"
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
              className="cn-btn cn-btn-md cn-btn-ghost"
            >
              Add Another Course
            </button>
          </div>
        </div>
      )}

      {/* In-app Decryption Dialog for Encrypted Archives */}
      <ArchivePasswordModal
        isOpen={passwordModalState.isOpen}
        archiveName={passwordModalState.archiveName}
        errorMessage={passwordModalState.errorMessage}
        isLoading={passwordModalState.isLoading}
        onSubmit={(password, rememberForCourse) => {
          setPasswordModalState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));
          passwordModalState.resolve?.({ password, rememberForCourse });
        }}
        onCancel={() => {
          setPasswordModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          passwordModalState.resolve?.(null);
        }}
      />
    </div>
  );
}
