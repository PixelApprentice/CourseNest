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
}

const MAGIC_MAP = [
  { magic: Buffer.from('PK\x03\x04'), mimeType: 'application/zip' },
  { magic: Buffer.from('\x1f\x8b'), mimeType: 'application/gzip' },
  { magic: Buffer.from('Rar!'), mimeType: 'application/vnd.rar' },
  { magic: Buffer.from('7z\xbc\xaf\x27\x1c'), mimeType: 'application/x-7z-compressed' },
  { magic: Buffer.from('<script'), mimeType: 'text/javascript' },
  { magic: Buffer.from('#!/bin/bash'), mimeType: 'application/x-sh' },
  { magic: Buffer.from('#!/bin/sh'), mimeType: 'application/x-sh' },
  { magic: Buffer.from('#!/usr/bin/env python'), mimeType: 'text/x-python' },
  { magic: Buffer.from('#!/usr/bin/env node'), mimeType: 'text/javascript' },
  { magic: Buffer.from('GIF8'), mimeType: 'image/gif' },
  { magic: Buffer.from('BM'), mimeType: 'image/bmp' },
  { magic: Buffer.from('\x89PNG'), mimeType: 'image/png' },
  { magic: Buffer.from('JFIF'), mimeType: 'image/jpeg' },
  { magic: Buffer.from('EXIF'), mimeType: 'image/jpeg' },
];

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
  if ((SUPPORTED_CODE_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.SourceCode;
  if ((SUPPORTED_ARCHIVE_EXTENSIONS as readonly string[]).includes(ext)) return ResourceType.Archive;
  if (ext === '.csv') return ResourceType.Dataset;

  return ResourceType.Unknown;
}

export function detectMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  if (MIME_MAP[ext]) return MIME_MAP[ext];
  return sniffMimeTypeFromFilename(filename) ?? 'application/octet-stream';
}

function sniffMimeTypeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const entry of MAGIC_MAP) {
    const magicStr = entry.magic.toString('utf-8').toLowerCase();
    if (lower.includes(magicStr)) return entry.mimeType;
  }
  return null;
}

export function sniffMimeTypeFromBuffer(buffer: Buffer): string | null {
  for (const entry of MAGIC_MAP) {
    if (buffer.length < entry.magic.length) continue;
    const target = buffer.slice(0, entry.magic.length);
    if (target.equals(entry.magic)) return entry.mimeType;
  }
  return null;
}