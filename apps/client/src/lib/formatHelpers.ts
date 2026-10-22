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
  if (!srtContent) return 'WEBVTT\n\n';

  // Strip UTF-8 Byte Order Mark (BOM) if present
  let vtt = srtContent.replace(/^\uFEFF/, '');

  // Normalize Windows \r\n and classic Mac \r into standard \n
  vtt = vtt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Convert SRT comma millisecond timestamps to WebVTT period timestamps
  // e.g. 00:01:23,456 --> 00:01:25,789 becomes 00:01:23.456 --> 00:01:25.789
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  // If it doesn't already have WEBVTT header, prepend it
  if (!vtt.startsWith('WEBVTT')) {
    vtt = `WEBVTT\n\n${vtt.trim()}\n`;
  }

  return vtt;
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

  // 2. Strip broken SVG sprites with xlink:href
  html = html.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // 3. Remove inline styles that clash with dark theme (e.g. hardcoded dark text colors)
  html = html.replace(/style="[^"]*color:\s*rgb\(\s*(?:[0-9]|[1-9][0-9]|1[0-2][0-9])\s*,\s*(?:[0-9]|[1-9][0-9]|1[0-2][0-9])\s*,\s*(?:[0-9]|[1-9][0-9]|1[0-2][0-9])\s*\)[^"]*"/gi, '');
  html = html.replace(/style="[^"]*background-color:\s*transparent[^"]*"/gi, '');

  // 4. Force links to open safely in new tab
  html = html.replace(/<a\s+(?!.*?target=)([^>]+)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>');

  return html;
}
