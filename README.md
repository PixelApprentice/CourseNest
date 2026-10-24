# CourseNest 🎓
> **Open-Source, Local-First, Multi-Audience Educational Studio, Course Creator & Video Player**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Release: v1.1.0](https://img.shields.io/badge/Release-v1.1.0-emerald.svg)](https://github.com/PixelApprentice/Korse/releases)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.14+-blue.svg)](https://python.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F.svg)](https://www.electronjs.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_7-119EFF.svg)](https://capacitorjs.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10.34-orange.svg)](https://pnpm.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Keywords:** `local-first lms` • `offline course player` • `custom course creator` • `youtube course embed` • `pptx presentation reader` • `vlc web player` • `air-gapped learning` • `educational studio` • `desktop electron` • `android learning`

---

CourseNest is a modern, privacy-first, **air-gapped educational studio and curriculum player** designed for students, educators, and institutions. It lets you create custom courses, ingest course folders, view PowerPoint presentations, watch video lectures with VLC-grade audio controls, embed YouTube tutorials, and study offline with private local AI.

---

## 🎨 Multi-Audience Theme & Aesthetic Studio

CourseNest features a **built-in 9-theme design studio** with bespoke typography (SIL OFL open-source fonts), atmospheric SVG scenic artwork with contrast scrims, theme-adaptive vector logos, and zero-CPU pure CSS GPU keyframe loaders:

| Theme | Aesthetic Character | Emblem & Backdrop | Display Typography |
| :--- | :--- | :--- | :--- |
| 🕌 **Halal Edition** | Islamic modesty & serenity | Rub el Hizb 8-point geometric star & Mosque minaret skyline | Plus Jakarta Sans |
| 🌸 **Sakura Bloom** | Kawaii pastel & cozy floral | 5-petal cherry blossom seal & Mt. Fuji Japanese garden vista | Nunito Rounded |
| 🧱 **Toybox Playful** | Children & claymorphism | 3D interlocking brick & bubbly floating landscape | Fredoka Bubbly |
| ⚡ **Neo-Tokyo Mecha** | High-tech cyberpunk | HUD targeting reticle & neon metropolis skyline | Chakra Petch Tech |
| 💥 **Manga Screentone** | Japanese comic action | Comic burst stamp, halftone screentone & speedlines | Chakra Petch Bold |
| 🍃 **Studio Ghibli Nature** | Whimsical woodland meadow | Sprouting seedling & ancient camphor tree canopy | DM Sans Organic |
| 🪨 **Obsidian Moss** | Deep-focus engineering | Monolith geometric blueprint & emerald glow | DM Sans Slate |
| 🌑 **OLED Midnight** | 0% true black battery saver | Celestial orbital ring & emerald hairlines | JetBrains Mono |
| 📰 **Clean Editorial** | Daylight academic paper | Swiss drafting grid & minimalist layout | Inter / DM Sans |

> **Reusable Engine**: The entire theme engine is built modularly with open-source typography, SVG scenic backdrops, and theme-adaptive vector emblems inside [`packages/ui`](packages/ui) and [`packages/config`](packages/config).

---

## 📸 Visual Showcase & UI Gallery

| Learning Overview (Obsidian Moss) | Multi-Archive Importer (4-Step Stepper) |
| :---: | :---: |
| ![Home Dashboard](docs/screenshots/01_home_dashboard.png) | ![Import Wizard](docs/screenshots/05_import_wizard_fresh.png) |

| Lesson Player & Multi-Format Subtitles | Syntax-Highlighted Code Block (1-Click Copy) |
| :---: | :---: |
| ![Lesson Subtitles](docs/screenshots/06b_lesson_subtitles_menu.png) | ![Code Viewer](docs/screenshots/06c_lesson_code_snippet.png) |

| In-App Mini Window Documentation Viewer | Local AI Study Buddy & Timestamps |
| :---: | :---: |
| ![Mini Window](docs/screenshots/06d_lesson_mini_window_modal.png) | ![Local AI Buddy](docs/screenshots/06g_lesson_ai_study_buddy.png) |

| Curriculum Roadmap Diagram | Append Supplementary Materials Mode |
| :---: | :---: |
| ![Curriculum Diagram](docs/screenshots/04b_course_diagram_view.png) | ![Append Mode](docs/screenshots/05b_import_wizard_append.png) |

| Course Dossier & Inline Title Editor | Storage Purge Confirmation Modal |
| :---: | :---: |
| ![Course Landing](docs/screenshots/04_course_landing_dossier.png) | ![Delete Purge Modal](docs/screenshots/04c_delete_purge_modal.png) |

| Free Cloud AI TokenHarbor Verification | System Logs Ring-Buffer Explorer |
| :---: | :---: |
| ![Settings AI](docs/screenshots/07d_settings_ai_byo_tokenharbor.png) | ![System Logs](docs/screenshots/07e_settings_system_logs.png) |

| 🕌 Halal Edition Wallpaper | 🌸 Sakura Bloom Garden |
| :---: | :---: |
| ![Halal Edition](docs/screenshots/theme_halal_mosque.png) | ![Sakura Bloom](docs/screenshots/theme_sakura_bloom.png) |

| 🧱 Toybox Playful Valley | ⚡ Neo-Tokyo Mecha Skyline |
| :---: | :---: |
| ![Toybox Valley](docs/screenshots/theme_toybox_playful.png) | ![Neo-Tokyo Mecha](docs/screenshots/theme_neo_tokyo_mecha.png) |

---

## 🎯 Design Engineering & Polish (Emil Kowalski Philosophy)

The user interface follows strict design engineering standards:
* **Zero `transition: all`**: Every transition in the codebase explicitly targets composite-only GPU properties (`transform`, `opacity`, `background-color`, `border-color`, `box-shadow`) to maintain a steady 60fps frame budget.
* **Physical `:active` Feedback**: Buttons and cards give immediate tactile feedback (`scale(0.97)` / `active:scale-95`). In the Manga theme, buttons physically compress into the page (`translate(1px, 1px)` with reduced shadow).
* **Origin-Aware Popovers**: Dropdowns and popovers (such as the notification flyout) scale from their trigger origin (`origin-top-right zoom-in-95 ease-out`), while dialog modals remain centered in the viewport.
* **Custom Cubic-Bezier Easing**: Uses strong deceleration curves (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`) rather than sluggish browser defaults.
* **Accessibility & Touch Safeguards**: Full `@media (prefers-reduced-motion: reduce)` motion dampening and `@media (hover: none)` sticky-hover prevention for touch screens.

---

## ⚡ Core Architectural Pillars

### 1. 100% Offline-First Learning Core (Zero Cloud Overhead)
* **Zero Telemetry or Remote Tracking**: All course manifests, notes, bookmarks, quiz scores, and video progress are saved strictly to local device storage (SQLite WAL / IndexedDB).
* **Low-End Hardware Optimization**: Students with budget dual-core laptops run the application with **0% idle CPU**. The app loads instantly and does not strain battery life or system memory.
* **HashRouter Navigation**: Complete independence from web server rewrites—works under `http://`, `file://`, and Android WebView.

### 2. VLC-Grade Media Suite Player
* **200% Web Audio Super-Gain Booster**: Amplifies quiet professor recordings up to double standard volume using the Web Audio API.
* **Speech Presence Clarity Equalizer**: A dedicated Biquad bandpass boost (+6dB @ 2.5kHz) brings vocal frequencies to the foreground over background room echo.
* **Frame-by-Frame Stepper**: Step backward or forward by exactly 1/30th of a second for technical diagrams or code walkthroughs.
* **A-B Looping**: Set custom loop markers to repeat difficult lecture segments continuously.
* **Full-Width Mouse Wheel Scroll**: Unified scroll pipeline across 100% of the viewport width—smooth scrolling remains completely fluid whether hovering over video margins, controls, or code blocks.
* **Picture-in-Picture (PiP) & Mini-Window**: Seamless floating video playback while continuing to read course texts and lecture materials.
* **Auto-Completion & "Next Lesson" Flow**: Automatically marks units as complete when a lecture video finishes, prompting the student with an intuitive celebratory card to advance to the next unit with a single click or keyboard shortcut.
* **External `vlc://` Protocol Bridge**: One-click stream handoff to desktop VLC Media Player.

### 3. Decoupled Media Tier & Storage Disconnection Resilience
* **Separation of State and Multimedia**: Heavy video files can be stored on removable USB flash drives or external SD cards, while learning state (notes, progress, quiz submissions) resides on internal device storage.
* **Unplugged Resilience**: If an external media drive is unexpectedly unplugged during playback, the application preserves all notes and checkpoint data, transitions gracefully to an informative reconnect prompt, and automatically resumes video upon re-insertion.

#### 🗄️ Where Are Decompressed Files Stored? (e.g. LangChain Course)
CourseNest operates with an **air-gapped, zero-cloud architecture**. Decompressed archive files and media are stored depending on your runtime surface:

1. **Web Browser (PWA / Chrome / Firefox)**:
   - **Binary Media Blobs (Video, PDF, Audio)**: Stored directly in the browser's high-performance **IndexedDB** database under `coursenest_media_vault_v1`, in the `media_files` object store. Each file is keyed by `${courseId}::${filePath}` (e.g., `langchain-101::01-intro/lecture.mp4`).
   - **Course Manifests & Tree Structure**: Persisted in `localStorage` (`coursenest_custom_courses_v1`), containing structured chapter outlines, lesson trees, and durations.
   - **Progress & User State**: Persisted in `localStorage` under `coursenest_course_progress_v1` and `coursenest_lesson_notes_v1`.
   - **Storage Purge on Deletion**: When you click **Delete Course**, `deleteCourseFromVault(courseId)` opens a transaction against IndexedDB and permanently purges every binary chunk associated with that course ID, immediately reclaiming browser disk space.
2. **Electron Desktop (Windows / Linux / macOS)**:
   - Stored in the local user data folder:
     - **Windows**: `%APPDATA%\CourseNest\vault\courses\{course_id}\`
     - **Linux**: `~/.config/CourseNest/vault/courses/{course_id}/`
     - **macOS**: `~/Library/Application Support/CourseNest/vault/courses/{course_id}/`
   - Mirrored into desktop Chromium IndexedDB for instant streaming.
   - Course deletion unlinks both the filesystem directory and the IndexedDB records.
3. **FastAPI Institutional Central Server (Optional)**:
   - Stored on server disk under `apps/server/storage/courses/{course_id}/`.
   - Course deletion asynchronously purges the directory and metadata.

### 4. Hardened Multi-Archive Ingestion Pipeline
* **Multi-ZIP Aggregation**: Supports selecting and merging multiple ZIP archives representing a single course in one folder.
* **Zip Slip Defense**: Canonical path boundary validation strictly rejects archive entries containing `../`, root paths, or null bytes (`\0`).
* **Atomic Staging & Rollback**: Ingestion executes inside a temporary staging sandbox. If any validation fails, partial state is automatically rolled back to prevent corrupting the local vault.
* **Untrusted Code Sandboxing**: Ingested `.html`, `.js`, `.py`, or `.sh` files are parsed strictly as plain text within an inert preview pane—preventing arbitrary local code execution.

### 5. Local AI Study Buddy & Optional BYO-API Companion
* **The "Offline-First + AI" Hybrid Model**: CourseNest bridges local privacy and AI assistance without requiring cloud lock-in:
  - **100% Offline Heuristics Engine**: Operates completely offline with **zero API keys and zero internet connection**. It extracts lecture transcripts, parses speech timestamps `[mm:ss]`, generates structured topic summaries, captures key definitions, and generates self-test comprehension questions directly from local course content.
  - **Local Ollama Integration**: Connects directly to local offline LLMs running on your machine (e.g. `http://localhost:11434` / `127.0.0.1` with Llama 3, Mistral, or Qwen) with zero telemetry and automatic loopback exemption.
  - **Bring-Your-Own-API (BYO-API)**: When connected to campus or home internet, students can connect **Google Gemini Pro** or any **OpenAI-compatible / OmniRoute** gateway.
* **Air-Gap Resilience**: If disconnected or if no API key is present, the app gracefully switches to the Offline Heuristic Companion—never throwing modal errors or blocking study progress.

### 6. Interactive Developer & Reference Suite
* **Syntax-Highlighted Code Block Viewer**: Built-in dark terminal chrome with line numbers, regex-based keyword/string/comment syntax highlighting, and tactile 1-click "Copy Code" with checkmark verification. Automatically parses inline code blocks (` ```lang ... ``` `) within course lecture notes.
* **In-App Mini Window Documentation Viewer**: Sandboxed browser iframe modal with traffic light controls, address bar, reload button, URL copy, and expand/minimize options. Allows students to read official documentation, MDN references, and course links without switching browser tabs or desktop applications.

### 7. Custom Course Studio & Visual Authoring Engine
* **Visual Course Creation & Editing (`#/studio` & `#/create`)**: Educators and self-learners can create custom courses from scratch or edit existing curricula directly in the browser or desktop app.
* **Multi-Format Content Blocks**:
  - **YouTube Video Embeds**: Instant YouTube URL parsing (`youtube.com/watch`, `youtu.be/`, `youtube.com/embed/`) with privacy-enhanced embed playback (`youtube-nocookie.com`), custom play controls, and automated lesson completion.
  - **Direct Video Streams & Local Media**: Support for MP4, WebM, and local filesystem/media vault video assets.
  - **PowerPoint Slide Decks**: Embed `.pptx` and `.ppt` presentations directly into course curriculum lessons.
  - **PDF & Document Readers**: Embed local textbooks, scientific papers, and supplementary study guides.
  - **Code Labs & Markdown Notes**: Rich syntax-highlighted code blocks, lecture summaries, and markdown instructions.
* **One-Click Vault Persistence & Export**: Save directly to the local IndexedDB/localStorage vault (`coursenest_custom_courses_v1`) or export a standardized course JSON manifest to share with peers.

### 8. Native PowerPoint (.pptx) Slide Presentation Reader
* **Client-Side Slide Parser**: Zero cloud conversion or external server required—extracts and renders PowerPoint slides, shapes, bullet lists, formatting, and speaker notes directly in the browser via Web APIs and `jszip`.
* **16:9 Responsive Stage & Fullscreen Mode**: Presentation-grade widescreen viewport with slide thumbnail rail, previous/next controls, keyboard hotkeys (Arrow Left/Right, Space), and fullscreen toggle.
* **Integrated Speaker Notes Drawer**: Collapsible presenter notes panel for reading detailed lecture commentary alongside slides.
* **Web Speech TTS Slide Narration**: In-slide text-to-speech audio narration reads slide titles, body bullets, and speaker notes aloud.
* **AI Study Buddy Integration**: One-click prompt transfer sends current slide content and speaker notes directly to the AI Study Buddy for instant comprehension Q&A and concept breakdowns.

---

## 🛠️ Monorepo Architecture

```mermaid
flowchart TD
    subgraph Storage["Storage & Hardware Tiers"]
        INT["Internal Vault (SQLite WAL / IndexedDB)\nProgress • Notes • Bookmarks • Quizzes"]
        EXT["Removable Volume (USB-OTG / SD Card)\nHeavy Video Lectures • Raw PDFs"]
    end

    subgraph Core["Core Packages"]
        IMP["@coursenest/importer\nMulti-ZIP • Zip-Slip Guard • MIME Sniffer"]
        MAN["@coursenest/course-manifest\nPortable JSON Course Specification"]
        SQL["@coursenest/sqlite-adapter\nClean Architecture Database Repositories"]
        UI["@coursenest/ui\nTheme Studio Tokens • StatusBadges • Roadmap"]
        MCP["@coursenest/mcp-server\nModel Context Protocol Stdio Server"]
    end

    subgraph Platforms["Cross-Platform Surfaces"]
        DESK["Electron Desktop\nLinux AppImage/deb • Windows .exe"]
        ANDR["Capacitor Android Shell\nPhones & Tablets (.apk)"]
        WEB["React 19 + Vite Web Client\nZero-Cloud Air-Gapped Mode"]
    end

    subgraph Optional["Optional Extensions"]
        AI["AI Reading Companion\nGemini Pro • Ollama • Offline Heuristics"]
        SRV["FastAPI Sync Server\nSQLite / PostgreSQL • Institutional Fleet Management"]
    end

    IMP --> MAN --> SQL
    SQL <--> INT
    Platforms <--> Core
    Platforms <--> Storage
    Platforms -.->|When Connected| AI
    INT -.->|Optional Sync| SRV
    MCP <--> SQL
```

---

## 🔌 Model Context Protocol (MCP) Server

CourseNest includes an official **Model Context Protocol (MCP) server** (`@coursenest/mcp-server`), enabling AI coding assistants, agents, and desktop companions (such as **Claude Desktop**, **Claude Web**, **Gemini CLI**, **Cursor**, or **Antigravity**) to inspect courses, explore curriculums, search transcripts, and save study notes directly through standardized JSON-RPC stdio.

### ⚙️ Claude Desktop Configuration
Add the CourseNest MCP server to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "coursenest": {
      "command": "node",
      "args": [
        "/absolute/path/to/Korse/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### 🛠️ Available MCP Tools & Resources

| Tool / Resource | Type | Description |
| :--- | :--- | :--- |
| `coursenest_list_courses` | Tool | Lists all enrolled courses in the local vault with statistics, lesson counts, and progress |
| `coursenest_get_curriculum` | Tool | Returns the structured chapter and lesson tree for a course with lesson IDs, types, and durations |
| `coursenest_get_lesson` | Tool | Retrieves the full lesson content, lecture notes, video URL, code blocks, and transcript for study |
| `coursenest_search` | Tool | Performs keyword and full-text search across all enrolled courses, lecture notes, and transcripts |
| `coursenest_save_note` | Tool | Creates or updates study notes and markdown summaries for a specific lesson |
| `coursenest://courses` | Resource | Read-only JSON resource containing all enrolled courses and metadata |

### 🧪 Running MCP Standalone
You can run the MCP server directly via stdio:
```bash
# Build the MCP server
pnpm --filter @coursenest/mcp-server build

# Launch over stdio JSON-RPC
node packages/mcp-server/dist/index.js
```

---

## 🚀 Quickstart & Testing

### 1. Prerequisites
- **Node.js**: `>= 20.0.0` (LTS recommended)
- **pnpm**: `>= 9.0.0`
- **Python**: `>= 3.11` (for optional FastAPI backend)

### 2. Monorepo Installation & Build
```bash
# Clone the repository
git clone https://github.com/PixelApprentice/Korse.git
cd Korse

# Install all workspace dependencies
pnpm install

# Build all packages and the client
pnpm build
```

### 3. Launching the Applications
- **Web Client (Live Testing)**:
  ```bash
  pnpm dev
  # Open http://localhost:5173
  ```
  *Immediately explore pre-bundled university courses ("CS 101: Systems Programming & Operating Principles" & "Machine Learning: Algorithms & Inference") with video lectures, lecture notes, and quizzes, or navigate to `/import` to drag-and-drop your own `.zip` archives or video folders.*

- **Electron Desktop Application**:
  ```bash
  pnpm dev:desktop
  ```

- **Python FastAPI Central Server (Optional)**:
  ```bash
  cd apps/server
  python -m venv .venv
  source .venv/bin/activate
  pip install -e .
  uvicorn app.main:app --host 127.0.0.1 --port 8000
  # API Docs: http://localhost:8000/docs
  ```

---

## 📦 Building Platform Packages

### 🪟 Windows Desktop (`.exe` Installer)
CourseNest uses `electron-builder` with an NSIS target to package standalone Windows installers:
```bash
# Build desktop assets
pnpm --filter @coursenest/client build
pnpm --filter @coursenest/desktop build

# Build Windows NSIS executable installer & portable .exe
cd apps/desktop
pnpm dist:win
# Output located in: apps/desktop/release/CourseNest-Setup-1.1.0.exe
```

#### 🛡️ Zero-Certificate Standalone Operation
CourseNest runs completely out-of-the-box in standard user-mode (`requestedExecutionLevel: asInvoker`) without needing administrator rights or any external code-signing certificate keys. Simply run the generated executable or portable `.exe` on any Windows 10/11 system. Optional Authenticode signing environment variables (`CSC_LINK` / `CSC_KEY_PASSWORD`) can still be provided if custom enterprise PKI or cloud signing is configured.

### 📱 Android Tablet & Mobile (`.apk`)
CourseNest uses Capacitor 7 to embed the React client into a native Android application:
```bash
# 1. Build the client web assets
pnpm --filter @coursenest/client build

# 2. Sync web assets into Android
cd apps/android
npx cap sync android

# 3. Compile the debug APK using Gradle
cd android
./gradlew assembleDebug
# Output APK: apps/android/android/app/build/outputs/apk/debug/app-debug.apk
```

### 🐧 Linux Desktop (`.AppImage` & `.deb`)
```bash
cd apps/desktop
pnpm dist:linux
# Output: apps/desktop/release/*.AppImage and *.deb
```

---

## 🧪 Testing & Verification

```bash
# 1. Monorepo unit test suites (importer, sqlite-adapter, domain)
pnpm -r test

# 2. Client TypeScript & Vite build
pnpm --filter @coursenest/client build

# 3. Model Context Protocol (MCP) server build & verification
pnpm --filter @coursenest/mcp-server build

# 4. FastAPI pytest suite
cd apps/server && .venv/bin/pytest -v

# 5. Comprehensive 50-Scenario Playwright End-to-End Suite
node scripts/test_all_scenarios.cjs
```

### 🛡️ Quality Assurance & Security Engineering
CourseNest is built with strict adherence to production-grade engineering principles:
* **Playwright E2E Automation**: Comprehensive 50-scenario test matrix verifying all 9 themes, video player, mini-window, slide presentation viewer, course studio, notes, and progress persistence.
* **Zip Slip & Path Traversal Guards**: Canonical boundary checks prevent unauthorized file writing or sandbox escaping.
* **Content Sandboxing**: Strict inert text extraction for untrusted code, HTML, and script files.
* **Zero Main-Thread Blocking**: All media processing, decompression, and IndexedDB transactions execute asynchronously without hitching the UI render loop.

---

## 📄 License

CourseNest is open-source software licensed under the **[Apache License 2.0](LICENSE)**.
Feel free to use, modify, distribute, and integrate CourseNest in personal, educational, or commercial projects.
