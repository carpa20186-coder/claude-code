import type { PurchaseRecord } from '../types';

interface SheetResult {
  records: PurchaseRecord[];
  columns: string[];
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
  const sheets: { properties: { sheetId: number; title: string } }[] = meta.sheets ?? [];

  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? parseInt(gidMatch[1]) : 0;
  const sheet = sheets.find(s => s.properties.sheetId === gid) ?? sheets[0];
  if (!sheet) throw new Error('シートが見つかりません');

  const sheetName = sheet.properties.title;

  // Fetch values
  const valuesResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!valuesResp.ok) throw new Error(`データ取得エラー: ${valuesResp.status}`);

  const data = await valuesResp.json();
  const rows: string[][] = data.values ?? [];

  if (rows.length < 2) throw new Error('データが空です');

  const columns = rows[0].map(h => String(h).trim());
  const records = rows.slice(1)
    .filter(row => row.some(c => String(c).trim()))
    .map(row => {
      const rec: PurchaseRecord = {};
      columns.forEach((col, i) => { rec[col] = String(row[i] ?? '').trim(); });
      return rec;
    });

  return { records, columns };
}
