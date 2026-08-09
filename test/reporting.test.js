import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJson, toCsv, toPdf } from '../core/reporting.js';

const RESULT_A = {
  success: true,
  data: { username: 'octocat', matches: [{ site: 'GitHub', found: true }] },
  provenance: { plugin: 'username-enum', pluginVersion: '1.0.0' },
  timestamp: '2026-08-09T12:00:00.000Z',
  confidence: 0.5,
};

const RESULT_B = {
  success: false,
  data: null,
  provenance: { plugin: 'metadata-extractor', stage: 'run' },
  timestamp: '2026-08-09T12:00:01.000Z',
  confidence: 0,
  error: 'Could not read file: ENOENT, "weird, name".txt',
};

test('toJson wraps a single result in an array and round-trips exactly', () => {
  const json = toJson(RESULT_A);
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed, [RESULT_A]);
});

test('toJson passes an array of results through unchanged', () => {
  const parsed = JSON.parse(toJson([RESULT_A, RESULT_B]));
  assert.deepEqual(parsed, [RESULT_A, RESULT_B]);
});

test('toCsv produces a header row plus one row per result, generic across plugins', () => {
  const csv = toCsv([RESULT_A, RESULT_B]);
  const lines = csv.trim().split('\n');

  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'plugin,pluginVersion,success,timestamp,confidence,error,data');
  assert.match(lines[1], /^username-enum,1\.0\.0,true,/);
  assert.match(lines[2], /^metadata-extractor,,false,/);
});

test('toCsv quotes fields containing commas/quotes per RFC 4180', () => {
  const csv = toCsv(RESULT_B);
  const dataLine = csv.trim().split('\n')[1];
  // The error message itself contains a comma and embedded quotes —
  // confirms escaping isn't just applied to the JSON `data` column.
  assert.match(dataLine, /"Could not read file: ENOENT, ""weird, name"".txt"/);
});

test('toPdf produces a byte-accurate, spec-shaped single-object-table PDF', () => {
  const pdf = toPdf([RESULT_A, RESULT_B]);
  const text = pdf.toString('latin1');

  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));

  // Every object body must live at exactly the byte offset the xref
  // table claims — this is what a real PDF reader depends on.
  const xrefMatch = text.match(/xref\n0 (\d+)\n([\s\S]*?)\ntrailer/);
  assert.ok(xrefMatch, 'xref table not found');
  const totalEntries = Number(xrefMatch[1]);
  const entryLines = xrefMatch[2].split('\n');
  assert.equal(entryLines.length, totalEntries);

  for (let objNum = 1; objNum < totalEntries; objNum++) {
    const offset = Number(entryLines[objNum].slice(0, 10));
    const slice = text.slice(offset, offset + `${objNum} 0 obj`.length);
    assert.equal(slice, `${objNum} 0 obj`, `object ${objNum} not found at its declared xref offset`);
  }

  const startxrefMatch = text.match(/startxref\n(\d+)\n%%EOF/);
  assert.ok(startxrefMatch);
  assert.equal(text.slice(Number(startxrefMatch[1]), Number(startxrefMatch[1]) + 4), 'xref');
});

test('toPdf paginates long reports across multiple Page objects', () => {
  const manyResults = Array.from({ length: 20 }, (_, i) => ({
    ...RESULT_A,
    provenance: { plugin: `fixture-plugin-${i}` },
  }));
  const text = toPdf(manyResults).toString('latin1');

  const pageCountMatch = text.match(/\/Type \/Pages \/Kids \[([^\]]*)\] \/Count (\d+)/);
  assert.ok(pageCountMatch);
  assert.ok(Number(pageCountMatch[2]) > 1, 'expected a long report to span more than one page');
});
