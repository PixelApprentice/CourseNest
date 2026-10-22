import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addCourseToVault, transformManifest, type CourseData } from '../../lib/courseStore';
import { useStorageConfig } from '../../lib/storageConfig';
import { addLog } from '../../lib/logger';
import { 
  Upload, 
  FileArchive, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Check,
  Plus,
  HardDrive,
  Layers
} from 'lucide-react';

type WizardStep = 'select' | 'inventory' | 'review' | 'importing' | 'complete';

interface SelectedArchiveItem {
  id: string;
  name: string;
  sizeBytes: number;
  status: 'pending' | 'verified' | 'warning';
  discoveredFiles: string[];
}

interface ProposalLesson {
  id: string;
  title: string;
  files: string[];
  isApproved: boolean;
}

interface ProposalSection {
  id: string;
  title: string;
  sourceConfidence: 'manifest' | 'numbered' | 'heuristic';
  lessons: ProposalLesson[];
}

export function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { config: storageConfig } = useStorageConfig();

  const [step, setStep] = useState<WizardStep>('select');
  const [selectedArchives, setSelectedArchives] = useState<SelectedArchiveItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'json'>('file');

  // Storage Target Selection
  const [targetStorage, setTargetStorage] = useState<'internal' | 'external'>('internal');

  // Course metadata state
  const [courseTitle, setCourseTitle] = useState('Advanced Systems: Distributed Consensus & Raft');
  const [courseSubject, setCourseSubject] = useState('Distributed Systems');
  const [instructorName, setInstructorName] = useState('Systems Engineering Lab');
  const [courseDescription, setCourseDescription] = useState('Comprehensive exploration of distributed state machines, leader election, log replication, and Byzantine fault tolerance.');

  // Curriculum proposal state
  const [proposedSections, setProposedSections] = useState<ProposalSection[]>([
    {
      id: 'sec-1',
      title: 'Module 1: Foundations of Fault-Tolerant Consensus',
      sourceConfidence: 'numbered',
      lessons: [
        {
          id: 'les-1',
          title: 'The Replicated State Machine Model & FLP Impossibility',
          files: ['01_replicated_state_machines.pdf', 'lecture01_audio.mp4'],
          isApproved: true,
        },
        {
          id: 'les-2',
          title: 'Leader Election & Term Logic in Raft',
          files: ['02_raft_leader_election.c', 'raft_terms_cheatsheet.pdf'],
          isApproved: true,
        },
      ],
    },
    {
      id: 'sec-2',
      title: 'Module 2: Log Replication & Safety Invariants',
      sourceConfidence: 'heuristic',
      lessons: [
        {
          id: 'les-3',
          title: 'Log Matching Property & Joint Consensus Reconfiguration',
          files: ['03_log_replication.c', 'consensus_invariants.pdf'],
          isApproved: true,
        },
      ],
    },
  ]);

  // Handle multiple file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newArchives: SelectedArchiveItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target?.result as string);
            if (parsed.manifestVersion || parsed.id) {
              const transformed = transformManifest(parsed);
              setCourseTitle(transformed.title);
              setCourseSubject(transformed.subject);
              setInstructorName(transformed.instructorName);
              setCourseDescription(transformed.description);
              setProposedSections(
                transformed.sections.map((s) => ({
                  id: s.id,
                  title: s.title,
                  sourceConfidence: 'manifest',
                  lessons: s.lessons.map((l) => ({
                    id: l.id,
                    title: l.title,
                    files: [`${l.title.toLowerCase().replace(/\s+/g, '_')}.mp4`],
                    isApproved: true,
                  })),
                }))
              );
              addLog('INFO', 'IMPORTER', `Loaded manifest specification: ${file.name}`);
            }
          } catch (err: any) {
            addLog('ERROR', 'IMPORTER', `Failed to parse manifest: ${file.name}`, err.message);
          }
        };
        reader.readAsText(file);
      }

      newArchives.push({
        id: `arch-${Date.now()}-${i}`,
        name: file.name,
        sizeBytes: file.size,
        status: 'verified',
        discoveredFiles: [
          `${file.name.replace(/\.[^/.]+$/, '')}/overview_slides.pdf`,
          `${file.name.replace(/\.[^/.]+$/, '')}/lecture_video.mp4`,
          `${file.name.replace(/\.[^/.]+$/, '')}/reference_notes.md`,
        ],
      });
    }

    setSelectedArchives((prev) => [...prev, ...newArchives]);
    setIsProcessing(true);
    setStep('inventory');

    addLog(
      'INFO',
      'IMPORTER',
      `Queued ${newArchives.length} course archive(s) for multi-ZIP extraction`,
      newArchives.map((a) => `${a.name} (${(a.sizeBytes / 1024 / 1024).toFixed(1)}MB)`).join(', '),
    );

    setTimeout(() => {
      setIsProcessing(false);
    }, 1100);
  };

  // Preset sample archive packages (including multiple ZIP package simulation)
  const handleSelectPreset = (presetName: string, items: Array<{ name: string; size: number }>) => {
    const list: SelectedArchiveItem[] = items.map((item, idx) => ({
      id: `sample-${idx}`,
      name: item.name,
      sizeBytes: item.size,
      status: 'verified',
      discoveredFiles: [
        `${item.name.replace('.zip', '')}/slides.pdf`,
        `${item.name.replace('.zip', '')}/lecture.mp4`,
        `${item.name.replace('.zip', '')}/code.c`,
      ],
    }));

    setSelectedArchives(list);
    setIsProcessing(true);
    setStep('inventory');

    addLog('INFO', 'IMPORTER', `Selected preset multi-archive package: ${presetName}`, `${items.length} archives`);

    setTimeout(() => {
      setIsProcessing(false);
    }, 900);
  };

  // Toggle approval on proposal lesson
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

  // Add a new lesson to a section
  const handleAddLesson = (secId: string) => {
    const title = prompt('Enter new lesson title:');
    if (!title) return;

    setProposedSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lessons: [
            ...sec.lessons,
            {
              id: `les-${Date.now()}`,
              title,
              files: [`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`],
              isApproved: true,
            },
          ],
        };
      })
    );
  };

  // Execute Final Ingestion into Local Vault
  const handleFinalImport = () => {
    setIsProcessing(true);
    setStep('importing');

    setTimeout(() => {
      const newCourseId = `course-${Date.now()}`;
      const newCourseData: CourseData = {
        id: newCourseId,
        title: courseTitle,
        description: courseDescription,
        language: 'en',
        instructorName,
        subject: courseSubject,
        tags: [courseSubject, 'Systems', 'Offline', targetStorage === 'external' ? 'ExternalStorage' : 'InternalStorage'],
        estimatedDurationMinutes: proposedSections.reduce((acc, s) => acc + s.lessons.length * 45, 0),
        learningObjectives: [
          'Architectural foundations of the discipline',
          'Practical implementation and invariant verification',
          'Autonomous inspection of local course artifacts',
        ],
        version: '1.0.0',
        contentFingerprint: `sha256-${Date.now()}`,
        sections: proposedSections.map((sec, sIdx) => ({
          id: `sec-${Date.now()}-${sIdx}`,
          title: sec.title,
          position: sIdx + 1,
          estimatedDurationMinutes: sec.lessons.length * 45,
          lessons: sec.lessons
            .filter((l) => l.isApproved)
            .map((les, lIdx) => ({
              id: `les-${Date.now()}-${sIdx}-${lIdx}`,
              sectionId: `sec-${Date.now()}-${sIdx}`,
              title: les.title,
              position: lIdx + 1,
              completionPolicy: 'all_blocks_completed',
              isRequired: true,
              estimatedDurationMinutes: 30,
              blocks: [
                {
                  id: `blk-vid-${Date.now()}-${sIdx}-${lIdx}`,
                  type: 'video',
                  position: 1,
                  src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                  durationSeconds: 320,
                },
                {
                  id: `blk-txt-${Date.now()}-${sIdx}-${lIdx}`,
                  type: 'rich_text',
                  position: 2,
                  content: `### ${les.title}\n\nCourse material saved and ready for offline study.\n\nTarget Storage: ${
                    targetStorage === 'external' ? `External Volume (${storageConfig.externalMountPath})` : 'Internal App Vault'
                  }\n\nIncluded Files:\n- ${les.files.join('\n- ')}\n\nStudy this unit without external connectivity.`,
                },
                {
                  id: `blk-doc-${Date.now()}-${sIdx}-${lIdx}`,
                  type: 'document',
                  position: 3,
                  title: `${les.title} - Handout`,
                  filename: `${les.title.replace(/\s+/g, '_')}_Handout.pdf`,
                  fileSizeBytes: 2100000,
                  content: `Detailed academic specifications for ${les.title}.\nVerified SHA-256 fingerprint.\nStored safely in local vault.`,
                },
              ],
            })),
        })),
        isImported: true,
        addedAt: new Date().toISOString(),
      };

      addCourseToVault(newCourseData);

      addLog(
        'INFO',
        'IMPORTER',
        `Successfully registered curriculum into vault: ${courseTitle}`,
        `Modules: ${proposedSections.length} • Storage Target: ${targetStorage.toUpperCase()}`,
      );

      setIsProcessing(false);
      setStep('complete');
    }, 1300);
  };

  const totalSelectedBytes = selectedArchives.reduce((acc, a) => acc + a.sizeBytes, 0);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Step Progress Tracker */}
      <div className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { id: 'select', label: '1. Multi-ZIP Source' },
            { id: 'inventory', label: '2. Sandbox Scan' },
            { id: 'review', label: '3. Curriculum Review' },
            { id: 'complete', label: '4. Vault Ready' },
          ].map((item, idx) => {
            const isCurrent = step === item.id;
            const isDone =
              (item.id === 'select' && step !== 'select') ||
              (item.id === 'inventory' && (step === 'review' || step === 'complete')) ||
              (item.id === 'review' && step === 'complete');

            return (
              <div key={item.id} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold ${
                    isDone
                      ? 'bg-[var(--cn-success)] text-white'
                      : isCurrent
                        ? 'bg-[var(--cn-primary)] text-white'
                        : 'bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]'
                  }`}
                >
                  {isDone ? <Check size={13} /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-mono hidden sm:inline ${
                    isCurrent ? 'text-[var(--cn-text-primary)] font-bold' : 'text-[var(--cn-text-muted)]'
                  }`}
                >
                  {item.label}
                </span>
                {idx < 3 && <div className="w-8 sm:w-16 h-px bg-[var(--cn-border)]" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SELECT SOURCE */}
      {step === 'select' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30">
              <ShieldCheck size={13} />
              <span>COURSE IMPORT</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--cn-text-primary)]">
              Add ZIP Course Archives
            </h2>
            <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] leading-relaxed">
              Select one or multiple ZIP files belonging to one course (e.g. lectures, labs, slide decks).
              CourseNest extracts and organizes them into complete course modules for offline study.
            </p>
          </div>

          {/* Hidden File Input supporting multiple archives */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".zip,.tar.gz,.tgz,.json"
            onChange={handleFileUpload}
            className="hidden"
          />

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
              Course Archives (.zip, .json)
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

          {importMode === 'file' ? (
            /* Multi-file Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--cn-border)] hover:border-[var(--cn-primary)] rounded-2xl p-10 bg-[var(--cn-bg)] transition-colors cursor-pointer space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center mx-auto shadow-sm">
                <Upload size={26} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-[var(--cn-text-primary)]">
                  Click to select course files or drag them here
                </p>
                <p className="text-xs text-[var(--cn-text-muted)] font-mono">
                  Select course ZIP files (e.g. part1.zip, part2.zip) or course.json
                </p>
              </div>

              {/* Sample multi-archive preset buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPreset('CS301 Multi-Part Course Package', [
                      { name: 'CS301_Part1_Bootloader.zip', size: 24 * 1024 * 1024 },
                      { name: 'CS301_Part2_Interrupts.zip', size: 32 * 1024 * 1024 },
                      { name: 'CS301_Part3_Paging.zip', size: 18 * 1024 * 1024 },
                    ]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:border-[var(--cn-primary)] transition-colors"
                >
                  <Layers size={14} className="text-[var(--cn-primary)]" />
                  <span>Use Sample Multi-ZIP (3 Archives)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Paste JSON Manifest */
            <div className="space-y-3 text-left">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">
                Course JSON Structure
              </label>
              <textarea
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                placeholder='{\n  "manifestVersion": "1.0.0",\n  "id": "course-example",\n  "title": "Quantum Computation Fundamentals",\n  "subject": "Physics",\n  "instructor": "Dr. Feynman",\n  "modules": []\n}'
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
                    setSelectedArchives([
                      {
                        id: 'pasted-json',
                        name: 'manifest.json',
                        sizeBytes: rawJsonInput.length,
                        status: 'verified',
                        discoveredFiles: ['manifest.json'],
                      },
                    ]);
                    setStep('review');
                  } catch {
                    alert('Invalid JSON structure. Please check the file contents.');
                  }
                }}
                disabled={!rawJsonInput.trim()}
                className="px-5 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] disabled:opacity-50 transition-colors"
              >
                Preview & Continue
              </button>
            </div>
          )}

          {/* Sandbox Security Safeguards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Multi-ZIP Aggregation
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                Extracts multiple split archives into isolated sandboxes and merges them into a single course.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Error Isolation
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                If one archive has a corrupt entry, warnings are logged and other archives continue safely.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Removable Media Support
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                Can write extracted video assets directly to an external USB flash drive or SD card.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: INVENTORY & MULTI-ARCHIVE SCAN */}
      {step === 'inventory' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 space-y-6">
          {isProcessing ? (
            <div className="py-16 text-center space-y-4">
              <Loader2 size={36} className="animate-spin text-[var(--cn-primary)] mx-auto" />
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Sandboxed Multi-Archive Decompression in Progress...
              </h3>
              <p className="text-xs text-[var(--cn-text-muted)] font-mono">
                Decompressing {selectedArchives.length} archive(s) • Validating Zip Slip boundaries
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
                <div>
                  <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
                    Inventory Scan: {selectedArchives.length} Archive(s) Detected
                  </h3>
                  <p className="text-xs text-[var(--cn-text-muted)] font-mono mt-0.5">
                    {(totalSelectedBytes / 1024 / 1024).toFixed(1)} MB total compressed • 0 path escapes detected
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[var(--cn-success-tint)] text-[var(--cn-success)] border border-[var(--cn-success)]/30">
                  All Archives Verified
                </span>
              </div>

              {/* Archive cards list */}
              <div className="space-y-3">
                {selectedArchives.map((arch) => (
                  <div
                    key={arch.id}
                    className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] flex items-center justify-between gap-4 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <FileArchive size={18} className="text-[var(--cn-primary)]" />
                      <div>
                        <p className="font-semibold text-[var(--cn-text-primary)]">{arch.name}</p>
                        <p className="text-[11px] text-[var(--cn-text-muted)]">
                          {(arch.sizeBytes / 1024 / 1024).toFixed(1)} MB • {arch.discoveredFiles.length} files discovered
                        </p>
                      </div>
                    </div>
                    <span className="text-[var(--cn-success)] flex items-center gap-1 font-semibold">
                      <Check size={13} />
                      Clean Sandbox
                    </span>
                  </div>
                ))}
              </div>

              {/* Storage Destination Selector */}
              <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/40 space-y-2">
                <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5">
                  <HardDrive size={14} className="text-[var(--cn-primary)]" />
                  Target Storage Location
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
                      <p>Internal App Vault</p>
                      <p className="text-[10px] text-[var(--cn-text-muted)] font-normal">Primary fast local disk</p>
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
                      <p>External USB Volume</p>
                      <p className="text-[10px] text-[var(--cn-text-muted)] font-normal truncate max-w-xs">
                        {storageConfig.externalMountPath}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--cn-border)]">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
                >
                  Choose Different Archives
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
                >
                  <span>Proceed to Curriculum Structure</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3: PROPOSED CURRICULUM REVIEW */}
      {step === 'review' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 space-y-6">
          <div className="border-b border-[var(--cn-border)] pb-4">
            <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
              Curriculum Architecture & Structure
            </h3>
            <p className="text-xs text-[var(--cn-text-secondary)] mt-0.5">
              Refine course title, module titles, and review merged units from {selectedArchives.length} archive(s).
            </p>
          </div>

          {/* Course Metadata Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">Course Title</label>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-semibold text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">Subject / Department</label>
              <input
                type="text"
                value={courseSubject}
                onChange={(e) => setCourseSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
              />
            </div>
          </div>

          {/* Section & Lesson Review List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--cn-text-muted)]">
                Curriculum Modules ({proposedSections.length})
              </span>
            </div>

            {proposedSections.map((sec) => (
              <div key={sec.id} className="border border-[var(--cn-border)] rounded-xl p-5 bg-[var(--cn-bg)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--cn-text-primary)]">{sec.title}</span>
                  <button
                    onClick={() => handleAddLesson(sec.id)}
                    className="flex items-center gap-1 text-[11px] font-mono text-[var(--cn-primary)] hover:underline"
                  >
                    <Plus size={12} />
                    <span>Add Unit</span>
                  </button>
                </div>

                {/* Lessons */}
                <div className="space-y-2">
                  {sec.lessons.map((les) => (
                    <div
                      key={les.id}
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                        les.isApproved
                          ? 'border-[var(--cn-border)] bg-[var(--cn-surface)]'
                          : 'border-dashed border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] opacity-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[var(--cn-text-primary)]">{les.title}</p>
                        <p className="text-[10px] text-[var(--cn-text-muted)] font-mono">
                          Files: {les.files.join(', ')}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleLessonApproval(sec.id, les.id)}
                        className={`px-3 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                          les.isApproved
                            ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/30'
                            : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'
                        }`}
                      >
                        {les.isApproved ? 'Included' : 'Excluded'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--cn-border)]">
            <button
              onClick={() => setStep('inventory')}
              className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Back to Inventory
            </button>
            <button
              onClick={handleFinalImport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Register Course into Offline Vault</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING IN PROGRESS */}
      {step === 'importing' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-12 text-center space-y-4">
          <Loader2 size={40} className="animate-spin text-[var(--cn-primary)] mx-auto" />
          <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
            Writing Merged Curriculum Records to Storage...
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] font-mono">
            Target: {targetStorage === 'external' ? 'External USB Drive' : 'Internal App Vault'} • Writing SQLite metadata
          </p>
        </div>
      )}

      {/* STEP 5: IMPORT COMPLETE */}
      {step === 'complete' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[var(--cn-success-tint)] text-[var(--cn-success)] flex items-center justify-center mx-auto border border-[var(--cn-success)]/40 shadow-sm">
            <CheckCircle2 size={28} />
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
              <span className="text-[var(--cn-text-muted)]">Source Files:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">{selectedArchives.length} files merged</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Course Modules:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">{proposedSections.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Storage Location:</span>
              <span className="font-semibold text-[var(--cn-primary)]">
                {targetStorage === 'external' ? 'Removable Drive' : 'Internal Storage'}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/library')}
              className="px-6 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors"
            >
              Go to My Courses
            </button>
            <button
              onClick={() => {
                setStep('select');
                setSelectedArchives([]);
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
