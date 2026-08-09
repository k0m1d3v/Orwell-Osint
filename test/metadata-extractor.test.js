import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pipeline } from '../core/pipeline.js';
import { AuditLog } from '../core/audit-log.js';
import { loadPlugin } from '../core/plugin-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
const NOOP_AUDIT_LOG = new AuditLog({ enabled: false });

// A minimal hand-built JPEG: SOI, one APP1/Exif segment with a
// little-endian TIFF IFD0 containing Make="Co", Model="Pxl", and a
// GPSInfo tag (0x8825) — enough to exercise the parser's inline-ASCII
// and GPS-detection paths without needing a real photo fixture.
const MINIMAL_JPEG_WITH_EXIF = Buffer.from([
  0xff, 0xd8, // SOI
  0xff, 0xe1, 0x00, 0x3a, // APP1, length 58
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
  0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header (little-endian), IFD0 @ offset 8
  0x03, 0x00, // IFD0: 3 entries
  0x0f, 0x01, 0x02, 0x00, 0x03, 0x00, 0x00, 0x00, 0x43, 0x6f, 0x00, 0x00, // Make = "Co"
  0x10, 0x01, 0x02, 0x00, 0x04, 0x00, 0x00, 0x00, 0x50, 0x78, 0x6c, 0x00, // Model = "Pxl"
  0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // GPSInfo pointer (presence only)
  0x00, 0x00, 0x00, 0x00, // next IFD offset (none)
]);

const MINIMAL_PDF_WITH_INFO = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Title (Test Doc) /Author (Jane Doe) /Producer (Orwell Test) >>\nendobj\n',
  'latin1',
);

test('extracts JPEG EXIF tags and detects (without decoding) GPS presence', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'metadata-extractor');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const readFileImpl = async () => MINIMAL_JPEG_WITH_EXIF;
  const result = await pipeline.runPlugin(loadedPlugin, '/fake/photo.jpg', { readFileImpl });

  assert.equal(result.success, true);
  assert.equal(result.data.format, 'jpeg');
  assert.equal(result.data.metadata.make, 'Co');
  assert.equal(result.data.metadata.model, 'Pxl');
  assert.equal(result.data.metadata.hasGpsData, true);
  assert.equal('gps' in result.data.metadata, false);
  assert.equal(JSON.stringify(result.data.metadata).toLowerCase().includes('lat'), false);
});

test('extracts PDF /Info dictionary fields', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'metadata-extractor');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const readFileImpl = async () => MINIMAL_PDF_WITH_INFO;
  const result = await pipeline.runPlugin(loadedPlugin, '/fake/doc.pdf', { readFileImpl });

  assert.equal(result.success, true);
  assert.equal(result.data.format, 'pdf');
  assert.equal(result.data.metadata.title, 'Test Doc');
  assert.equal(result.data.metadata.author, 'Jane Doe');
  assert.equal(result.data.metadata.producer, 'Orwell Test');
});

test('rejects unsupported file extensions at validate()', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'metadata-extractor');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const result = await pipeline.runPlugin(loadedPlugin, '/fake/file.exe', {
    readFileImpl: async () => {
      throw new Error('should not be called for invalid input');
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.provenance.stage, 'validate');
});

test('returns a standard failure result when the file cannot be read', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'metadata-extractor');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const readFileImpl = async () => {
    throw new Error('ENOENT: no such file or directory');
  };
  const result = await pipeline.runPlugin(loadedPlugin, '/fake/missing.jpg', { readFileImpl });

  assert.equal(result.success, false);
  assert.equal(result.data, null);
  assert.match(result.error, /ENOENT/);
});
