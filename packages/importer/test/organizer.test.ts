import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findLongestCommonPrefix,
  cleanSectionTitleAndPosition,
  parseNumberedName,
} from '../dist/index.js';

describe('Smarter Section Naming & Prefix Extraction', () => {
  it('detects common prefix across group of file/archive names', () => {
    const names = [
      'Python Full Stack Course Part 1',
      'Python Full Stack Course Part 2',
      'Python Full Stack Course Part 10',
    ];
    const prefix = findLongestCommonPrefix(names);
    assert.equal(prefix, 'Python Full Stack Course');
  });

  it('preserves whole words and avoids cutting words mid-token', () => {
    const names = [
      'Intro to Java',
      'Intro to JavaScript',
    ];
    const prefix = findLongestCommonPrefix(names);
    assert.equal(prefix, 'Intro to');
  });

  it('matches keyword+number at end of string when commonPrefix is empty', () => {
    const res = cleanSectionTitleAndPosition('Python Full Stack Course Part 1', '', 1);
    assert.equal(res.cleanTitle, 'Part 1');
    assert.equal(res.position, 1);
  });

  it('strips common prefix and generates clean section titles with numbering', () => {
    const prefix = 'Python Full Stack Course';
    const raw1 = 'Python Full Stack Course Part 1.zip';
    const raw2 = 'Python Full Stack Course Part 2.zip';
    const raw10 = 'Python Full Stack Course Part 10.zip';

    const res1 = cleanSectionTitleAndPosition(raw1, prefix, 1);
    const res2 = cleanSectionTitleAndPosition(raw2, prefix, 2);
    const res10 = cleanSectionTitleAndPosition(raw10, prefix, 3);

    assert.equal(res1.cleanTitle, 'Part 1');
    assert.equal(res1.position, 1);

    assert.equal(res2.cleanTitle, 'Part 2');
    assert.equal(res2.position, 2);

    assert.equal(res10.cleanTitle, 'Part 10');
    assert.equal(res10.position, 10);
  });

  it('detects diverse numbering patterns: lecture, module, chapter, episode, 01, 02', () => {
    assert.deepEqual(cleanSectionTitleAndPosition('Lecture 05 - Neural Networks', '', 1), {
      position: 5,
      cleanTitle: 'Lecture 05 - Neural Networks',
    });

    assert.deepEqual(cleanSectionTitleAndPosition('Module 02 - Async Programming', '', 1), {
      position: 2,
      cleanTitle: 'Module 02 - Async Programming',
    });

    assert.deepEqual(cleanSectionTitleAndPosition('Chapter 3 - Memory Management', '', 1), {
      position: 3,
      cleanTitle: 'Chapter 3 - Memory Management',
    });

    assert.deepEqual(cleanSectionTitleAndPosition('Episode 4 - Deploying to Cloud', '', 1), {
      position: 4,
      cleanTitle: 'Episode 4 - Deploying to Cloud',
    });

    assert.deepEqual(cleanSectionTitleAndPosition('01 - Introduction.mp4', '', 1), {
      position: 1,
      cleanTitle: 'Introduction',
    });
  });

  it('falls back cleanly when no numbering pattern exists', () => {
    const res = cleanSectionTitleAndPosition('Course Resources and Code Examples', '', 4);
    assert.equal(res.position, 4);
    assert.equal(res.cleanTitle, 'Course Resources and Code Examples');
  });
});
