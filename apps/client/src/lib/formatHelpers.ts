/**
 * CourseNest Domain Format Helpers
 * Robust parsers and sanitizers for all supported course media and document types:
 * - Subtitle conversion: SRT -> WebVTT (strips UTF-8 BOM, standardizes commas to periods)
 * - Shortcut URL extraction: Windows .url, macOS .webloc, Linux .desktop
 * - Jupyter Notebook .ipynb parsing to readable markdown & Python cells
 * - HTML lecture sanitization & dark mode contrast preservation
 */

/**
 * Converts SubRip Subtitles (.srt) into standard WebVTT (.vtt)
 * Required by modern HTML5 <track> elements.
 */
export function srtToVtt(srtContent: string): string {
  return anySubtitleToVtt(srtContent, '.srt');
}

/**
 * Universal Subtitle to WebVTT Converter
 * Supports: .vtt, .srt, .sbv (YouTube), .ass/.ssa (SubStation Alpha),
 * .lrc (Lyrics), .sub (MicroDVD / SubViewer), and .ttml/.dfxp (XML).
 */
export function anySubtitleToVtt(content: string, filenameOrExt?: string): string {
  if (!content) return 'WEBVTT\n\n';

  let raw = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (raw.startsWith('WEBVTT')) {
    return `${raw}\n`;
  }

  const ext = (filenameOrExt?.split('.').pop() || '').toLowerCase();

  // 1. YouTube SBV format (0:01:23.456,0:01:25.789\nText)
  if (ext === 'sbv' || /^\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}/m.test(raw)) {
    const blocks = raw.split(/\n\s*\n/);
    const cues: string[] = ['WEBVTT\n'];
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 2 && lines[0]) {
        const timeMatch = lines[0].match(/^(\d{1,2}:\d{2}:\d{2}\.\d{3}),(\d{1,2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch && timeMatch[1] && timeMatch[2]) {
          const start = timeMatch[1].padStart(12, '00:');
          const end = timeMatch[2].padStart(12, '00:');
          const text = lines.slice(1).join('\n');
          cues.push(`${start} --> ${end}\n${text}\n`);
        }
      }
    }
    return cues.join('\n');
  }

  // 2. ASS / SSA format ([Events] -> Dialogue: 0,0:01:23.45,0:01:25.78,Default,,0,0,0,,Text)
  if (ext === 'ass' || ext === 'ssa' || raw.includes('[Events]') || raw.includes('Dialogue:')) {
    const lines = raw.split('\n');
    const cues: string[] = ['WEBVTT\n'];
    for (const line of lines) {
      if (line.startsWith('Dialogue:')) {
        const parts = line.replace('Dialogue:', '').trim().split(',');
        if (parts.length >= 10 && parts[1] && parts[2]) {
          const rawStart = parts[1].trim();
          const rawEnd = parts[2].trim();
          const rawText = parts.slice(9).join(',');

          const formatAssTime = (t: string) => {
            const p = t.split(':');
            const h = (p[0] || '0').padStart(2, '0');
            const m = (p[1] || '00').padStart(2, '0');
            const sParts = (p[2] || '00.00').split('.');
            const s = (sParts[0] || '00').padStart(2, '0');
            const ms = (sParts[1] || '000').padEnd(3, '0').slice(0, 3);
            return `${h}:${m}:${s}.${ms}`;
          };

          const cleanText = rawText.replace(/\{[^}]+\}/g, '').replace(/\\N/g, '\n').trim();
          if (cleanText) {
            cues.push(`${formatAssTime(rawStart)} --> ${formatAssTime(rawEnd)}\n${cleanText}\n`);
          }
        }
      }
    }
    if (cues.length > 1) return cues.join('\n');
  }

  // 3. LRC Lyric format ([01:23.45]Line text)
  if (ext === 'lrc' || /\[\d{2}:\d{2}(?:\.\d{2,3})?\]/.test(raw)) {
    const lines = raw.split('\n');
    const items: Array<{ sec: number; text: string }> = [];

    for (const line of lines) {
      const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/);
      if (match && match[1] && match[2]) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const totalSec = min * 60 + sec + ms / 1000;
        const text = (match[4] || '').trim();
        if (text) {
          items.push({ sec: totalSec, text });
        }
      }
    }

    if (items.length > 0) {
      items.sort((a, b) => a.sec - b.sec);
      const cues: string[] = ['WEBVTT\n'];

      const secToVttTime = (s: number) => {
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
      };

      for (let i = 0; i < items.length; i++) {
        const cur = items[i];
        if (!cur) continue;
        const nextItem = i + 1 < items.length ? items[i + 1] : undefined;
        const nextSec = nextItem ? nextItem.sec : cur.sec + 4;
        cues.push(`${secToVttTime(cur.sec)} --> ${secToVttTime(nextSec)}\n${cur.text}\n`);
      }
      return cues.join('\n');
    }
  }

  // 4. Default: Standard SRT format with comma milliseconds
  // Convert SRT comma millisecond timestamps to WebVTT period timestamps
  // e.g. 00:01:23,456 --> 00:01:25,789 becomes 00:01:23.456 --> 00:01:25.789
  let vtt = raw.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  // Ensure double digit hours
  vtt = vtt.replace(/^(\d{1}):(\d{2}:\d{2}\.\d{3})/gm, '0$1:$2');

  return `WEBVTT\n\n${vtt.trim()}\n`;
}

