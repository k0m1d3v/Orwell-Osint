// Reference plugin: extracts basic metadata from a local file (JPEG EXIF,
// PDF /Info dict). Deliberately different pattern from username-enum — no
// network calls, input is a local file path, output is derived from
// bytes the operator already has.
//
// Deliberate scoping decision: EXIF GPS data is detected but never
// decoded or returned. `hasGpsData` is a boolean only. Coordinates
// embedded in a photo are location data about wherever it was taken —
// out of this plugin's low-sensitivity scope (sensitiveData: false).
// Returning actual coordinates would need sensitiveData/requiresConsent
// set to true, which belongs to a deliberate future decision, not a side
// effect of this plugin's output shape.

import { OsintPlugin } from '../../core/plugin-interface.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.pdf'];

const JPEG_SOI = 0xffd8;
const APP1_MARKER = 0xffe1;
const GPS_INFO_TAG = 0x8825;
const EXIF_TAGS = {
  0x010f: 'make',
  0x0110: 'model',
  0x0112: 'orientation',
  0x0131: 'software',
  0x0132: 'dateTime',
};

function detectFormat(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') return 'pdf';
  return 'unknown';
}

function readIfd(view, buffer, tiffStart, ifdOffset, littleEndian) {
  const entryCount = view.getUint16(tiffStart + ifdOffset, littleEndian);
  const tags = {};
  let hasGpsData = false;

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = tiffStart + ifdOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);

    if (tag === GPS_INFO_TAG) {
      hasGpsData = true;
      continue;
    }

    const name = EXIF_TAGS[tag];
    if (!name) continue;

    if (type === 2) {
      // ASCII, null-terminated. <=4 bytes stored inline in the value
      // field itself; longer strings are stored at an external offset.
      const valueOffset = count <= 4 ? entryOffset + 8 : tiffStart + view.getUint32(entryOffset + 8, littleEndian);
      const chars = [];
      for (let b = 0; b < count - 1; b++) chars.push(view.getUint8(valueOffset + b));
      tags[name] = String.fromCharCode(...chars);
    } else if (type === 3) {
      // SHORT, stored inline.
      tags[name] = view.getUint16(entryOffset + 8, littleEndian);
    }
  }

  return { tags, hasGpsData };
}

/**
 * Parses only the first APP1/Exif segment of a standard baseline JPEG.
 * Returns null if the file isn't a JPEG or has no Exif data. Non-standard
 * JPEGs (e.g. markers without a length field appearing before APP1) are a
 * known limitation — see this plugin's README.
 */
function parseJpegExif(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint16(0) !== JPEG_SOI) return null;

  let offset = 2;
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break;

    const segmentLength = view.getUint16(offset + 2);

    if (marker === APP1_MARKER) {
      const exifHeaderOffset = offset + 4;
      if (buffer.toString('ascii', exifHeaderOffset, exifHeaderOffset + 4) === 'Exif') {
        const tiffStart = exifHeaderOffset + 6;
        const littleEndian = buffer.toString('ascii', tiffStart, tiffStart + 2) === 'II';
        const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
        return readIfd(view, buffer, tiffStart, ifd0Offset, littleEndian);
      }
    }

    offset += 2 + segmentLength;
  }
  return null;
}

/**
 * Regex-based extraction of a PDF's plaintext /Info dictionary. Works for
 * common PDFs with an uncompressed trailer; does not decode object
 * streams or hex-string values — a known limitation, see this plugin's
 * README.
 */
function parsePdfInfo(buffer) {
  const text = buffer.toString('latin1');
  const extract = (key) => {
    const match = text.match(new RegExp(`/${key}\\s*\\(([^)]*)\\)`));
    return match ? match[1].trim() : null;
  };

  return {
    title: extract('Title'),
    author: extract('Author'),
    producer: extract('Producer'),
    creator: extract('Creator'),
    creationDate: extract('CreationDate'),
    modDate: extract('ModDate'),
  };
}

export default class MetadataExtractorPlugin extends OsintPlugin {
  static meta = {
    id: 'metadata-extractor',
    name: 'File Metadata Extractor',
    category: 'media',
    requiresApiKey: false,
    inputType: 'file-path',
    outputType: 'file-metadata',
  };

  async validate(input) {
    if (typeof input !== 'string' || input.length === 0) {
      return { valid: false, reason: 'Input must be a non-empty file path string' };
    }
    const ext = path.extname(input).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        reason: `Unsupported file type "${ext || '(none)'}" — supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      };
    }
    return { valid: true };
  }

  /**
   * @param {string} input - path to a local file
   * @param {object} [config]
   * @param {typeof readFile} [config.readFileImpl] - injectable for tests
   */
  async run(input, config = {}) {
    const readFileImpl = config.readFileImpl || readFile;

    let buffer;
    try {
      buffer = await readFileImpl(input);
    } catch (err) {
      return {
        success: false,
        data: null,
        provenance: { plugin: MetadataExtractorPlugin.meta.id, stage: 'run' },
        timestamp: new Date().toISOString(),
        confidence: 0,
        error: `Could not read file: ${err.message}`,
      };
    }

    const format = detectFormat(buffer);
    let metadata = null;
    if (format === 'jpeg') {
      const exif = parseJpegExif(buffer);
      metadata = { ...(exif?.tags ?? {}), hasGpsData: exif?.hasGpsData ?? false };
    } else if (format === 'pdf') {
      metadata = parsePdfInfo(buffer);
    }

    return {
      success: true,
      data: { path: input, format, sizeBytes: buffer.length, metadata },
      provenance: {
        plugin: MetadataExtractorPlugin.meta.id,
        pluginVersion: '1.0.0',
        sources: ['local file'],
      },
      timestamp: new Date().toISOString(),
      confidence: metadata ? 1 : 0.2,
    };
  }
}
