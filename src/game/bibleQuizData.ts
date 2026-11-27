import type { BibleQuestion, BibleQuestionCategory } from '../types/b2ks';
import { BIBLE_OT_QUESTIONS } from './bibleDataOT';
import { BIBLE_NT_QUESTIONS } from './bibleDataNT';
import { BIBLE_BOOK_PAIRS } from './bibleGlossary';
import { parseCsvRows } from './englishCurriculum';

export const BIBLE_BANK_VERSION = 1;

export const DEFAULT_BIBLE_BANK: BibleQuestion[] = [
  ...BIBLE_OT_QUESTIONS,
  ...BIBLE_NT_QUESTIONS,
];

const VALID_CATEGORIES = new Set<BibleQuestionCategory>(['fact', 'image', 'verse', 'parable']);

export function resolveVietnameseBookName(bookEn: string, fallbackVi?: string): string {
  const cleanEn = String(bookEn || '').trim();
  if (fallbackVi && fallbackVi.trim()) return fallbackVi.trim();
  const hit = BIBLE_BOOK_PAIRS.find((b) => b.en.toLowerCase() === cleanEn.toLowerCase());
  return hit ? hit.vi : cleanEn;
}

export function normalizeBibleQuestion(raw: Partial<BibleQuestion>, idx = 0): BibleQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = String(raw.q || '').trim();
  const optsRaw = Array.isArray(raw.opts) ? raw.opts : [];
  const opts: [string, string, string, string] = [
    String(optsRaw[0] ?? '').trim(),
    String(optsRaw[1] ?? '').trim(),
    String(optsRaw[2] ?? '').trim(),
    String(optsRaw[3] ?? '').trim(),
  ];
  if (!q || opts.some((o) => !o)) return null;

  const rawCat = String(raw.category || 'fact').trim().toLowerCase() as BibleQuestionCategory;
  const category: BibleQuestionCategory = VALID_CATEGORIES.has(rawCat) ? rawCat : 'fact';

  const rawAns = Number(raw.ans);
  const ans = (rawAns >= 0 && rawAns <= 3 ? Math.round(rawAns) : 0) as 0 | 1 | 2 | 3;

  const bookEn = String(raw.bookEn || 'Genesis').trim();
  const bookVi = resolveVietnameseBookName(bookEn, raw.bookVi);
  const ref = String(raw.ref || '1:1').trim();
  const verseEn = String(raw.verseEn || '').trim();
  const verseVi = String(raw.verseVi || '').trim();
  const visualId = raw.visualId ? String(raw.visualId).trim() : undefined;
  const id = String(raw.id || `bible_q_${idx + 1}`).trim();

  return {
    id,
    category,
    ...(visualId ? { visualId } : {}),
    q,
    opts,
    ans,
    bookEn,
    bookVi,
    ref,
    verseEn,
    verseVi,
    ...(raw.custom ? { custom: true } : {}),
  };
}

export function normalizeBibleQuestionsList(list: unknown): BibleQuestion[] {
  if (!Array.isArray(list)) return DEFAULT_BIBLE_BANK.map((q) => ({ ...q }));
  const seen = new Set<string>();
  const out: BibleQuestion[] = [];
  list.forEach((item, idx) => {
    const norm = normalizeBibleQuestion(item as Partial<BibleQuestion>, idx);
    if (norm && !seen.has(norm.id)) {
      seen.add(norm.id);
      out.push(norm);
    }
  });
  return out.length > 0 ? out : DEFAULT_BIBLE_BANK.map((q) => ({ ...q }));
}

function escapeCsvCell(val: string | number | undefined): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportBibleBankToCsv(questions: BibleQuestion[]): string {
  const header = [
    'id',
    'category',
    'visualId',
    'q',
    'optA',
    'optB',
    'optC',
    'optD',
    'ans',
    'bookEn',
    'bookVi',
    'ref',
    'verseEn',
    'verseVi',
  ];
  const ansLetters = ['A', 'B', 'C', 'D'];
  const lines = [header.join(',')];
  questions.forEach((item) => {
    lines.push(
      [
        escapeCsvCell(item.id),
        escapeCsvCell(item.category),
        escapeCsvCell(item.visualId || ''),
        escapeCsvCell(item.q),
        escapeCsvCell(item.opts[0] || ''),
        escapeCsvCell(item.opts[1] || ''),
        escapeCsvCell(item.opts[2] || ''),
        escapeCsvCell(item.opts[3] || ''),
        escapeCsvCell(ansLetters[item.ans] || 'A'),
        escapeCsvCell(item.bookEn),
        escapeCsvCell(item.bookVi),
        escapeCsvCell(item.ref),
        escapeCsvCell(item.verseEn),
        escapeCsvCell(item.verseVi),
      ].join(',')
    );
  });
  return '\uFEFF' + lines.join('\r\n');
}

