import { inflateRawSync } from "node:zlib";

/**
 * Lector mínimo de .xlsx (la primera hoja como filas de texto), sin
 * dependencias: un .xlsx es un ZIP con XML adentro, y Node ya trae zlib.
 * Alcanza para la plantilla de importación (texto y números); no evalúa
 * fórmulas (usa el último valor calculado que guardó Excel) ni lee
 * formatos. Solo server (admin).
 *
 * Por qué no una librería: SheetJS publica fuera de npm y la versión de
 * npm tiene vulnerabilidades sin parche; las alternativas livianas arrastran
 * unzippers propios. Para leer una hoja de texto, ~150 líneas propias son
 * más seguras y no suman nada al bundle.
 */

export class XlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxError";
  }
}

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readZipEntries(buf: Buffer): Map<string, ZipEntry> {
  // End of central directory: firma 0x06054b50, en los últimos 64 KB.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new XlsxError("El archivo no es un .xlsx válido.");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new XlsxError("ZIP dañado.");
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, { name, method, compressedSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readEntry(buf: Buffer, entry: ZipEntry): string {
  const p = entry.localOffset;
  if (buf.readUInt32LE(p) !== 0x04034b50) throw new XlsxError("ZIP dañado.");
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data.toString("utf8");
  if (entry.method === 8) return inflateRawSync(data).toString("utf8");
  throw new XlsxError("Compresión no soportada en el .xlsx.");
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Texto de todos los <t> de un fragmento (texto enriquecido incluido). */
function textOf(xml: string): string {
  let out = "";
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += decodeXml(m[1]);
  return out;
}

function colIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Filas de la primera hoja del libro, como texto. */
export function readXlsxRows(buf: Buffer): string[][] {
  const entries = readZipEntries(buf);
  const get = (name: string) => {
    const e = entries.get(name);
    return e ? readEntry(buf, e) : null;
  };

  // Primera hoja según workbook.xml + sus relaciones.
  let sheetPath = "xl/worksheets/sheet1.xml";
  const workbook = get("xl/workbook.xml");
  const rels = get("xl/_rels/workbook.xml.rels");
  if (workbook && rels) {
    const rid = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
    const target = rid
      ? new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*\\bTarget="([^"]+)"`).exec(rels)?.[1] ??
        new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${rid}"`).exec(rels)?.[1]
      : undefined;
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = get(sheetPath);
  if (!sheet) throw new XlsxError("El .xlsx no tiene hojas.");

  const shared: string[] = [];
  const sst = get("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));

  const rows: string[][] = [];
  for (const rm of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
    const attrs = rm[1] ?? rm[3] ?? "";
    const rowNum = Number(/\br="(\d+)"/.exec(attrs)?.[1] ?? rows.length + 1);
    const cells: string[] = [];
    const body = rm[2] ?? "";
    for (const cm of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const cAttrs = cm[1];
      const inner = cm[2] ?? "";
      const ref = /\br="([A-Z]+\d+)"/.exec(cAttrs)?.[1];
      const type = /\bt="([^"]+)"/.exec(cAttrs)?.[1];
      const idx = ref ? colIndex(ref) : cells.length;
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value = "";
      if (type === "s" && v != null) value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = textOf(inner);
      else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
      else if (v != null) value = decodeXml(v);
      while (cells.length < idx) cells.push("");
      cells[idx] = value;
    }
    while (rows.length < rowNum - 1) rows.push([]);
    rows[rowNum - 1] = cells;
  }
  while (rows.length && rows[rows.length - 1].every((c) => !c || !c.trim())) rows.pop();
  return rows;
}

/** true si los bytes son un ZIP (firma PK\x03\x04): un .xlsx. */
export function isXlsx(buf: Buffer): boolean {
  return buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50;
}
