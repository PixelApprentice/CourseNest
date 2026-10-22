import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectResourceType, detectMimeType } from '../dist/index.js';
import { ResourceType } from '@coursenest/domain';

// Import format helpers from client source
import {
  srtToVtt,
  extractUrlFromShortcutText,
  parseJupyterNotebook,
  sanitizeLectureHtml,
} from '../../../apps/client/src/lib/formatHelpers.ts';

describe('Domain Formats & Extension Resiliency', () => {
  it('correctly maps domain file extensions to resource and MIME types', () => {
    assert.equal(detectResourceType('lecture.srt'), ResourceType.Document);
    assert.equal(detectResourceType('lecture.vtt'), ResourceType.Document);
    assert.equal(detectResourceType('handout.epub'), ResourceType.Document);
    assert.equal(detectResourceType('exercise.ipynb'), ResourceType.SourceCode);
    assert.equal(detectResourceType('resource.url'), ResourceType.Document);
    assert.equal(detectResourceType('resource.webloc'), ResourceType.Document);
    assert.equal(detectResourceType('resource.desktop'), ResourceType.Document);

    assert.equal(detectMimeType('subtitles.srt'), 'text/vtt');
    assert.equal(detectMimeType('subtitles.vtt'), 'text/vtt');
    assert.equal(detectMimeType('book.epub'), 'application/epub+zip');
    assert.equal(detectMimeType('notebook.ipynb'), 'application/x-ipynb+json');
    assert.equal(detectMimeType('link.url'), 'text/plain');
  });

  it('converts SRT subtitles with BOM and commas to standard WebVTT', () => {
    const rawSrt = '\uFEFF1\r\n00:00:01,250 --> 00:00:04,500\r\nWelcome to CourseNest.\r\n\r\n2\r\n00:00:05,000 --> 00:00:08,120\r\nOffline learning without cloud tracking.\r\n';
    const vtt = srtToVtt(rawSrt);

    assert.ok(vtt.startsWith('WEBVTT\n\n'), 'Must start with WEBVTT header');
    assert.ok(!vtt.includes('\uFEFF'), 'Must strip UTF-8 BOM');
    assert.ok(vtt.includes('00:00:01.250 --> 00:00:04.500'), 'Must convert comma to dot');
    assert.ok(vtt.includes('00:00:05.000 --> 00:00:08.120'), 'Must convert second timestamp');
    assert.ok(vtt.includes('Welcome to CourseNest.'), 'Must preserve cue text');
  });

  it('extracts target URLs from Windows .url, macOS .webloc, and Linux .desktop', () => {
    // 1. Windows .url
    const winUrl = '[InternetShortcut]\r\nURL=https://t.me/linkedin_learning\r\n';
    assert.equal(extractUrlFromShortcutText(winUrl), 'https://t.me/linkedin_learning');

    // 2. macOS .webloc
    const macWebloc = '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n<key>URL</key>\n<string>https://zerotomastery.io/courses/</string>\n</dict>\n</plist>';
    assert.equal(extractUrlFromShortcutText(macWebloc), 'https://zerotomastery.io/courses/');

    // 3. Linux .desktop
    const linuxDesktop = '[Desktop Entry]\nType=Link\nName=Docs\nURL=https://docs.python.org/3/\n';
    assert.equal(extractUrlFromShortcutText(linuxDesktop), 'https://docs.python.org/3/');

    // 4. Plain text fallback
    const plainText = 'For additional materials, visit https://github.com/coursenest/app today.';
    assert.equal(extractUrlFromShortcutText(plainText), 'https://github.com/coursenest/app');
  });

  it('parses Jupyter Notebook (.ipynb) cells into readable markdown and code snippets', () => {
    const notebookJson = JSON.stringify({
      cells: [
        {
          cell_type: 'markdown',
          source: ['# LangChain & Vectors\n', 'Overview of vector similarity search.'],
        },
        {
          cell_type: 'code',
          source: ['import numpy as np\n', 'print("Dimensions:", 1536)'],
          outputs: [{ text: ['Dimensions: 1536\n'] }],
        },
      ],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 2,
    });

    const parsed = parseJupyterNotebook(notebookJson, '01_vectors.ipynb');
    assert.ok(parsed.includes('### 📓 01_vectors.ipynb'), 'Includes title header');
    assert.ok(parsed.includes('# LangChain & Vectors'), 'Includes markdown cell header');
    assert.ok(parsed.includes('```python'), 'Fences code cell in python block');
    assert.ok(parsed.includes('import numpy as np'), 'Preserves code contents');
    assert.ok(parsed.includes('Dimensions: 1536'), 'Preserves code output');
  });

  it('sanitizes HTML lecture files and preserves high-contrast dark theme', () => {
    const dirtyHtml = `
      <script>alert("xss")</script>
      <meta id="tracking" data-test="true" />
      <svg><use xlink:href="#broken_icon"></use></svg>
      <h2 style="color: rgb(78, 78, 78); background-color: transparent;">Course Overview</h2>
      <p>Click <a href="https://example.com">here to join</a> the group.</p>
    `;

    const clean = sanitizeLectureHtml(dirtyHtml);
    assert.ok(!clean.includes('<script>'), 'Must strip script tags');
    assert.ok(!clean.includes('<meta'), 'Must strip meta tags');
    assert.ok(!clean.includes('<svg'), 'Must strip broken SVG sprites');
    assert.ok(!clean.includes('color: rgb(78, 78, 78)'), 'Must strip low-contrast light colors');
    assert.ok(!clean.includes('background-color: transparent'), 'Must strip transparent background');
    assert.ok(clean.includes('target="_blank" rel="noopener noreferrer"'), 'Must force links to open safely');
    assert.ok(clean.includes('Course Overview'), 'Must preserve lecture text');
  });
});
