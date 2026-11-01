import React from 'react';
import { 
  IconHeart, 
  IconExternalLink, 
  IconDatabase, 
  IconVolume, 
  IconCpu, 
  IconDeviceFloppy, 
  IconBrandReact, 
  IconBrandTailwind, 
  IconBrain, 
  IconIcons, 
  IconArchive, 
  IconTypography, 
  IconShieldCheck, 
  IconServer,
  IconCircleCheck,
  IconSparkles
} from '@tabler/icons-react';

export interface OpenSourceCredit {
  id: string;
  name: string;
  category: string;
  license: string;
  url: string;
  description: string;
  roleInCourseNest: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const OPEN_SOURCE_CREDITS: OpenSourceCredit[] = [
  {
    id: 'sqlite',
    name: 'SQLite & better-sqlite3 / aiosqlite',
    category: 'Storage & Database Core',
    license: 'Public Domain / MIT',
    url: 'https://www.sqlite.org/',
    description: 'The world’s most trusted embedded database engine. Delivers atomic ACID transactions, zero network latency, and single-file database portability across all supported environments.',
    roleInCourseNest: 'Local course catalog storage, quiz result tracking, lesson progress persistence, and IPC cache indexing without requiring an external database daemon.',
    icon: IconDatabase,
  },
  {
    id: 'vlc',
    name: 'VideoLAN Project (VLC)',
    category: 'Media Architecture & DSP Inspiration',
    license: 'GPL-2.0 / LGPL-2.1',
    url: 'https://www.videolan.org/',
    description: 'The open-source pioneer of resilient, codec-independent media playback across desktop and mobile platforms worldwide.',
    roleInCourseNest: 'Directly inspired CourseNest’s Web Audio API 200% Super-Gain booster, multi-band speech clarity formant EQ, A/B looping, and precision frame stepper.',
    icon: IconVolume,
  },
  {
    id: 'electron',
    name: 'Electron',
    category: 'Air-Gapped Desktop Runtime',
    license: 'MIT',
    url: 'https://www.electronjs.org/',
    description: 'Battle-tested framework for building cross-platform desktop applications using web technologies with native OS platform access.',
    roleInCourseNest: 'Context-isolated desktop environment on Linux, macOS, and Windows with hardened IPC filesystem bridges, USB-OTG drive probing, and auto-discovery.',
    icon: IconCpu,
  },
  {
    id: 'capacitor',
    name: 'Capacitor',
    category: 'Mobile & Tablet Native Bridge',
    license: 'MIT',
    url: 'https://capacitorjs.com/',
    description: 'Modern native runtime developed by Ionic to deploy web apps natively on Android and iOS devices.',
    roleInCourseNest: 'Powers offline Android tablet support, native hardware back-button handling, and Storage Access Framework (SAF) integration for external micro-SD cards.',
    icon: IconDeviceFloppy,
  },
  {
    id: 'react',
    name: 'React 19 & React Router 7',
    category: 'UI Architecture & Navigation',
    license: 'MIT',
    url: 'https://react.dev/',
    description: 'The world-standard declarative UI library with concurrent rendering capabilities paired with client-side micro-routing.',
    roleInCourseNest: 'Reactive player interface, split-workbench side-by-side slide viewing, customizable course studio, and smooth zero-reload offline page navigation.',
    icon: IconBrandReact,
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS v4',
    category: 'Styling & Design Token Engine',
    license: 'MIT',
    url: 'https://tailwindcss.com/',
    description: 'Next-generation utility CSS engine engineered with pure CSS cascade layers and hardware-accelerated animations.',
    roleInCourseNest: 'Powers 9 bespoke themes (including Obsidian Moss and Halal Edition), accessible high-contrast design tokens, and zero-CPU GPU keyframe loaders.',
    icon: IconBrandTailwind,
  },
  {
    id: 'mcp',
    name: 'Model Context Protocol (MCP)',
    category: 'Open Agent Standard',
    license: 'MIT',
    url: 'https://modelcontextprotocol.io/',
    description: 'Open standard created by Anthropic and the open-source community allowing LLMs to securely discover and interface with local context.',
    roleInCourseNest: 'Enables Claude CLI, Gemini CLI, Cursor, and local agents to seamlessly inspect course syllabi, retrieve transcripts, create flashcards, and inspect study progress.',
    icon: IconBrain,
  },
  {
    id: 'tabler',
    name: 'Tabler Icons',
    category: 'Vector Iconography System',
    license: 'MIT',
    url: 'https://tabler.io/icons',
    description: 'A comprehensive collection of over 5,000 highly legible, pixel-crafted open-source SVG vector icons.',
    roleInCourseNest: 'Crisp vector iconography rendered inline across the entire interface without any external network font downloads.',
    icon: IconIcons,
  },
  {
    id: 'archive-tools',
    name: 'JSZip, Yauzl & 7z-wasm',
    category: 'Archive Decompression & Sandboxing',
    license: 'MIT / BSD',
    url: 'https://stuk.github.io/jszip/',
    description: 'High-performance JavaScript and WebAssembly archive extractors for ZIP, TAR, and compressed curriculum packages.',
    roleInCourseNest: 'Direct in-memory decompression of course packages, PPTX presentation extraction, and Zip Slip path traversal defense.',
    icon: IconArchive,
  },
  {
    id: 'typography',
    name: 'SIL Open Font License Typography',
    category: 'Accessible Open-Source Typography',
    license: 'SIL Open Font License 1.1',
    url: 'https://scripts.sil.org/OFL',
    description: 'Curated open-source font families designed for exceptional legibility and optical rendering on digital screens.',
    roleInCourseNest: 'Plus Jakarta Sans, Nunito, Fredoka, Chakra Petch, DM Sans, and JetBrains Mono for distraction-free reading and syntax-highlighted code.',
    icon: IconTypography,
  },
  {
    id: 'validation',
    name: 'Zod & Pydantic',
    category: 'Type Safety & Contract Validation',
    license: 'MIT',
    url: 'https://zod.dev/',
    description: 'Declarative schema validation libraries providing runtime type guarantees and tamper detection across TypeScript and Python.',
    roleInCourseNest: 'Validates imported course manifests, verifies lesson block schemas, sanitizes untrusted input, and protects against malformed curriculum archives.',
    icon: IconShieldCheck,
  },
  {
    id: 'fastapi',
    name: 'FastAPI & SQLAlchemy 2.0',
    category: 'Headless Async Backend Engine',
    license: 'MIT',
    url: 'https://fastapi.tiangolo.com/',
    description: 'High-performance asynchronous Python web framework and SQL toolkit for Python environments.',
    roleInCourseNest: 'Powers the optional local server engine for headless university lab workstations, multi-user deployments, and automated testing suites.',
    icon: IconServer,
  },
];

export function OpenSourceCreditsSection() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Hero Attribution Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] p-6 md:p-8 space-y-4">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(var(--cn-primary) 1.5px, transparent 1.5px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <IconHeart size={14} className="fill-rose-500/30" />
            <span>COMMUNITY ACKNOWLEDGEMENTS</span>
          </div>

          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
            Built on Free & Open-Source Software
          </h2>

          <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] leading-relaxed max-w-3xl">
            CourseNest exists thanks to the dedicated open-source developers, maintainers, and standards bodies 
            who build the software foundations of the open web. We take pride in attributing and honoring every 
            library, runtime, and tool that makes private, local-first education accessible without corporate walled gardens.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="p-3 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)]">
              <span className="text-[10px] font-mono uppercase text-[var(--cn-text-muted)] block">Foundations</span>
              <span className="text-lg font-bold font-mono text-[var(--cn-text-primary)]">12 Projects</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)]">
              <span className="text-[10px] font-mono uppercase text-[var(--cn-text-muted)] block">Licenses</span>
              <span className="text-lg font-bold font-mono text-emerald-400">MIT / OFL / FOSS</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)]">
              <span className="text-[10px] font-mono uppercase text-[var(--cn-text-muted)] block">Telemetry</span>
              <span className="text-lg font-bold font-mono text-[var(--cn-primary)]">0 Trackers</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)]">
              <span className="text-[10px] font-mono uppercase text-[var(--cn-text-muted)] block">Cloud Lock-In</span>
              <span className="text-lg font-bold font-mono text-cyan-400">0% Dependent</span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid of Open Source Tools */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--cn-text-muted)] flex items-center gap-2">
            <IconSparkles size={14} className="text-[var(--cn-primary)]" />
            <span>Open Source Tools & Runtimes</span>
          </h3>
          <span className="text-[11px] font-mono text-[var(--cn-text-muted)]">
            Alphabetical / Architectural Order
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPEN_SOURCE_CREDITS.map((item) => {
            const IconComponent = item.icon;
            return (
              <div 
                key={item.id}
                className="p-5 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] hover:border-[var(--cn-primary)]/50 transition-[border-color,box-shadow] duration-150 flex flex-col justify-between space-y-4 group shadow-xs"
              >
                <div className="space-y-3">
                  {/* Top Bar with Icon, Name, and License Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--cn-surface-hover)] border border-[var(--cn-border)] text-[var(--cn-primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconComponent size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--cn-text-primary)] group-hover:text-[var(--cn-primary)] transition-colors">
                          {item.name}
                        </h4>
                        <span className="text-[11px] font-mono text-[var(--cn-text-muted)]">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--cn-surface-hover)] border border-[var(--cn-border)] text-[var(--cn-text-secondary)] shrink-0">
                      {item.license}
                    </span>
                  </div>

                  {/* General Description */}
                  <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                    {item.description}
                  </p>

                  {/* Specific Implementation in CourseNest */}
                  <div className="p-3 rounded-xl bg-[var(--cn-bg)] border border-[var(--cn-border)] space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--cn-primary)]">
                      <IconCircleCheck size={12} />
                      <span>Role in CourseNest</span>
                    </div>
                    <p className="text-[11px] text-[var(--cn-text-primary)] leading-relaxed">
                      {item.roleInCourseNest}
                    </p>
                  </div>
                </div>

                {/* Footer with Project Link */}
                <div className="pt-2 border-t border-[var(--cn-border)] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[var(--cn-text-muted)]">
                    Official Project Page
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-[var(--cn-primary)] hover:underline font-semibold"
                  >
                    <span>Visit website</span>
                    <IconExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Philosophy & Freedom Statement Card */}
      <section className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--cn-text-primary)]">
          <IconShieldCheck size={16} className="text-[var(--cn-success)]" />
          <span>Local-First & Data Sovereignty Guarantee</span>
        </div>
        <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
          CourseNest adheres strictly to the <strong>Local-First Software</strong> ethos. Your study data, course materials, 
          handwritten notes, bookmarks, and quiz scores never leave your physical device unless you explicitly export 
          or copy them. We believe educational tools should empower human cognition, operate anywhere on Earth without 
          internet connectivity, and respect user privacy unconditionally.
        </p>
      </section>
    </div>
  );
}
