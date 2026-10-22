import { open } from 'fs/promises';
import { ResourceType } from '@coursenest/domain';
import {
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_AUDIO_EXTENSIONS,
  SUPPORTED_DOCUMENT_EXTENSIONS,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_CODE_EXTENSIONS,
  SUPPORTED_ARCHIVE_EXTENSIONS,
} from '@coursenest/config';

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.epub': 'application/epub+zip',
  '.srt': 'text/vtt',
  '.vtt': 'text/vtt',
  '.url': 'text/plain',
  '.webloc': 'text/plain',
  '.desktop': 'text/plain',
  '.ipynb': 'application/x-ipynb+json',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.csv': 'text/csv',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript-jsx',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript-jsx',
  '.py': 'text/x-python',
  '.java': 'text/x-java-source',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.tgz': 'application/gzip',
};

export function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index !== -1 ? filename.slice(index).toLowerCase() : '';
}

export function detectResourceType(filename: string): ResourceType {
  const ext = getFileExtension(filename);

  if ((SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.Video;
  if ((SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.Audio;
  if (ext === '.pdf') return ResourceType.PDF;
  if ((SUPPORTED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.Document;
  if ((SUPPORTED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.Image;
  if (ext === '.html') return ResourceType.HTML;
  if (ext === '.md' || ext === '.markdown') return ResourceType.Markdown;
  if (ext === '.epub') return ResourceType.Document;
  if (ext === '.ipynb') return ResourceType.SourceCode;
  if (['.srt', '.vtt'].includes(ext)) return ResourceType.Document;
  if (['.url', '.webloc', '.desktop'].includes(ext)) return ResourceType.Document;
  if ((SUPPORTED_CODE_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.SourceCode;
  if ((SUPPORTED_ARCHIVE_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.Archive;
  if (ext === '.csv') return ResourceType.Dataset;

  return ResourceType.Unknown;
}

/**
 * Sniff MIME type from raw buffer magic numbers (checking the first 512 bytes).
 */
export function sniffMimeTypeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 2) return null;

  // 1. Archives & Compressed formats
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return 'application/zip';
  }
  if (buffer[0] === 0x1F && buffer[1] === 0x8B) {
    return 'application/gzip';
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === '7z\xbc\xaf\x27\x1c') {
    return 'application/x-7z-compressed';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'Rar!') {
    return 'application/vnd.rar';
  }
  if (buffer.length >= 262 && buffer.subarray(257, 262).toString('ascii') === 'ustar') {
    return 'application/x-tar';
  }

  // 2. Documents
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return 'application/pdf';
  }

  // 3. Images
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a')) {
    return 'image/gif';
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }

  // 4. Video & Audio
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return 'video/mp4';
  }
  if (buffer.length >= 4 && buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return 'video/webm';
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') {
    return 'audio/wav';
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).toString('ascii') === 'ID3') {
    return 'audio/mpeg';
  }

  // 5. Executable Script Shebangs
  const prefix = buffer.subarray(0, Math.min(64, buffer.length)).toString('utf-8');
  if (prefix.startsWith('#!/bin/bash') || prefix.startsWith('#!/bin/sh') || prefix.startsWith('#!/usr/bin/env bash') || prefix.startsWith('#!/usr/bin/env sh')) {
    return 'application/x-sh';
  }
  if (prefix.startsWith('#!/usr/bin/env python') || prefix.startsWith('#!/usr/bin/python')) {
    return 'text/x-python';
  }
  if (prefix.startsWith('#!/usr/bin/env node')) {
    return 'text/javascript';
  }

  return null;
}

/**
 * Sniff MIME type by reading the first 512 bytes of a file on disk.
 */
export async function sniffMimeType(filePath: string): Promise<string | null> {
  try {
    const handle = await open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(512);
      const { bytesRead } = await handle.read(buffer, 0, 512, 0);
      if (bytesRead === 0) return null;
      return sniffMimeTypeFromBuffer(buffer.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

/**
 * Detect MIME type using extension with optional magic byte buffer sniffing fallback.
 */
export function detectMimeType(filename: string, buffer?: Buffer): string {
  if (buffer && buffer.length > 0) {
    const sniffed = sniffMimeTypeFromBuffer(buffer);
    if (sniffed) return sniffed;
  }

  const ext = getFileExtension(filename);
  if (MIME_MAP[ext]) return MIME_MAP[ext];

  return 'application/octet-stream';
}
