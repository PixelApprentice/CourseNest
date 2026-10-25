/**
 * CourseNest Multi-Modal AI Chunker
 * Chunks transcripts, slide presentations, and documents into structured semantic segments
 * with precise temporal ([mm:ss]) and spatial ([Slide X]) provenance.
 */

export interface BaseChunk {
  id: string;
  sourceType: 'transcript' | 'slide' | 'document';
  courseId: string;
  lessonId: string;
  content: string;
  citationBadge: string; // e.g. "[04:22]" or "[Slide 3]"
  tokensEstimate: number;
}

export interface TranscriptChunk extends BaseChunk {
  sourceType: 'transcript';
  startTimeSeconds: number;
  endTimeSeconds: number;
  speaker?: string;
}

export interface SlideChunk extends BaseChunk {
  sourceType: 'slide';
  slideNumber: number;
  slideTitle: string;
  speakerNotes?: string;
  bullets: string[];
}

export interface DocumentChunk extends BaseChunk {
  sourceType: 'document';
  heading?: string;
  paragraphIndex: number;
}

export type AiChunk = TranscriptChunk | SlideChunk | DocumentChunk;

/**
 * Splits subtitle/transcript text into overlapping temporal windows with timestamps.
 * Expected input: WebVTT formatted or lines like "[01:30] Professor speech text..."
 */
export function chunkSubtitles(
  transcriptText: string,
  courseId: string,
  lessonId: string,
  targetWindowSeconds = 60,
  overlapSeconds = 15,
): TranscriptChunk[] {
  if (!transcriptText || !transcriptText.trim()) return [];

  // Parse lines with timestamps: [mm:ss] or [hh:mm:ss]
  const rawLines = transcriptText.split('\n');
  const timedLines: Array<{ seconds: number; tsLabel: string; text: string }> = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Regex for [mm:ss] or [hh:mm:ss]
    const match = trimmed.match(/^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*(.*)$/);
    if (match && match[1] && match[2]) {
      let secs = 0;
      if (match[3] !== undefined) {
        // hh:mm:ss
        secs = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
      } else {
        // mm:ss
        secs = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
      timedLines.push({
        seconds: secs,
        tsLabel: match[0].split(']')[0]! + ']',
        text: match[4] || '',
      });
    } else if (timedLines.length > 0) {
      // Append continuation text to previous timed line
      timedLines[timedLines.length - 1]!.text += ' ' + trimmed;
    }
  }

  if (timedLines.length === 0) {
    // Fallback: create single chunk
    return [
      {
        id: `tr-${lessonId}-0`,
        sourceType: 'transcript',
        courseId,
        lessonId,
        startTimeSeconds: 0,
        endTimeSeconds: 60,
        content: transcriptText.slice(0, 1500),
        citationBadge: '[00:00]',
        tokensEstimate: Math.round(transcriptText.length / 4),
      },
    ];
  }

  const chunks: TranscriptChunk[] = [];
  let currentWindow: typeof timedLines = [];
  let windowStartSec = timedLines[0]!.seconds;
  let chunkIndex = 0;

  for (let i = 0; i < timedLines.length; i++) {
    const item = timedLines[i]!;
    currentWindow.push(item);

    const windowDuration = item.seconds - windowStartSec;
    if (windowDuration >= targetWindowSeconds || i === timedLines.length - 1) {
      const startItem = currentWindow[0]!;
      const endItem = currentWindow[currentWindow.length - 1]!;
      const combinedText = currentWindow.map((c) => c.text).filter(Boolean).join(' ');

      chunks.push({
        id: `tr-${lessonId}-${chunkIndex++}`,
        sourceType: 'transcript',
        courseId,
        lessonId,
        startTimeSeconds: startItem.seconds,
        endTimeSeconds: endItem.seconds,
        citationBadge: startItem.tsLabel,
        content: combinedText,
        tokensEstimate: Math.round(combinedText.length / 4),
      });

      // Retain items within overlapSeconds for sliding window continuity
      const cutoffSec = endItem.seconds - overlapSeconds;
      currentWindow = currentWindow.filter((c) => c.seconds >= cutoffSec);
      windowStartSec = currentWindow.length > 0 ? currentWindow[0]!.seconds : item.seconds;
    }
  }

  return chunks;
}

/**
 * Chunks PowerPoint slide decks into structured slide-by-slide units
 * capturing slide title, body bullets, and speaker notes.
 */
export function chunkPptxSlides(
  slides: Array<{
    slideNumber: number;
    title: string;
    bullets: string[];
    speakerNotes?: string;
  }>,
  courseId: string,
  lessonId: string,
): SlideChunk[] {
  return slides.map((s) => {
    const parts: string[] = [];
    if (s.title) parts.push(`Slide Title: ${s.title}`);
    if (s.bullets && s.bullets.length > 0) {
      parts.push(`Key Points:\n${s.bullets.map((b) => `- ${b}`).join('\n')}`);
    }
    if (s.speakerNotes && s.speakerNotes.trim()) {
      parts.push(`Presenter Notes: ${s.speakerNotes.trim()}`);
    }

    const fullContent = parts.join('\n\n');

    return {
      id: `sl-${lessonId}-${s.slideNumber}`,
      sourceType: 'slide',
      courseId,
      lessonId,
      slideNumber: s.slideNumber,
      slideTitle: s.title || `Slide ${s.slideNumber}`,
      speakerNotes: s.speakerNotes,
      bullets: s.bullets || [],
      citationBadge: `[Slide ${s.slideNumber}]`,
      content: fullContent,
      tokensEstimate: Math.round(fullContent.length / 4),
    };
  });
}

/**
 * Chunks long markdown or text reading materials into semantic sections.
 */
export function chunkDocument(
  text: string,
  courseId: string,
  lessonId: string,
  maxChunkChars = 800,
): DocumentChunk[] {
  if (!text || !text.trim()) return [];

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: DocumentChunk[] = [];
  let buffer = '';
  let chunkIndex = 0;
  let activeHeading = 'Overview';

  for (const para of paragraphs) {
    // Check if paragraph is a heading
    const headingMatch = para.match(/^#{1,4}\s+(.+)$/m);
    if (headingMatch && headingMatch[1]) {
      activeHeading = headingMatch[1].trim();
    }

    if (buffer.length + para.length > maxChunkChars && buffer.length > 0) {
      chunks.push({
        id: `doc-${lessonId}-${chunkIndex++}`,
        sourceType: 'document',
        courseId,
        lessonId,
        heading: activeHeading,
        paragraphIndex: chunkIndex,
        citationBadge: `[${activeHeading}]`,
        content: buffer.trim(),
        tokensEstimate: Math.round(buffer.length / 4),
      });
      buffer = '';
    }

    buffer += (buffer ? '\n\n' : '') + para.trim();
  }

  if (buffer.trim()) {
    chunks.push({
      id: `doc-${lessonId}-${chunkIndex++}`,
      sourceType: 'document',
      courseId,
      lessonId,
      heading: activeHeading,
      paragraphIndex: chunkIndex,
      citationBadge: `[${activeHeading}]`,
      content: buffer.trim(),
      tokensEstimate: Math.round(buffer.length / 4),
    });
  }

  return chunks;
}
