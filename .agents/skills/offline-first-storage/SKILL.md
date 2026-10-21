---
name: offline-first-storage
description: >-
  Architectural patterns and procedures for local-first, offline-first course management,
  multi-archive ingestion, atomic rollback/commit pipelines, decoupled storage tiers
  (internal learning state vs removable external media), and storage disconnection resilience.
---

# Offline-First Storage Architecture Skill

This skill governs the local-first storage design, multi-ZIP decompression, atomic ingestion, and external media handling for the Korse platform.

## 1. Storage Tier Decoupling Principle
- **Core Rule**: User learning state (enrollments, lesson progress, bookmarks, notes, quiz results) must **never** depend on external media or cloud connectivity.
  - **Tier 1 (Internal App Vault)**: Local SQLite (or IndexedDB on web) storing user records, courses metadata, structured outlines, text lesson content, and system logs. This tier is always persistent and available.
  - **Tier 2 (External Media Assets)**: Large multimedia files (1080p/4K MP4, MKV, high-res PDFs) can reside on internal disk, SD cards, or external USB drives.
- **Disconnection Resilience**:
  - The application must detect when an external storage mount is disconnected.
  - When disconnected, the UI must display a clear, non-blocking notification with instructions (e.g., "Drive disconnected. Please reconnect or configure storage path in Settings").
  - The application must never crash, wipe progress, or corrupt manifests when media assets become temporarily unreachable.

## 2. Multi-Archive Batch Ingestion & Curriculum Aggregation
- **Unified Course Import**:
  - Courses frequently span multiple archive volumes (e.g., `Course_Part1.zip`, `Course_Part2.zip`, or separate modules).
  - The importer extracts all archives into an isolated temporary staging directory (`/tmp/korse-import-{uuid}`).
  - Files are discovered recursively and aggregated into a unified hierarchy.
  - Module directories are grouped into logical Sections, and media files within each section are converted into sequential Lessons.
- **Atomic Staging, Commit & Rollback**:
  - Decompression occurs in a scratch staging folder.
  - If any critical error occurs (corruption, Zip Slip attempt, disk exhaustion, or abort by user), `AtomicImportManager.rollback()` cleans up all staged files immediately.
  - Only when all validation and metadata checks pass is the course committed to the persistent vault.

## 3. Storage Adapters & Abstraction Contracts
- All storage backends implement standard interfaces (`IStorageAdapter` / `ICourseRepository`):
  - `FileSystemStorageAdapter`: Node/Electron environment file I/O.
  - `IndexedDBStorageAdapter`: Web browser local persistence.
  - `MemoryStorageAdapter`: In-memory isolated testing.
- Platform code must program to the adapter interface, allowing seamless switching across Electron, browser, and mobile environments.
