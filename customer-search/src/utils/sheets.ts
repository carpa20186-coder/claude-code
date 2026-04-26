import type { PurchaseRecord } from '../types';

interface SheetResult {
  records: PurchaseRecord[];
  columns: string[];
}

interface SheetMeta {
  properties: {
    sheetId: number;
    title: string;
  };
}

const PREFERRED_SHEET_NAMES = [
  '全体（未来教育）',
  '全体(未来教育)',
  '全体',
  '未来教育',
];

const MERGED_SHEET_NAMES = [
  '全体（IPS）',
  '全体(IPS)',
  '全体（未来教育）',
  '全体(未来教育)',
];

function normalizeSheetName(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function pickSheet(sheets: SheetMeta[], url: string): SheetMeta | undefined {
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? Number.parseInt(gidMatch[1], 10) : null;

  if (gid !== null) {
    return sheets.find((sheet) => sheet.properties.sheetId === gid) ?? sheets[0];
  }

  const preferred = PREFERRED_SHEET_NAMES
    .map((name) => normalizeSheetName(name));

  return sheets.find((sheet) => preferred.includes(normalizeSheetName(sheet.properties.title)))
    ?? sheets.find((sheet) => normalizeSheetName(sheet.properties.title).includes('全体'))
    ?? sheets.find((sheet) => normalizeSheetName(sheet.properties.title).includes('未来教育'))
    ?? sheets[0];
}

function pickSheets(sheets: SheetMeta[], url: string): SheetMeta[] {
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? Number.parseInt(gidMatch[1], 10) : null;

  if (gid !== null) {
    const singleSheet = sheets.find((sheet) => sheet.properties.sheetId === gid) ?? sheets[0];
    return singleSheet ? [singleSheet] : [];
  }

  const preferred = MERGED_SHEET_NAMES.map((name) => normalizeSheetName(name));
  const matchedSheets = preferred
    .map((name) => sheets.find((sheet) => normalizeSheetName(sheet.properties.title) === name))
    .filter((sheet): sheet is SheetMeta => Boolean(sheet));

  if (matchedSheets.length > 0) {
    return matchedSheets;
  }

  const fallback = pickSheet(sheets, url);
  return fallback ? [fallback] : [];
}

async function fetchSheetValues(spreadsheetId: string, sheetName: string, token: string): Promise<string[][]> {
  const valuesResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!valuesResp.ok) throw new Error(`データ取得エラー: ${valuesResp.status}`);

  const data = await valuesResp.json();
  return data.values ?? [];
}

export async function fetchSheetWithToken(url: string, token: string): Promise<SheetResult> {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('無効なGoogleスプレッドシートURLです');
  const spreadsheetId = match[1];

  // Get metadata (sheet names & gid mapping)
  const metaResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!metaResp.ok) {
    if (metaResp.status === 401) throw new Error('認証が切れました。再ログインしてください。');
    if (metaResp.status === 403) throw new Error('このスプレッドシートへのアクセス権がありません。');
    if (metaResp.status === 404) throw new Error('スプレッドシートが見つかりません。URLを確認してください。');
    throw new Error(`取得エラー: ${metaResp.status}`);
  }

  const meta = await metaResp.json();
  const sheets: SheetMeta[] = meta.sheets ?? [];
  const selectedSheets = pickSheets(sheets, url);
  if (selectedSheets.length === 0) throw new Error('シートが見つかりません');

  const sheetRows = await Promise.all(
    selectedSheets.map(async (sheet) => ({
      title: sheet.properties.title,
      rows: await fetchSheetValues(spreadsheetId, sheet.properties.title, token),
    }))
  );

  const availableRows = sheetRows.filter(({ rows }) => rows.length >= 2);
  if (availableRows.length === 0) throw new Error('データが空です');

  const columns: string[] = [];
  for (const { rows } of availableRows) {
    for (const header of rows[0].map((value) => String(value).trim())) {
      if (!columns.includes(header)) {
        columns.push(header);
      }
    }
  }

  const records = availableRows.flatMap(({ title, rows }) =>
    rows.slice(1)
      .filter((row) => row.some((cell) => String(cell).trim()))
      .map((row) => {
        const headers = rows[0].map((value) => String(value).trim());
        const rec: PurchaseRecord = { _sourceSheet: title };
        columns.forEach((column) => {
          rec[column] = '';
        });
        headers.forEach((column, index) => {
          rec[column] = String(row[index] ?? '').trim();
        });
        return rec;
      })
  );

  return { records, columns };
}
