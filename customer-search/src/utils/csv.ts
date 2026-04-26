import Papa from 'papaparse';
import type { PurchaseRecord, ColumnMapping } from '../types';

const NAME_CANDIDATES = ['user', '名前', '氏名', '顧客名', '顧客氏名', 'name', 'customer_name', 'full_name', 'username'];
const EMAIL_CANDIDATES = ['user_email', 'メール', 'メールアドレス', 'email', 'mail', 'e-mail', 'email_address'];
const CONTENT_HOLDER_CANDIDATES = ['コンテンツホルダー', 'コンテンツ', 'content_holder', 'holder', 'publisher'];
const PROJECT_CANDIDATES = ['product_name', 'course_name', '案件', '案件名', 'プロジェクト', 'project', 'item', '商品名', '商品'];
const DATE_CANDIDATES = ['日付', '購入日', '購入日時', 'date', 'purchase_date', 'created_at', 'ordered_at'];
const AMOUNT_CANDIDATES = ['final_price', '金額', '価格', '購入金額', 'amount', 'price', 'total'];
const PREFERRED_SHEET_NAMES = ['全体（未来教育）', '全体(未来教育)', '全体', '未来教育'];

function normalizeHeader(value: string): string {
  return value
    .replace(/﻿/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function findColumn(headers: string[], candidates: string[]): string {
  const lower = headers.map((h) => normalizeHeader(h));
  for (const c of candidates) {
    const idx = lower.indexOf(normalizeHeader(c));
    if (idx !== -1) return headers[idx];
  }
  return '';
}

function looksLikeDate(value: string): boolean {
  const normalized = value
    .trim()
    .replace(/[.]/g, '-')
    .replace(/\//g, '-')
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/\s+/g, ' ');

  if (!normalized) return false;
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(normalized)) return true;

  const parsed = new Date(normalized);
  return !Number.isNaN(parsed.getTime());
}

function inferDateColumn(headers: string[], records: PurchaseRecord[]): string {
  let bestColumn = '';
  let bestScore = 0;

  for (const header of headers) {
    const values = records
      .map((record) => (record[header] ?? '').trim())
      .filter(Boolean)
      .slice(0, 20);

    if (values.length < 3) continue;

    const dateLikeCount = values.filter(looksLikeDate).length;
    const score = dateLikeCount / values.length;

    if (score >= 0.6 && score > bestScore) {
      bestColumn = header;
      bestScore = score;
    }
  }

  return bestColumn;
}

export function autoDetectMapping(headers: string[], records: PurchaseRecord[] = []): ColumnMapping {
  const detectedDate = findColumn(headers, DATE_CANDIDATES) || inferDateColumn(headers, records);

  return {
    name: findColumn(headers, NAME_CANDIDATES),
    email: findColumn(headers, EMAIL_CANDIDATES),
    contentHolder: findColumn(headers, CONTENT_HOLDER_CANDIDATES),
    project: findColumn(headers, PROJECT_CANDIDATES),
    date: detectedDate,
    amount: findColumn(headers, AMOUNT_CANDIDATES),
  };
}

export async function parseCSVText(text: string): Promise<{ records: PurchaseRecord[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<PurchaseRecord>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: result => {
        if (result.errors.length && result.data.length === 0) {
          reject(new Error(result.errors[0].message));
        } else {
          resolve({
            records: result.data,
            columns: result.meta.fields ?? [],
          });
        }
      },
      error: (err: Error) => reject(err),
    });
  });
}

function isHtml(text: string) {
  const t = text.trimStart();
  return t.startsWith('<!DOCTYPE') || t.startsWith('<html') || t.startsWith('<HTML');
}

async function fetchTextWithProxyFallback(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (resp.ok) {
      const text = await resp.text();
      if (!isHtml(text)) return text;
    }
  } catch {
    // CORS blocked — fall through to proxy
  }

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  let resp: Response;
  try {
    resp = await fetch(proxyUrl);
  } catch {
    throw new Error(
      'スプレッドシートの取得に失敗しました\n' +
      'スプレッドシートの共有設定を「リンクを知っている全員が閲覧可能」にしてから再試行してください。'
    );
  }

  if (!resp.ok) {
    throw new Error(
      `取得に失敗しました (${resp.status})\n` +
      'スプレッドシートが「リンクを知っている全員が閲覧可能」になっているか確認してください。'
    );
  }

  const text = await resp.text();
  if (isHtml(text)) {
    throw new Error(
      'スプレッドシートが非公開のためアクセスできません。\n\n' +
      '【設定方法】スプレッドシート右上の「共有」→「リンクを知っている全員が閲覧可能」に変更してください。\n\n' +
      'または「ファイル → ダウンロード → CSV」でCSVをダウンロードしてインポートしてください。'
    );
  }
  return text;
}

export async function fetchGoogleSheet(url: string): Promise<string> {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('無効なGoogle スプレッドシートURLです');
  const id = match[1];

  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  if (gid) {
    return fetchTextWithProxyFallback(
      `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
    );
  }

  for (const sheetName of PREFERRED_SHEET_NAMES) {
    try {
      const text = await fetchTextWithProxyFallback(
        `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
      );
      if (!isHtml(text)) return text;
    } catch {
      // Try the next preferred sheet name before falling back to the first tab.
    }
  }

  return fetchTextWithProxyFallback(
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=0`
  );
}