/**
 * Robust URL extractor across Windows .url (INI), macOS .webloc (plist),
 * Linux .desktop entries, and plain text URL files.
 */
export function extractUrlFromShortcutText(text: string): string {
  if (!text) return '';

  // 1. Standard INI / Desktop style: URL=https://...
  const iniMatch = text.match(/^\s*URL\s*=\s*(https?:\/\/[^\s\r\n"']+)/im);
  if (iniMatch && iniMatch[1]) return iniMatch[1].trim();

  // 2. macOS XML Plist .webloc: <string>https://...</string>
  const plistMatch = text.match(/<string>(https?:\/\/[^<]+)<\/string>/i);
  if (plistMatch && plistMatch[1]) return plistMatch[1].trim();

  // 3. Fallback: Any valid http/https URL anywhere in the document
  const anyUrlMatch = text.match(/https?:\/\/[^\s\r\n"'>)]+/i);
  if (anyUrlMatch && anyUrlMatch[0]) return anyUrlMatch[0].trim();

  return '';
}

/**
 * Converts a raw Jupyter Notebook (.ipynb JSON) into clean, structured Markdown
 * with distinct explanation sections and syntax-highlighted Python code cells.
 */
export function parseJupyterNotebook(jsonText: string, filename: string): string {
  try {
    const notebook = JSON.parse(jsonText);
    const cells = notebook.cells;

    if (!Array.isArray(cells)) {
      return `### 📓 ${filename}\n\n${jsonText.slice(0, 5000)}`;
    }

    const lines: string[] = [`### 📓 ${filename}\n\n*Interactive study notebook extracted for offline review.*\n`];

    let codeCellIndex = 1;

    for (const cell of cells) {
      const cellType = cell.cell_type;
      const rawSource = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');

      if (cellType === 'markdown') {
        lines.push(rawSource.trim());
        lines.push('');
      } else if (cellType === 'code') {
        lines.push(`**Python Snippet [${codeCellIndex++}]:**`);
        lines.push('```python');
        lines.push(rawSource.trim());
        lines.push('```\n');

        // Check for text outputs
        if (Array.isArray(cell.outputs) && cell.outputs.length > 0) {
          const textOutputs: string[] = [];
          for (const out of cell.outputs) {
            if (out.text) {
              textOutputs.push(Array.isArray(out.text) ? out.text.join('') : out.text);
            } else if (out.data && out.data['text/plain']) {
              const p = out.data['text/plain'];
              textOutputs.push(Array.isArray(p) ? p.join('') : p);
            }
          }
          if (textOutputs.length > 0) {
            lines.push('*Output:*');
            lines.push('```text');
            lines.push(textOutputs.join('\n').trim());
            lines.push('```\n');
          }
        }
      }
    }

    return lines.join('\n');
  } catch (err) {
    return `### 📓 ${filename}\n\n\`\`\`json\n${jsonText.slice(0, 5000)}\n\`\`\``;
  }
}

/**
 * Sanitizes and cleans course HTML lectures (e.g. from Teachable, Udemy, Coursera):
 * - Strips risky executable scripts and frames
 * - Strips broken SVG icon references
 * - Ensures external hyperlinks open in new windows safely
 * - Cleans up hardcoded light-theme color styles (e.g. gray #4e4e4e text) to preserve dark mode contrast
 */
export function sanitizeLectureHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  let html = rawHtml;

  // 1. Remove dangerous script and frame tags
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  html = html.replace(/<embed\b[^>]*>/gi, '');
  html = html.replace(/<meta\b[^>]*>/gi, '');
  html = html.replace(/<link\b[^>]*>/gi, '');

  // 2. Strip inline event handlers (e.g. onerror, onload, onclick) and javascript: pseudo-protocols
  html = html.replace(/\son[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  html = html.replace(/\s(href|src)\s*=\s*['"]?\s*javascript:[^'"]*['"]?/gi, ' $1="#"');

  // 3. Strip broken SVG sprites with xlink:href
  html = html.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // 4. Remove inline styles that clash with dark theme (e.g. hardcoded dark text colors)
  html = html.replace(/style="[^"]*color:\s*rgb\(\s*(?:[0-9]|[1-9][0-9]|1[0-2][0-9])\s*,\s*(?:[0-9]|[1-9][0-9]|1[0-2][0-9])\s*,\s*(?:[0-9]|[1-9][0-9]|1[0-2][0-9])\s*\)[^"]*"/gi, '');
  html = html.replace(/style="[^"]*background-color:\s*transparent[^"]*"/gi, '');

  // 5. Force links to open safely in new tab
  html = html.replace(/<a\s+(?!.*?target=)([^>]+)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>');

  return html;
}

export interface SubtitleCue {
  id: number;
  seconds: number;
  timestamp: string; // e.g. "02:15"
  text: string;
}

/**
 * Converts timestamp string (e.g. "02:15", "01:23:45", "00:02:15.250") into total seconds.
 */
export function timestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;
  const cleaned = timestamp.replace(/^[[(]/, '').replace(/[\])]$/, '').trim();
  const parts = cleaned.split(':');
  if (parts.length === 2) {
    const min = parseFloat(parts[0] || '0');
    const sec = parseFloat(parts[1] || '0');
    return Math.floor(min * 60 + sec);
  }
  if (parts.length === 3) {
    const hr = parseFloat(parts[0] || '0');
    const min = parseFloat(parts[1] || '0');
    const sec = parseFloat(parts[2] || '0');
    return Math.floor(hr * 3600 + min * 60 + sec);
  }
  return 0;
}

/**
 * Converts total seconds into clean mm:ss or hh:mm:ss string.
 */
export function secondsToTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parses WebVTT or SRT text into structured timestamped cues.
 */
export function parseSubtitleCues(vttOrSrtText: string): SubtitleCue[] {
  if (!vttOrSrtText) return [];

  const cues: SubtitleCue[] = [];
  const normalized = vttOrSrtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\n+/);

  let cueId = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let timeLine = '';
    let textLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line.includes('-->')) {
        timeLine = line;
        textLines = lines.slice(i + 1);
        break;
      }
    }

    if (!timeLine) continue;

    const match = timeLine.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}:\d{2}|\d{2}:\d{2})/);
    if (!match || !match[1]) continue;

    const rawStart = match[1];
    const seconds = timestampToSeconds(rawStart);
    const cleanText = textLines
      .join(' ')
      .replace(/<[^>]+>/g, '') // Strip HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText) {
      cues.push({
        id: cueId++,
        seconds,
        timestamp: secondsToTimestamp(seconds),
        text: cleanText,
      });
    }
  }

  return cues;
}

/**
 * Formats subtitle cues into a compact, token-efficient transcript for AI context.
 * Automatically consolidates contiguous cues into chronological paragraph chunks.
 */
export function formatSubtitleTranscriptForAi(vttOrSrtText: string, maxChars: number = 14000): string {
  const cues = parseSubtitleCues(vttOrSrtText);
  if (cues.length === 0) return '';

  const paragraphs: string[] = [];
  let currentTimestamp = '';
  let currentBuffer: string[] = [];

  for (const cue of cues) {
    if (!currentTimestamp) {
      currentTimestamp = cue.timestamp;
    }

    currentBuffer.push(cue.text);

    // Group cues into coherent chunks
    if (currentBuffer.length >= 4 || cue.text.endsWith('.') || cue.text.endsWith('?')) {
      paragraphs.push(`[${currentTimestamp}] ${currentBuffer.join(' ')}`);
      currentTimestamp = '';
      currentBuffer = [];
    }
  }

  if (currentBuffer.length > 0 && currentTimestamp) {
    paragraphs.push(`[${currentTimestamp}] ${currentBuffer.join(' ')}`);
  }

  const full = paragraphs.join('\n');
  return full.slice(0, maxChars);
}
