import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IconPlus, 
  IconTrash, 
  IconDeviceFloppy, 
  IconBrandYoutube, 
  IconFileText, 
  IconCode, 
  IconPresentation, 
  IconVideo, 
  IconDownload, 
  IconSparkles, 
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconUser,
  IconTag,
  IconFolderPlus,
  IconBooks,
  IconPhoto,
  IconUpload,
  IconWand
} from '@tabler/icons-react';
import { 
  addCourseToVault, 
  type CourseData, 
  type SectionData, 
  type ContentBlockData 
} from '../../lib/courseStore';
import { getYouTubeThumbnailUrl } from '../../lib/youtubeHelper';
import { addLog } from '../../lib/logger';
import { APP_VERSION } from '@coursenest/config';

interface DraftLesson {
  id: string;
  title: string;
  description: string;
  estimatedDurationMinutes: number;
  contentType: 'youtube' | 'local_file' | 'cloud_stream' | 'pptx' | 'rich_text' | 'code';
  youtubeUrl: string;
  cloudStreamUrl: string;
  localFilename: string;
  localFileSizeBytes: number;
  richTextContent: string;
  codeSnippet: string;
  codeLanguage: string;
  speakerNotes: string;
}

interface DraftSection {
  id: string;
  title: string;
  description: string;
  lessons: DraftLesson[];
}

const PRESET_COVERS = [
  { id: 'obsidian', label: 'Obsidian Emerald', color: '#164E63' },
  { id: 'halal', label: 'Mosque Minaret', color: '#064E3B' },
  { id: 'sakura', label: 'Sakura Petal', color: '#831843' },
  { id: 'toybox', label: 'Toybox Playful', color: '#7C2D12' },
  { id: 'mecha', label: 'Neo-Tokyo Cyber', color: '#312E81' },
  { id: 'ghibli', label: 'Ghibli Meadow', color: '#14532D' },
];

