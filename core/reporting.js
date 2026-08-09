// Generic export layer: turns any plugin's standard result shape
// ({ success, data, provenance, timestamp, confidence } — see
// plugin-interface.js) into JSON, CSV, or PDF, without any plugin-
// specific code. This is the payoff of every plugin returning the same
// shape: this file never needs to know which plugin produced a result.
//
// Every export function accepts either a single result or an array of
// results (a "report" is usually more than one run).

export function toJson(results) {
  return JSON.stringify(toArray(results), null, 2);
}

const CSV_COLUMNS = ['plugin', 'pluginVersion', 'success', 'timestamp', 'confidence', 'error', 'data'];

export function toCsv(results) {
  const rows = toArray(results).map((result) => {
    const provenance = result.provenance || {};
    return [
      provenance.plugin ?? '',
      provenance.pluginVersion ?? '',
      result.success,
      result.timestamp,
      result.confidence,
      result.error ?? '',
      JSON.stringify(result.data),
    ]
      .map(csvEscape)
      .join(',');
  });
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

export function toPdf(results) {
  const pages = paginate(buildReportLines(toArray(results)));
  return renderPdf(pages);
}

function toArray(results) {
  return Array.isArray(results) ? results : [results];
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// --- PDF -----------------------------------------------------------
//
// Hand-rolled rather than a dependency: the report content is plain
// text, and a correct-but-minimal PDF (one standard font, no images, no
// compression) is a well-understood, boundable amount of code. Byte
// offsets for the xref table are computed from what's actually written,
// not calculated by hand, which is what makes this safe to maintain.

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 40;
const FONT_SIZE = 9;
const LINE_HEIGHT = 11;
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / LINE_HEIGHT);

function buildReportLines(results) {
  const lines = ['Orwell OSINT Report', `Generated: ${new Date().toISOString()}`, ''];
  for (const result of results) {
    const provenance = result.provenance || {};
    lines.push(`== ${provenance.plugin ?? 'unknown-plugin'} ==`);
    lines.push(...JSON.stringify(result, null, 2).split('\n'));
    lines.push('');
  }
  return lines;
}

function paginate(lines) {
  const pages = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  return pages.length > 0 ? pages : [[]];
}

// PDF's base-14 fonts default to StandardEncoding, which doesn't
// reliably cover characters outside printable ASCII. Rather than take on
// WinAnsiEncoding mapping edge cases, non-ASCII characters are replaced
// with "?" in the PDF export only — a deliberate, visible limitation,
// not a silent mangling. JSON/CSV exports are unaffected.
function pdfEscapeText(line) {
  return line
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildContentStream(pageLines) {
  const startY = PAGE_HEIGHT - MARGIN;
  const textOps = pageLines.map((line) => `(${pdfEscapeText(line)}) Tj T*`).join('\n');
  return `BT /F1 ${FONT_SIZE} Tf ${MARGIN} ${startY} Td ${LINE_HEIGHT} TL\n${textOps}\nET`;
}

function renderPdf(pages) {
  // Object numbering, decided up front so objects can reference each
  // other by number: 1 = Catalog, 2 = Pages, 3 = Font, then one
  // (Page, Contents) object pair per page starting at 4.
  const pageObjNums = pages.map((_, i) => 4 + i * 2);
  const contentObjNums = pages.map((_, i) => 5 + i * 2);
  const totalObjects = 3 + pages.length * 2;

  const bodies = new Array(totalObjects + 1); // 1-indexed; index 0 unused
  bodies[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  bodies[2] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  bodies[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  pages.forEach((pageLines, i) => {
    const pageNum = pageObjNums[i];
    const contentNum = contentObjNums[i];
    bodies[pageNum] =
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R >> >> ` +
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentNum} 0 R >>`;
    const stream = buildContentStream(pageLines);
    bodies[contentNum] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });

  const header = '%PDF-1.4\n';
  const chunks = [header];
  const offsets = new Array(totalObjects + 1);
  let byteOffset = Buffer.byteLength(header, 'latin1');

  for (let n = 1; n <= totalObjects; n++) {
    offsets[n] = byteOffset;
    const objectText = `${n} 0 obj\n${bodies[n]}\nendobj\n`;
    chunks.push(objectText);
    byteOffset += Buffer.byteLength(objectText, 'latin1');
  }

  const xrefOffset = byteOffset;
  // Each xref entry is a fixed 20 bytes: 10-digit offset, space,
  // 5-digit generation, space, f/n flag, space, 2-byte EOL.
  let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= totalObjects; n++) {
    xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }
  chunks.push(xref);
  chunks.push(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(''), 'latin1');
}
