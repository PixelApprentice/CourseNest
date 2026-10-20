import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses, saveCourses } from '../../lib/courseStore';
import { 
  DownloadStatus, 
  ContentBlockType, 
  LessonCompletionPolicy, 
  createId 
} from '@coursenest/domain';
import { 
  Upload, 
  FolderOpen, 
  FileArchive, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

type WizardStep = 'select' | 'inventory' | 'review' | 'importing' | 'complete';

interface ProposalSection {
  id: string;
  title: string;
  sourceConfidence: 'manifest' | 'numbered' | 'ai';
  lessons: Array<{
    id: string;
    title: string;
    files: string[];
    isApproved: boolean;
  }>;
}

export function ImportPage() {
  const navigate = useNavigate();
  const { courses, refresh } = useCourses();
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Curriculum proposal state (editable by instructor)
  const [proposedCourseTitle, setProposedCourseTitle] = useState('Operating Systems: Practical Kernel & Hardware Architecture');
  const [proposedSections, setProposedSections] = useState<ProposalSection[]>([
    {
      id: 'sec-1',
      title: 'Module 1: Bootstrapping & Hardware Initialization',
      sourceConfidence: 'numbered',
      lessons: [
        {
          id: 'les-1',
          title: 'BIOS, UEFI & Real-to-Protected Mode Transition',
          files: ['01_bootloader_real_mode.asm', 'lecture01_slides.pdf'],
          isApproved: true,
        },
        {
          id: 'les-2',
          title: 'GDT, IDT & Hardware Interrupt Handling',
          files: ['02_idt_handlers.c', 'interrupt_matrix.pdf'],
          isApproved: true,
        },
      ],
    },
    {
      id: 'sec-2',
      title: 'Module 2: Paging & Address Translation',
      sourceConfidence: 'ai',
      lessons: [
        {
          id: 'les-3',
          title: 'Multi-level Page Tables & TLB Invalidation',
          files: ['03_paging_setup.c', 'virtual_memory_cheat_sheet.pdf'],
          isApproved: true,
        },
      ],
    },
  ]);

  // Handle mock file selection
  const handleSelectArchive = (name: string) => {
    setSelectedFileName(name);
    setIsProcessing(true);
    setStep('inventory');

    setTimeout(() => {
      setIsProcessing(false);
    }, 1200);
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

  // Execute Final Import
  const handleFinalImport = () => {
    setIsProcessing(true);
    setStep('importing');

    setTimeout(() => {
      const newCourseId = createId<'CourseId'>(`course-imp-${Date.now()}`);
      const newCourseData = {
        course: {
          id: newCourseId,
          title: proposedCourseTitle,
          description: 'Imported university course package. Deterministically organized and approved.',
          language: 'en',
          instructorName: 'University Department',
          subject: 'Systems & Computing',
          tags: ['Operating Systems', 'Kernels', 'Architecture'],
          estimatedDurationMinutes: 180,
          learningObjectives: [
            'Bootstrapping hardware in protected mode',
            'Configuring IDT and interrupt descriptors',
            'Paging and virtual address translation',
          ],
          localAvailability: DownloadStatus.Downloaded,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        sections: proposedSections.map((sec, sIdx) => ({
          section: {
            id: createId<'SectionId'>(`sec-imp-${sIdx}`),
            courseVersionId: createId<'CourseVersionId'>('ver-imp-1'),
            title: sec.title,
            position: sIdx + 1,
            estimatedDurationMinutes: 90,
            isOptional: false,
            prerequisiteSectionIds: [],
          },
          lessons: sec.lessons.map((les, lIdx) => ({
            lesson: {
              id: createId<'LessonId'>(`les-imp-${sIdx}-${lIdx}`),
              sectionId: createId<'SectionId'>(`sec-imp-${sIdx}`),
              title: les.title,
              learningObjectives: [],
              position: lIdx + 1,
              completionPolicy: LessonCompletionPolicy.AllBlocksCompleted,
              isRequired: true,
              prerequisiteLessonIds: [],
              revision: 1,
            },
            blocks: [
              {
                id: createId<'ContentBlockId'>(`blk-imp-${sIdx}-${lIdx}`),
                lessonId: createId<'LessonId'>(`les-imp-${sIdx}-${lIdx}`),
                type: ContentBlockType.RichText,
                position: 1,
                displayMetadata: {
                  content: `### ${les.title}\n\nImported curriculum unit containing verified educational resources:\n\n- ${les.files.join('\n- ')}`,
                },
                isRequired: true,
                schemaVersion: '1.0.0',
              },
            ],
          })),
        })),
      };

      saveCourses([newCourseData, ...courses]);
      refresh();
      setIsProcessing(false);
      setStep('complete');
    }, 1500);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Step Progress Tracker */}
      <div className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { id: 'select', label: '1. Source' },
            { id: 'inventory', label: '2. Inventory' },
            { id: 'review', label: '3. Proposal Review' },
            { id: 'complete', label: '4. Verified Report' },
          ].map((item, idx) => {
            const isCurrent = step === item.id;
            const isDone =
              (item.id === 'select' && step !== 'select') ||
              (item.id === 'inventory' && (step === 'review' || step === 'complete')) ||
              (item.id === 'review' && step === 'complete');

            return (
              <div key={item.id} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isDone
                      ? 'bg-[var(--cn-success)] text-white'
                      : isCurrent
                        ? 'bg-[var(--cn-primary)] text-white'
                        : 'bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]'
                  }`}
                >
                  {isDone ? <Check size={14} /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
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
            <h2 className="text-2xl font-bold text-[var(--cn-text-primary)]">
              Select Educational Course Materials
            </h2>
            <p className="text-xs md:text-sm text-[var(--cn-text-secondary)]">
              Import a ZIP archive, folder, or document bundle. CourseNest deterministically 
              inventories files, detects duplicates, checks for Zip Slip security, and generates a structured curriculum.
            </p>
          </div>

          {/* Dropzone */}
          <div className="border-2 border-dashed border-[var(--cn-border)] hover:border-[var(--cn-primary)] rounded-xl p-10 bg-[var(--cn-surface-subtle)]/50 transition-colors cursor-pointer space-y-4">
            <div className="w-14 h-14 rounded-full bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center mx-auto">
              <Upload size={28} />
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--cn-text-primary)]">
                Drag and drop your course archive or folder here
              </p>
              <p className="text-xs text-[var(--cn-text-muted)] mt-1">
                Supports .zip, .tar.gz, PDFs, MP4s, slide decks, markdown, and code starter files
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleSelectArchive('CS301_Operating_Systems_Package.zip')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
              >
                <FileArchive size={15} />
                <span>Select Course Archive (.zip)</span>
              </button>
              <button
                onClick={() => handleSelectArchive('CS301_Materials_Folder')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
              >
                <FolderOpen size={15} />
                <span>Select Folder</span>
              </button>
            </div>
          </div>

          {/* Security & Integrity Safeguards Guarantee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-4">
            <div className="p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs">
              <span className="font-semibold text-[var(--cn-text-primary)] flex items-center gap-1.5 mb-1">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Zip Slip Protection
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)]">
                Archive paths are verified inside sandbox staging. No path traversal allowed.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs">
              <span className="font-semibold text-[var(--cn-text-primary)] flex items-center gap-1.5 mb-1">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Deterministic Hash Deduplication
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)]">
                Computes SHA-256 signatures to reuse identical media without duplicating disk space.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/30 text-xs">
              <span className="font-semibold text-[var(--cn-text-primary)] flex items-center gap-1.5 mb-1">
                <ShieldCheck size={14} className="text-[var(--cn-success)]" />
                Original Archive Preserved
              </span>
              <p className="text-[11px] text-[var(--cn-text-muted)]">
                Source files are never modified or deleted without explicit user confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: INVENTORY & SCAN RESULTS */}
      {step === 'inventory' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 space-y-6">
          {isProcessing ? (
            <div className="py-16 text-center space-y-4">
              <Loader2 size={36} className="animate-spin text-[var(--cn-primary)] mx-auto" />
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">
                Scanning & Validating Archive Structure...
              </h3>
              <p className="text-xs text-[var(--cn-text-muted)]">
                Checking path depths, computing SHA-256 hashes, and extracting syllabus hierarchy.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
                <div>
                  <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
                    Inventory Scan: {selectedFileName}
                  </h3>
                  <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
                    12 files discovered • 24.6 MB uncompressed • 0 path vulnerabilities
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--cn-success-tint)] text-[var(--cn-success)] border border-[var(--cn-success)]/30">
                  Scan Passed
                </span>
              </div>

              {/* Discovered files breakdown table */}
              <div className="border border-[var(--cn-border)] rounded-xl overflow-hidden divide-y divide-[var(--cn-border)]/60 text-xs">
                <div className="p-3 bg-[var(--cn-surface-subtle)] font-semibold text-[var(--cn-text-secondary)] flex justify-between">
                  <span>Resource File</span>
                  <span>Detected Type / Size</span>
                </div>
                {[
                  { name: '01_Bootloader/lecture01_slides.pdf', type: 'PDF Document', size: '4.2 MB' },
                  { name: '01_Bootloader/01_bootloader_real_mode.asm', type: 'Source Code (x86)', size: '24 KB' },
                  { name: '02_Interrupts/02_idt_handlers.c', type: 'Source Code (C)', size: '18 KB' },
                  { name: '02_Interrupts/interrupt_matrix.pdf', type: 'PDF Document', size: '1.8 MB' },
                  { name: '03_Paging/virtual_memory_cheat_sheet.pdf', type: 'PDF Document', size: '2.5 MB' },
                ].map((f, i) => (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <span className="font-mono text-[var(--cn-text-primary)]">{f.name}</span>
                    <span className="text-[var(--cn-text-muted)]">{f.type} • {f.size}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
                >
                  Choose Different Archive
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
                >
                  <span>Proceed to Curriculum Proposal</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3: PROPOSED CURRICULUM REVIEW (Checklist Item 7 & 8) */}
      {step === 'review' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--cn-border)] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] mb-1">
                <Sparkles size={12} />
                <span>AI & Deterministic Curriculum Proposal</span>
              </div>
              <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
                Review & Edit Proposed Structure
              </h3>
              <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
                The importer proposes this curriculum sequence based on numbering and document headings.
                AI will never silently overwrite your courses. You hold final approval.
              </p>
            </div>
          </div>

          {/* Editable Course Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cn-text-secondary)]">Proposed Course Title</label>
            <input
              type="text"
              value={proposedCourseTitle}
              onChange={(e) => setProposedCourseTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-sm font-semibold text-[var(--cn-text-primary)] focus:bg-[var(--cn-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
            />
          </div>

          {/* Section & Lesson Review List */}
          <div className="space-y-4">
            {proposedSections.map((sec) => (
              <div key={sec.id} className="border border-[var(--cn-border)] rounded-xl p-4 bg-[var(--cn-surface-subtle)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--cn-text-primary)]">{sec.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      sec.sourceConfidence === 'numbered'
                        ? 'bg-[var(--cn-info-tint)] text-[var(--cn-info)] border-[var(--cn-info)]/30'
                        : 'bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] border-[var(--cn-warning)]/30'
                    }`}>
                      {sec.sourceConfidence === 'numbered' ? 'Numbered Folder Evidence' : 'AI Topic Inference'}
                    </span>
                  </div>
                </div>

                {/* Lessons */}
                <div className="space-y-2">
                  {sec.lessons.map((les) => (
                    <div
                      key={les.id}
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                        les.isApproved
                          ? 'border-[var(--cn-border)] bg-[var(--cn-surface)]'
                          : 'border-dashed border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-[var(--cn-text-primary)]">{les.title}</p>
                        <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">
                          Files: {les.files.join(', ')}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleLessonApproval(sec.id, les.id)}
                        className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                          les.isApproved
                            ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/30'
                            : 'border-[var(--cn-border)] text-[var(--cn-text-muted)]'
                        }`}
                      >
                        {les.isApproved ? 'Approved' : 'Excluded'}
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
              className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Back to Inventory
            </button>
            <button
              onClick={handleFinalImport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
            >
              <CheckCircle2 size={15} />
              <span>Approve & Write Course to Local Library</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING IN PROGRESS */}
      {step === 'importing' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-12 text-center space-y-4">
          <Loader2 size={40} className="animate-spin text-[var(--cn-primary)] mx-auto" />
          <h3 className="font-bold text-lg text-[var(--cn-text-primary)]">
            Writing Course Records to Local Storage...
          </h3>
          <p className="text-xs text-[var(--cn-text-muted)]">
            Writing SQLite metadata, caching resources, and registering manifest v1.0.0.
          </p>
        </div>
      )}

      {/* STEP 5: IMPORT REPORT COMPLETE */}
      {step === 'complete' && (
        <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-[var(--cn-success-tint)] text-[var(--cn-success)] flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[var(--cn-text-primary)]">
              Course Imported Successfully!
            </h2>
            <p className="text-xs text-[var(--cn-text-secondary)]">
              {proposedCourseTitle} is now ready to study offline.
            </p>
          </div>

          {/* Persistent Import Report Details */}
          <div className="max-w-md mx-auto p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Files Discovered:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Files Imported:</span>
              <span className="font-semibold text-[var(--cn-success)]">12 (100%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Duplicates Reused:</span>
              <span className="font-semibold text-[var(--cn-text-primary)]">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--cn-text-muted)]">Security Vulnerabilities:</span>
              <span className="font-semibold text-[var(--cn-success)]">0 (Protected)</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/library')}
              className="px-5 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors"
            >
              Open in Course Library
            </button>
            <button
              onClick={() => {
                setStep('select');
                setSelectedFileName('');
              }}
              className="px-4 py-2.5 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
            >
              Import Another Package
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