export function CourseStudioPage() {
  const navigate = useNavigate();

  // Course Profile State
  const [courseTitle, setCourseTitle] = useState('My Custom Masterclass');
  const [subject, setSubject] = useState('Computer Science');
  const [instructorName, setInstructorName] = useState('Professor Bonsen');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [description, setDescription] = useState('A hands-on curriculum built with custom video lectures, slide decks, and code exercises.');
  const [tagsInput, setTagsInput] = useState('Systems, Distributed, Performance');
  const [selectedCover, setSelectedCover] = useState('obsidian');

  // Course Cover / Title Image State
  const [customCoverImage, setCustomCoverImage] = useState<string>('');
  const [coverUrlInput, setCoverUrlInput] = useState<string>('');
  const [isGeneratingTitleCard, setIsGeneratingTitleCard] = useState<boolean>(false);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-generate title card graphic on HTML5 Canvas
  const handleGenerateTitleImage = () => {
    setIsGeneratingTitleCard(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coverObj = PRESET_COVERS.find((c) => c.id === selectedCover) || PRESET_COVERS[0]!;
      
      // 1. Sleek Background gradient
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#090B0E');
      grad.addColorStop(0.5, '#121620');
      grad.addColorStop(1, '#080A0D');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Accent color glow
      const radial = ctx.createRadialGradient(960, 220, 20, 960, 220, 600);
      radial.addColorStop(0, `${coverObj.color}35`);
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, 1280, 720);

      // Geometric grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < 1280; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      // 2. Subject Badge
      ctx.fillStyle = coverObj.color;
      const badgeText = (subject || 'COURSE').toUpperCase();
      ctx.font = 'bold 18px sans-serif';
      const badgeWidth = Math.max(160, ctx.measureText(badgeText).width + 36);
      ctx.beginPath();
      ctx.roundRect(80, 100, badgeWidth, 42, 10);
      ctx.fill();

      ctx.fillStyle = '#050709';
      ctx.fillText(badgeText, 98, 127);

      // 3. Course Title (Word-wrapped)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 54px sans-serif';
      const words = (courseTitle || 'Masterclass Title').split(' ');
      let line = '';
      let y = 240;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 920 && n > 0) {
          ctx.fillText(line.trim(), 80, y);
          line = words[n] + ' ';
          y += 68;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 80, y);

      // 4. Instructor & Meta
      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px sans-serif';
      ctx.fillText(`Instructor: ${instructorName || 'Course Author'} • ${difficulty} Level`, 80, Math.min(y + 80, 560));

      // 5. CourseNest Offline Logo Stamp
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('COURSENEST MASTERCLASS • PRIVATE OFFLINE VAULT', 80, 640);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCustomCoverImage(dataUrl);
    } catch (e) {
      console.error('Failed to generate title image:', e);
    } finally {
      setIsGeneratingTitleCard(false);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCustomCoverImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrlImage = () => {
    if (coverUrlInput.trim()) {
      setCustomCoverImage(coverUrlInput.trim());
      setCoverUrlInput('');
    }
  };

  // Curriculum Sections State
  const [sections, setSections] = useState<DraftSection[]>([
    {
      id: `sec-${Date.now()}-1`,
      title: 'Module 1: Foundations & Architecture',
      description: 'Core principles and fundamental theory',
      lessons: [
        {
          id: `les-${Date.now()}-1`,
          title: '1.1 Course Orientation & Systems Overview',
          description: 'Welcome and executive summary of key objectives',
          estimatedDurationMinutes: 20,
          contentType: 'youtube',
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          cloudStreamUrl: '',
          localFilename: '',
          localFileSizeBytes: 0,
          richTextContent: 'Welcome to this curriculum. Please review the prerequisites before proceeding to the laboratory assignments.',
          codeSnippet: '// Course initialization contract\nexport function initializeModule() {\n  console.log("Ready");\n}',
          codeLanguage: 'typescript',
          speakerNotes: 'Remind students to join the discussion forum and download offline assets.'
        }
      ]
    }
  ]);

  const [isSaved, setIsSaved] = useState(false);

  // Auto-scan curriculum lessons to detect available title cover images (e.g. YouTube thumbnails or presentations)
  const detectedLessonsWithThumbnails = sections.flatMap((sec) =>
    sec.lessons
      .filter((l) => (l.contentType === 'youtube' && l.youtubeUrl) || l.contentType === 'pptx')
      .map((l) => ({
        lessonId: l.id,
        lessonTitle: l.title,
        contentType: l.contentType,
        thumbnailUrl: l.contentType === 'youtube' ? getYouTubeThumbnailUrl(l.youtubeUrl) : null,
      }))
  );
  const firstDetectedThumbnail = detectedLessonsWithThumbnails.find((d) => d.thumbnailUrl);

  const handleApplyDetectedThumbnail = (thumbUrl: string) => {
    setCustomCoverImage(thumbUrl);
  };

  // Add Section
  const handleAddSection = () => {
    const newSec: DraftSection = {
      id: `sec-${Date.now()}`,
      title: `Module ${sections.length + 1}: Advanced Topics`,
      description: 'In-depth exploration and exercises',
      lessons: [
        {
          id: `les-${Date.now()}`,
          title: `${sections.length + 1}.1 New Lecture`,
          description: '',
          estimatedDurationMinutes: 30,
          contentType: 'youtube',
          youtubeUrl: '',
          cloudStreamUrl: '',
          localFilename: '',
          localFileSizeBytes: 0,
          richTextContent: '',
          codeSnippet: '',
          codeLanguage: 'typescript',
          speakerNotes: ''
        }
      ]
    };
    setSections([...sections, newSec]);
  };

  // Remove Section
  const handleRemoveSection = (secIndex: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== secIndex));
  };

  // Add Lesson
  const handleAddLesson = (secIndex: number) => {
    const updated = [...sections];
    const targetSec = updated[secIndex]!;
    const newLesson: DraftLesson = {
      id: `les-${Date.now()}`,
      title: `${secIndex + 1}.${targetSec.lessons.length + 1} Lecture Unit`,
      description: '',
      estimatedDurationMinutes: 25,
      contentType: 'youtube',
      youtubeUrl: '',
      cloudStreamUrl: '',
      localFilename: '',
      localFileSizeBytes: 0,
      richTextContent: '',
      codeSnippet: '',
      codeLanguage: 'typescript',
      speakerNotes: ''
    };
    targetSec.lessons.push(newLesson);
    setSections(updated);
  };

  // Remove Lesson
  const handleRemoveLesson = (secIndex: number, lesIndex: number) => {
    const updated = [...sections];
    const targetSec = updated[secIndex]!;
    if (targetSec.lessons.length <= 1) return;
    targetSec.lessons = targetSec.lessons.filter((_, i) => i !== lesIndex);
    setSections(updated);
  };

  // Update Section Title
  const handleUpdateSectionTitle = (secIndex: number, title: string) => {
    const updated = [...sections];
    updated[secIndex]!.title = title;
    setSections(updated);
  };

  // Update Lesson Field
  const handleUpdateLesson = <K extends keyof DraftLesson>(
    secIndex: number,
    lesIndex: number,
    field: K,
    value: DraftLesson[K]
  ) => {
    const updated = [...sections];
    const sec = updated[secIndex];
    if (!sec) return;
    const les = sec.lessons[lesIndex];
    if (!les) return;
    les[field] = value;
    setSections(updated);
  };

  // Template Scaffolding
  const handleApplyTemplate = (type: 'bootcamp' | 'semester' | 'youtube') => {
    if (type === 'youtube') {
      setCourseTitle('YouTube Web Engineering Masterclass');
      setSubject('Software Engineering');
      setSections([
        {
          id: `sec-${Date.now()}-1`,
          title: 'Module 1: JavaScript Engine Fundamentals',
          description: 'V8 internals, event loop, and garbage collection',
          lessons: [
            {
              id: `les-${Date.now()}-1`,
              title: '1.1 Understanding the V8 Event Loop',
              description: 'Microtasks vs Macrotasks execution sequence',
              estimatedDurationMinutes: 25,
              contentType: 'youtube',
              youtubeUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ',
              cloudStreamUrl: '',
              localFilename: '',
              localFileSizeBytes: 0,
              richTextContent: 'The JavaScript runtime uses a single-threaded event loop paired with browser Web APIs.',
              codeSnippet: 'console.log("Start");\nsetTimeout(() => console.log("Timeout"), 0);\nPromise.resolve().then(() => console.log("Promise"));\nconsole.log("End");',
              codeLanguage: 'javascript',
              speakerNotes: 'Walk students through execution order: Start -> End -> Promise -> Timeout'
            },
            {
              id: `les-${Date.now()}-2`,
              title: '1.2 Architecture Presentation Slides (.pptx)',
              description: 'Slide deck review of memory layouts',
              estimatedDurationMinutes: 15,
              contentType: 'pptx',
              youtubeUrl: '',
              cloudStreamUrl: '',
              localFilename: 'V8_Engine_Architecture_Slides.pptx',
              localFileSizeBytes: 3400000,
              richTextContent: '',
              codeSnippet: '',
              codeLanguage: 'typescript',
              speakerNotes: 'Open slide deck in the built-in presentation viewer.'
            }
          ]
        }
      ]);
    } else if (type === 'bootcamp') {
      setCourseTitle('FastAPI & High-Concurrency Python Bootcamp');
      setSubject('Backend Development');
      setSections([
        {
          id: `sec-${Date.now()}-1`,
          title: 'Module 1: Async I/O Foundations',
          description: 'Coroutines, event loops, and non-blocking sockets',
          lessons: [
            {
              id: `les-${Date.now()}-1`,
              title: '1.1 Python Asyncio Architecture',
              description: 'Async/await syntax and task management',
              estimatedDurationMinutes: 30,
              contentType: 'rich_text',
              youtubeUrl: '',
              cloudStreamUrl: '',
              localFilename: '',
              localFileSizeBytes: 0,
              richTextContent: 'Python asyncio enables writing concurrent code using async/await syntax over non-blocking event loops.',
              codeSnippet: 'import asyncio\n\nasync def fetch_data():\n    await asyncio.sleep(1)\n    return {"status": "ok"}',
              codeLanguage: 'python',
              speakerNotes: 'Emphasize that CPU-bound operations require ProcessPoolExecutor.'
            }
          ]
        }
      ]);
    }
  };

  // Save to Local Vault
  const handleSaveToVault = () => {
    if (!courseTitle.trim()) {
      alert('Please enter a course title before publishing.');
      return;
    }
    const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
    if (totalLessons === 0) {
      alert('Please add at least one lesson before publishing to the vault.');
      return;
    }

    const courseId = `custom-course-${Date.now()}`;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    const transformedSections: SectionData[] = sections.map((s, sIdx) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      position: sIdx + 1,
      estimatedDurationMinutes: s.lessons.reduce((acc, l) => acc + l.estimatedDurationMinutes, 0),
      lessons: s.lessons.map((l, lIdx) => {
        const blocks: ContentBlockData[] = [];

        // 1. Video or YouTube or Cloud Block
        if (l.contentType === 'youtube' && l.youtubeUrl) {
          blocks.push({
            id: `blk-yt-${l.id}`,
            type: 'video',
            position: 1,
            title: `${l.title} (YouTube)`,
            src: l.youtubeUrl,
            durationSeconds: l.estimatedDurationMinutes * 60,
          });
        } else if (l.contentType === 'cloud_stream' && l.cloudStreamUrl) {
          blocks.push({
            id: `blk-cloud-${l.id}`,
            type: 'video',
            position: 1,
            title: `${l.title} (Cloud Stream)`,
            src: l.cloudStreamUrl,
            durationSeconds: l.estimatedDurationMinutes * 60,
          });
        } else if (l.contentType === 'pptx') {
          blocks.push({
            id: `blk-pptx-${l.id}`,
            type: 'document',
            position: 1,
            title: l.localFilename || `${l.title} Slides.pptx`,
            filename: l.localFilename || 'Presentation_Slides.pptx',
            fileSizeBytes: l.localFileSizeBytes || 2800000,
            content: l.richTextContent || 'Interactive slide deck presentation.',
          });
        }

        // 2. Rich Text Lecture Notes Block
        if (l.richTextContent) {
          blocks.push({
            id: `blk-text-${l.id}`,
            type: 'rich_text',
            position: blocks.length + 1,
            title: 'Lecture Notes',
            content: l.richTextContent,
          });
        }

        // 3. Code Block
        if (l.codeSnippet) {
          blocks.push({
            id: `blk-code-${l.id}`,
            type: 'code_snippet',
            position: blocks.length + 1,
            title: `${l.codeLanguage.toUpperCase()} Code Sample`,
            code: l.codeSnippet,
            language: l.codeLanguage,
          });
        }

        // Fallback rich text if empty
        if (blocks.length === 0) {
          blocks.push({
            id: `blk-default-${l.id}`,
            type: 'rich_text',
            position: 1,
            title: l.title,
            content: l.description || 'Welcome to this unit.',
          });
        }

        return {
          id: l.id,
          sectionId: s.id,
          title: l.title,
          description: l.description || l.speakerNotes,
          position: lIdx + 1,
          estimatedDurationMinutes: l.estimatedDurationMinutes,
          completionPolicy: 'all_blocks_completed',
          isRequired: true,
          blocks,
        };
      })
    }));

    const totalMinutes = transformedSections.reduce((acc, s) => acc + s.estimatedDurationMinutes, 0);

    const newCourse: CourseData = {
      id: courseId,
      title: courseTitle,
      description,
      language: 'en',
      instructorName,
      subject,
      tags,
      estimatedDurationMinutes: totalMinutes,
      thumbnailUrl: customCoverImage || undefined,
      coverImageUrl: customCoverImage || undefined,
      learningObjectives: [
        'Master the foundational and advanced principles outlined in this curriculum',
        'Analyze code snippets, slide presentations, and video lectures',
        'Complete self-paced exercises stored in private local vault'
      ],
      version: APP_VERSION,
      contentFingerprint: `sha256-custom-${Date.now()}`,
      sections: transformedSections,
      isImported: true,
      addedAt: new Date().toISOString(),
    };

    addCourseToVault(newCourse);
    addLog('INFO', 'STORAGE', `Custom course created via Studio: "${courseTitle}" (${transformedSections.length} modules)`);

    setIsSaved(true);
    setTimeout(() => {
      navigate(`/course/${courseId}`);
    }, 800);
  };

  // Export JSON Manifest
  const handleExportJson = () => {
    const exportData = {
      title: courseTitle,
      subject,
      instructorName,
      description,
      thumbnailUrl: customCoverImage || undefined,
      tags: tagsInput.split(',').map((t) => t.trim()),
      sections,
      exportedAt: new Date().toISOString(),
      generator: `CourseNest Course Studio v${APP_VERSION}`
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${courseTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--cn-border)] pb-6">
        <div>
          <button
            onClick={() => navigate('/library')}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] mb-2 transition-colors"
          >
            <IconArrowLeft size={14} />
            <span>Back to Library</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <IconSparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--cn-text-primary)]">
                Course Studio & Authoring Engine
              </h1>
              <p className="text-xs text-[var(--cn-text-secondary)] mt-0.5">
                Create custom offline courses with YouTube embeds, slide decks, video files, and code labs.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-semibold text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors shadow-xs"
            title="Download Course Schema JSON"
          >
            <IconDownload size={14} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleSaveToVault}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-bold hover:bg-[var(--cn-primary-hover)] transition-[transform,background-color] active:scale-95 shadow-sm"
          >
            {isSaved ? <IconCheck size={15} /> : <IconDeviceFloppy size={15} />}
            <span>{isSaved ? 'Saved to Vault!' : 'Save & Publish Course'}</span>
          </button>
        </div>
      </div>

      {/* Quick Template Picker Banner */}
      <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[var(--cn-text-secondary)]">
          <IconBooks size={16} className="text-[var(--cn-primary)]" />
          <span>Quick Starters:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleApplyTemplate('youtube')}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] hover:border-red-500/50 hover:text-red-400 text-[11px] font-medium flex items-center gap-1.5 transition-colors"
          >
            <IconBrandYoutube size={13} className="text-red-500" />
            <span>YouTube Playlist Template</span>
          </button>
          <button
            onClick={() => handleApplyTemplate('bootcamp')}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] hover:border-[var(--cn-primary)] hover:text-[var(--cn-primary)] text-[11px] font-medium flex items-center gap-1.5 transition-colors"
          >
            <IconCode size={13} className="text-[var(--cn-primary)]" />
            <span>Coding Bootcamp Template</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Course Overview Details */}
      <div className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] shadow-sm space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--cn-text-muted)] flex items-center gap-2">
          <span>1. Course Profile & Details</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--cn-text-secondary)] mb-1.5">
              Course Title *
            </label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
              placeholder="e.g. Systems Programming & Architecture"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--cn-text-secondary)] mb-1.5">
              Subject / Category
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
              placeholder="e.g. Computer Science, Machine Learning, Design"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--cn-text-secondary)] mb-1.5">
              Instructor / Author Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
                placeholder="e.g. Dr. Bonsen Fuad"
              />
              <IconUser size={15} className="absolute left-3 top-2.5 text-[var(--cn-text-muted)]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--cn-text-secondary)] mb-1.5">
              Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Two-Column Details Area: Description & Tags on Left, Title Page Image Studio on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          {/* Left Column: Description & Tags & Palette */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--cn-text-secondary)] mb-1.5">
                Course Description & Overview
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)] resize-none"
                placeholder="Comprehensive description of the topics covered in this masterclass..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--cn-text-secondary)] mb-1.5">
                Keywords & Tags (Comma-separated)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
                  placeholder="e.g. Systems, C++, Operating Systems, Algorithms"
                />
                <IconTag size={15} className="absolute left-3 top-2.5 text-[var(--cn-text-muted)]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--cn-text-secondary)] mb-1.5">
                Preset Palette Style
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COVERS.map((cov) => (
                  <button
                    key={cov.id}
                    type="button"
                    onClick={() => setSelectedCover(cov.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${
                      selectedCover === cov.id
                        ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-bold shadow-xs'
                        : 'border-[var(--cn-border)] bg-[var(--cn-bg)] text-[var(--cn-text-secondary)] hover:border-[var(--cn-border-highlight)]'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cov.color }} />
                    <span>{cov.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Title Page Image & Custom Picture Studio */}
          <div className="lg:col-span-5 p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[var(--cn-text-primary)] flex items-center gap-1.5">
                  <IconPhoto size={15} className="text-[var(--cn-primary)]" />
                  <span>Course Title Page & Cover Image</span>
                </label>
                {customCoverImage && (
                  <button
                    type="button"
                    onClick={() => setCustomCoverImage('')}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors font-medium"
                  >
                    Reset Cover
                  </button>
                )}
              </div>

              {/* 16:9 Live Preview Frame */}
              <div className="relative aspect-video w-full rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] overflow-hidden shadow-inner group flex items-center justify-center">
                {customCoverImage ? (
                  <img
                    src={customCoverImage}
                    alt="Course Title Cover"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="p-4 text-center space-y-1.5 select-none">
                    <span className="inline-block px-2 py-0.5 rounded bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] text-[10px] font-mono font-bold">
                      {(subject || 'COURSE').toUpperCase()}
                    </span>
                    <h4 className="text-xs font-bold text-[var(--cn-text-primary)] line-clamp-2 px-2">
                      {courseTitle || 'Masterclass Title'}
                    </h4>
                    <p className="text-[10px] text-[var(--cn-text-muted)] font-mono">
                      {instructorName || 'Instructor'} • {difficulty}
                    </p>
                  </div>
                )}

                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-mono text-white/80">
                  {customCoverImage ? 'Custom Cover Active' : 'Default Title Preview'}
                </div>
              </div>
            </div>

            {/* Smart Detection & Input Options */}
            <div className="space-y-2.5 pt-1">
              {/* Feature A: Auto-Detect from Lesson Materials (e.g. YouTube Video thumbnail or slide deck) */}
              {firstDetectedThumbnail && firstDetectedThumbnail.thumbnailUrl && (
                <button
                  type="button"
                  onClick={() => handleApplyDetectedThumbnail(firstDetectedThumbnail.thumbnailUrl!)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                  title="Extract high-resolution thumbnail from lecture video"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <IconBrandYoutube size={14} className="shrink-0 text-red-500" />
                    <span className="truncate">Auto-Detect: Video Thumbnail</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-red-500/20 px-1.5 py-0.5 rounded shrink-0">
                    Use as Title Card
                  </span>
                </button>
              )}

              {/* Feature B: Auto-generate title card graphic from Title Name */}
              <button
                type="button"
                onClick={handleGenerateTitleImage}
                disabled={isGeneratingTitleCard}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--cn-primary-tint)] border border-[var(--cn-primary)]/40 text-[var(--cn-primary)] text-xs font-semibold hover:bg-[var(--cn-primary)]/20 transition-[background-color,transform] duration-150 active:scale-95 shadow-xs disabled:opacity-50"
              >
                <IconWand size={14} className={isGeneratingTitleCard ? 'animate-spin' : ''} />
                <span>{isGeneratingTitleCard ? 'Generating Graphic...' : 'Detect & Generate Title Graphic from Name'}</span>
              </button>

              {/* Feature C: User inputs picture exactly as needed (Upload file or URL) */}
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] text-xs font-medium hover:bg-[var(--cn-surface-hover)] transition-colors active:scale-95 shadow-xs"
                >
                  <IconUpload size={13} />
                  <span>Upload Picture</span>
                </button>

                {/* Direct Custom Image URL Input */}
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="url"
                    value={coverUrlInput}
                    onChange={(e) => setCoverUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyUrlImage())}
                    placeholder="Or paste picture URL"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-[11px] text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
                  />
                  {coverUrlInput && (
                    <button
                      type="button"
                      onClick={handleApplyUrlImage}
                      className="px-2 py-1.5 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-[11px] font-bold"
                    >
                      Set
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Curriculum Structure Builder */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--cn-text-primary)]">
              2. Curriculum Modules & Lessons
            </h2>
            <p className="text-xs text-[var(--cn-text-secondary)]">
              Build sections and add lessons with YouTube links, slide decks, or code snippets.
            </p>
          </div>

          <button
            onClick={handleAddSection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-semibold text-[var(--cn-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
          >
            <IconFolderPlus size={15} />
            <span>Add Module / Section</span>
          </button>
        </div>

        {/* Sections List */}
        {sections.map((section, sIdx) => (
          <div 
            key={section.id} 
            className="rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] overflow-hidden shadow-sm space-y-4 p-5"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--cn-border)] pb-3">
              <div className="flex-1 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {sIdx + 1}
                </span>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleUpdateSectionTitle(sIdx, e.target.value)}
                  className="w-full font-bold text-sm bg-transparent border-0 text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)] rounded px-1"
                  placeholder="Module Title..."
                />
              </div>

              {sections.length > 1 && (
                <button
                  onClick={() => handleRemoveSection(sIdx)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Module"
                >
                  <IconTrash size={15} />
                </button>
              )}
            </div>

            {/* Lessons Inside Section */}
            <div className="space-y-4 pl-0 sm:pl-3">
              {section.lessons.map((lesson, lIdx) => {
                const ytThumbnail = lesson.contentType === 'youtube' ? getYouTubeThumbnailUrl(lesson.youtubeUrl) : null;

                return (
                  <div
                    key={lesson.id}
                    className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] space-y-3 relative group"
                  >
                    {/* Lesson Top Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[var(--cn-text-muted)] font-bold">
                          {sIdx + 1}.{lIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'title', e.target.value)}
                          className="font-semibold text-xs bg-transparent border-b border-transparent hover:border-[var(--cn-border)] focus:border-[var(--cn-primary)] text-[var(--cn-text-primary)] focus:outline-none px-1 w-full"
                          placeholder="Lesson Title..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Duration input */}
                        <div className="flex items-center gap-1 text-[11px] text-[var(--cn-text-muted)] font-mono">
                          <IconClock size={13} />
                          <input
                            type="number"
                            min={1}
                            max={360}
                            value={lesson.estimatedDurationMinutes}
                            onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'estimatedDurationMinutes', parseInt(e.target.value, 10) || 15)}
                            className="w-12 px-1 py-0.5 rounded border border-[var(--cn-border)] bg-[var(--cn-surface)] text-center text-[var(--cn-text-primary)]"
                          />
                          <span>min</span>
                        </div>

                        {section.lessons.length > 1 && (
                          <button
                            onClick={() => handleRemoveLesson(sIdx, lIdx)}
                            className="p-1 text-[var(--cn-text-muted)] hover:text-red-400 rounded transition-colors"
                            title="Delete Lesson"
                          >
                            <IconTrash size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lesson Content Type Selector Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--cn-border)]/50">
                      <span className="text-[10px] text-[var(--cn-text-muted)] uppercase font-mono mr-1">Content:</span>
                      
                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(sIdx, lIdx, 'contentType', 'youtube')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          lesson.contentType === 'youtube'
                            ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                            : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                        }`}
                      >
                        <IconBrandYoutube size={13} />
                        <span>YouTube Embed</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(sIdx, lIdx, 'contentType', 'pptx')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          lesson.contentType === 'pptx'
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                        }`}
                      >
                        <IconPresentation size={13} />
                        <span>PowerPoint (.pptx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(sIdx, lIdx, 'contentType', 'cloud_stream')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          lesson.contentType === 'cloud_stream'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                        }`}
                      >
                        <IconVideo size={13} />
                        <span>Cloud Video URL</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(sIdx, lIdx, 'contentType', 'code')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          lesson.contentType === 'code'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                        }`}
                      >
                        <IconCode size={13} />
                        <span>Code Lab</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(sIdx, lIdx, 'contentType', 'rich_text')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          lesson.contentType === 'rich_text'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                        }`}
                      >
                        <IconFileText size={13} />
                        <span>Reading Notes</span>
                      </button>
                    </div>

                    {/* Content Input Fields based on Type */}
                    {lesson.contentType === 'youtube' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={lesson.youtubeUrl}
                            onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'youtubeUrl', e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-red-500"
                            placeholder="Paste YouTube Link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)"
                          />
                        </div>

                        {ytThumbnail && (
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--cn-surface)] border border-[var(--cn-border)]">
                            <img src={ytThumbnail} alt="Thumbnail preview" className="w-16 h-10 object-cover rounded" />
                            <div className="text-[11px] text-[var(--cn-text-secondary)]">
                              <span className="font-semibold text-emerald-400">✓ Video Link Recognized</span>
                              <p className="text-[10px] text-[var(--cn-text-muted)]">Will render in-app responsive YouTube player with notes & AI companion.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {lesson.contentType === 'pptx' && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={lesson.localFilename}
                            onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'localFilename', e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-primary)]"
                            placeholder="Presentation Filename (e.g. Lecture_Slides.pptx)"
                          />
                          <input
                            type="file"
                            accept=".pptx,.ppt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleUpdateLesson(sIdx, lIdx, 'localFilename', file.name);
                                handleUpdateLesson(sIdx, lIdx, 'localFileSizeBytes', file.size);
                              }
                            }}
                            className="text-xs text-[var(--cn-text-muted)] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[var(--cn-surface-subtle)] file:text-[var(--cn-text-primary)] hover:file:bg-[var(--cn-border)]"
                          />
                        </div>
                        <p className="text-[10px] text-[var(--cn-text-muted)]">
                          Slide decks open in CourseNest's 16:9 presentation viewer with speaker notes, thumbnails, and audible narration.
                        </p>
                      </div>
                    )}

                    {lesson.contentType === 'cloud_stream' && (
                      <div className="space-y-1 pt-1">
                        <input
                          type="text"
                          value={lesson.cloudStreamUrl}
                          onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'cloudStreamUrl', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-blue-500"
                          placeholder="Direct Video Stream URL (e.g. https://domain.com/lecture.mp4 or .m3u8)"
                        />
                      </div>
                    )}

                    {lesson.contentType === 'code' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] uppercase font-mono text-[var(--cn-text-muted)]">Language:</label>
                          <select
                            value={lesson.codeLanguage}
                            onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'codeLanguage', e.target.value)}
                            className="px-2 py-1 rounded border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-primary)]"
                          >
                            <option value="typescript">TypeScript</option>
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="c">C / C++</option>
                            <option value="rust">Rust</option>
                            <option value="go">Go</option>
                            <option value="sql">SQL</option>
                          </select>
                        </div>
                        <textarea
                          rows={4}
                          value={lesson.codeSnippet}
                          onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'codeSnippet', e.target.value)}
                          className="w-full font-mono text-xs p-3 rounded-lg border border-[var(--cn-border)] bg-black/40 text-emerald-400 focus:outline-none resize-none"
                          placeholder="// Write sample code snippet here..."
                        />
                      </div>
                    )}

                    {/* Common Rich Text Notes */}
                    <div className="pt-1">
                      <textarea
                        rows={2}
                        value={lesson.richTextContent}
                        onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'richTextContent', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs text-[var(--cn-text-primary)] focus:outline-none resize-none"
                        placeholder="Lecture summary, key takeaway bullet points, or cheat sheet..."
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => handleAddLesson(sIdx)}
                className="w-full py-2.5 rounded-xl border border-dashed border-[var(--cn-border)] text-xs font-semibold text-[var(--cn-text-muted)] hover:text-[var(--cn-primary)] hover:border-[var(--cn-primary)] transition-colors flex items-center justify-center gap-1.5"
              >
                <IconPlus size={14} />
                <span>Add Lesson to Module {sIdx + 1}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Publish Bar */}
      <div className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">
            Ready to publish your custom course?
          </h3>
          <p className="text-xs text-[var(--cn-text-secondary)] mt-0.5">
            The course will be registered into your private vault, available in your library and lesson player immediately.
          </p>
        </div>

        <button
          onClick={handleSaveToVault}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-sm font-bold hover:bg-[var(--cn-primary-hover)] transition-[transform,background-color] active:scale-95 shadow-md"
        >
          {isSaved ? <IconCheck size={18} /> : <IconDeviceFloppy size={18} />}
          <span>{isSaved ? 'Published to Vault!' : 'Publish Course to Vault'}</span>
        </button>
      </div>
    </div>
  );
}