export function parseBibleBankCsv(csvText: string): { questions: BibleQuestion[]; errors: number } {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) return { questions: [], errors: 0 };

  let startIdx = 0;
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const idxOf = (names: string[]) => header.findIndex((h) => names.includes(h));

  const colIdx = {
    id: idxOf(['id']),
    category: idxOf(['category', 'cat', 'loai']),
    visualId: idxOf(['visualid', 'visual', 'image']),
    q: idxOf(['q', 'question', 'cau_hoi']),
    optA: idxOf(['opta', 'a']),
    optB: idxOf(['optb', 'b']),
    optC: idxOf(['optc', 'c']),
    optD: idxOf(['optd', 'd']),
    ans: idxOf(['ans', 'answer', 'dap_an']),
    bookEn: idxOf(['booken', 'book_en', 'sach_en']),
    bookVi: idxOf(['bookvi', 'book_vi', 'sach_vi']),
    ref: idxOf(['ref', 'reference', 'dia_chi']),
    verseEn: idxOf(['verseen', 'verse_en', 'niv']),
    verseVi: idxOf(['versevi', 'verse_vi', '1925']),
  };

  if (colIdx.q !== -1 && colIdx.optA !== -1) {
    startIdx = 1;
  } else {
    // Fixed column order fallback
    colIdx.id = 0;
    colIdx.category = 1;
    colIdx.visualId = 2;
    colIdx.q = 3;
    colIdx.optA = 4;
    colIdx.optB = 5;
    colIdx.optC = 6;
    colIdx.optD = 7;
    colIdx.ans = 8;
    colIdx.bookEn = 9;
    colIdx.bookVi = 10;
    colIdx.ref = 11;
    colIdx.verseEn = 12;
    colIdx.verseVi = 13;
  }

  const out: BibleQuestion[] = [];
  let errors = 0;

  for (let r = startIdx; r < rows.length; r++) {
    const cells = rows[r];
    const qText = (cells[colIdx.q] || '').trim();
    const o0 = (cells[colIdx.optA] || '').trim();
    const o1 = (cells[colIdx.optB] || '').trim();
    const o2 = (cells[colIdx.optC] || '').trim();
    const o3 = (cells[colIdx.optD] || '').trim();
    if (!qText || !o0 || !o1 || !o2 || !o3) {
      errors += 1;
      continue;
    }

    const rawCat = (colIdx.category >= 0 ? cells[colIdx.category] : 'fact').trim().toLowerCase();
    const category: BibleQuestionCategory = VALID_CATEGORIES.has(rawCat as BibleQuestionCategory)
      ? (rawCat as BibleQuestionCategory)
      : 'fact';

    const ansRaw = (colIdx.ans >= 0 ? cells[colIdx.ans] : 'A').trim().toUpperCase();
    let ans: 0 | 1 | 2 | 3 = 0;
    if (ansRaw === 'B' || ansRaw === '1') ans = 1;
    else if (ansRaw === 'C' || ansRaw === '2') ans = 2;
    else if (ansRaw === 'D' || ansRaw === '3' || ansRaw === '4') ans = 3;

    const bookEn = ((colIdx.bookEn >= 0 ? cells[colIdx.bookEn] : '') || 'Genesis').trim();
    const bookVi = resolveVietnameseBookName(
      bookEn,
      colIdx.bookVi >= 0 ? cells[colIdx.bookVi] : ''
    );
    const ref = ((colIdx.ref >= 0 ? cells[colIdx.ref] : '') || '1:1').trim();
    const verseEn = ((colIdx.verseEn >= 0 ? cells[colIdx.verseEn] : '') || '').trim();
    const verseVi = ((colIdx.verseVi >= 0 ? cells[colIdx.verseVi] : '') || '').trim();
    const visualId = colIdx.visualId >= 0 ? cells[colIdx.visualId]?.trim() : '';
    const rawId = colIdx.id >= 0 ? cells[colIdx.id]?.trim() : '';

    out.push({
      id: rawId || `bible_csv_${r}_${Date.now().toString(36).slice(-4)}`,
      category,
      ...(visualId ? { visualId } : {}),
      q: qText,
      opts: [o0, o1, o2, o3],
      ans,
      bookEn,
      bookVi,
      ref,
      verseEn,
      verseVi,
      custom: !rawId || (!rawId.startsWith('ot_') && !rawId.startsWith('nt_')),
    });
  }

  return { questions: out, errors };
}
