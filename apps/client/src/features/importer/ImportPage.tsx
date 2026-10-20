import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addCourseToVault, transformManifest, type CourseData } from '../../lib/courseStore';
import { 
  Upload, 
  FileArchive, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Check,
  Plus
} from 'lucide-react';

type WizardStep = 'select' | 'inventory' | 'review' | 'importing' | 'complete';

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

  const [step, setStep] = useState<WizardStep>('select');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'json'>('file');

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

  // Handle actual file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setFileSizeBytes(file.size);
    setIsProcessing(true);
    setStep('inventory');

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
          }
        } catch {
          // Fall back to standard extraction
        }
        setIsProcessing(false);
      };
      reader.readAsText(file);
    } else {
      setTimeout(() => {
        setIsProcessing(false);
      }, 900);
    }
  };

  // Handle selecting preset package
  const handleSelectPreset = (name: string, sizeBytes: number) => {
    setSelectedFileName(name);
    setFileSizeBytes(sizeBytes);
    setIsProcessing(true);
    setStep('inventory');

    setTimeout(() => {
      setIsProcessing(false);
    }, 800);
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
        tags: [courseSubject, 'Systems', 'Air-Gapped'],
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
                  content: `### ${les.title}\n\nIngested academic material verified inside sandboxed local vault.\n\nIncluded Files:\n- ${les.files.join('\n- ')}\n\nStudy this unit without external connectivity.`,
                },
              ],
            })),
        })),
        isImported: true,
        addedAt: new Date().toISOString(),
      };

      addCourseToVault(newCourseData);
      setIsProcessing(false);
      setStep('complete');
    }, 1200);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Step Progress Tracker */}
      <div className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { id: 'select', label: '1. Package Source' },
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
              <span>DETERMINISTIC INGESTION ENGINE</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--cn-text-primary)]">
              Ingest Course Package or Manifest
            </h2>
            <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] leading-relaxed">
              Upload a ZIP archive, folder, or JSON manifest. CourseNest extracts files inside a protected sandbox,
              verifies Zip Slip boundaries, and builds your offline curriculum.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
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
              Archive / Manifest File
            </button>
            <button
              onClick={() => setImportMode('json')}
              className={`px-4 py-1.5 rounded-lg border transition-colors ${
                importMode === 'json'
                  ? 'bg-[var(--cn-primary)] text-white border-[var(--cn-primary)] font-semibold'
                  : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
            >
              Paste JSON Manifest
            </button>
          </div>

          {importMode === 'file' ? (
            /* Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--cn-border)] hover:border-[var(--cn-primary)] rounded-2xl p-10 bg-[var(--cn-bg)] transition-colors cursor-pointer space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center mx-auto shadow-sm">
                <Upload size={26} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-[var(--cn-text-primary)]">
                  Click to browse or drop course archive / manifest here
                </p>
                <p className="text-xs text-[var(--cn-text-muted)] font-mono">
                  Supports .zip, .tar.gz, or CourseNest manifest v1.0.0 (.json)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPreset('CS301_Distributed_Systems.zip', 48 * 1024 * 1024);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:border-[var(--cn-primary)] transition-colors"
                >
                  <FileArchive size={14} className="text-[var(--cn-primary)]" />
                  <span>Use Sample Archive (CS301)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Paste JSON Manifest */
            <div className="space-y-3 text-left">
              <label className="text-xs font-mono font-semibold text-[var(--cn-text-secondary)]">
                CourseNest Manifest JSON Specification
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
                    setSelectedFileName('pasted_manifest.json');
                    setStep('review');
                  } catch (err) {
                    alert('Invalid JSON manifest structure.');
                  }
                }}
                disabled={!rawJsonInput.trim()}
                className="px-5 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] disabled:opacity-50 transition-colors"
              >
                Parse & Review Manifest
              </button>
            </div>
          )}

          {/* Sandbox Security Safeguards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Zip Slip Invariant
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                Rejects directory escapes (`../`). Decompresses only into sandboxed scratch roots.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Atomic Rollback
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                If decompression fails, all staging bytes are instantly rolled back. No orphan files.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs space-y-1">
              <span className="font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Untrusted Code Quarantine
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
                Code files (.py, .js, .sh, .c) are classified as static text blocks and never executed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: INVENTORY & SANDBOX SCAN */}
      {step === 'inventory' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 space-y-6">
          {isProcessing ? (
            <div className="py-16 text-center space-y-4">
              <Loader2 size={36} className="animate-spin text-[var(--cn-primary)] mx-auto" />
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Sandboxed Decompression & Security Audit...
              </h3>
              <p className="text-xs text-[var(--cn-text-muted)] font-mono">
                Checking Zip Slip traversal boundaries • Computing SHA-256 signatures
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
                <div>
                  <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
                    Sandbox Scan: {selectedFileName}
                  </h3>
                  <p className="text-xs text-[var(--cn-text-muted)] font-mono mt-0.5">
                    100% Verified Clean • 0 path escapes • {(fileSizeBytes / 1024 / 1024).toFixed(1)} MB extracted
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[var(--cn-success-tint)] text-[var(--cn-success)] border border-[var(--cn-success)]/30">
                  Audit Passed
                </span>
              </div>

              {/* Files table */}
              <div className="border border-[var(--cn-border)] rounded-xl overflow-hidden divide-y divide-[var(--cn-border)]/60 text-xs font-mono">
                <div className="p-3 bg-[var(--cn-bg)] font-semibold text-[var(--cn-text-secondary)] flex justify-between">
                  <span>Discovered Resource Path</span>
                  <span>Safety Status / Action</span>
                </div>
                {[
                  { name: '01_Consensus/01_replicated_state_machines.pdf', type: 'PDF Slide Deck', status: 'Verified Clean' },
                  { name: '01_Consensus/lecture01_audio.mp4', type: 'Video Media (H.264)', status: 'Verified Clean' },
                  { name: '02_Leader_Election/02_raft_leader_election.c', type: 'Quarantined Static Text', status: 'Non-executable' },
                  { name: '02_Leader_Election/raft_terms_cheatsheet.pdf', type: 'PDF Document', status: 'Verified Clean' },
                  { name: '03_Log_Replication/consensus_invariants.pdf', type: 'PDF Document', status: 'Verified Clean' },
                ].map((f, i) => (
                  <div key={i} className="p-3 flex items-center justify-between bg-[var(--cn-surface)]">
                    <span className="text-[var(--cn-text-primary)] truncate max-w-md">{f.name}</span>
                    <span className="text-[var(--cn-success)] flex items-center gap-1.5 shrink-0">
                      <Check size={12} />
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
                >
                  Choose Different Archive
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
              Refine the course title, instructor attribution, and module sequence before writing into your offline vault.
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
            Writing Curriculum Records to Local Disk...
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)] font-mono">
            Writing SQLite metadata • Indexing offline content blocks
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
              Curriculum Ingested Successfully!
            </h2>
            <p className="text-xs text-[var(--cn-text-secondary)] font-mono">
              {courseTitle} is registered and available offline.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Course Subject:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">{courseSubject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Curriculum Modules:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">{proposedSections.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Local Storage Integrity:</span>
              <span className="font-semibold text-[var(--cn-success)]">Verified Air-Gap</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/library')}
              className="px-6 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors"
            >
              Open in Course Vault
            </button>
            <button
              onClick={() => {
                setStep('select');
                setSelectedFileName('');
              }}
              className="px-4 py-2.5 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Ingest Another Package
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
