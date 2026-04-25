import Papa from 'papaparse';
import type { PurchaseRecord, ColumnMapping } from '../types';

const NAME_CANDIDATES = ['user', '名前', '氏名', '顧客名', '顧客氏名', 'name', 'customer_name', 'full_name', 'username'];
const EMAIL_CANDIDATES = ['user_email', 'メール', 'メールアドレス', 'email', 'mail', 'e-mail', 'email_address'];
const CONTENT_HOLDER_CANDIDATES = ['コンテンツホルダー', 'コンテンツ', 'content_holder', 'holder', 'publisher'];
const PROJECT_CANDIDATES = ['product_name', 'course_name', '案件', '案件名', 'プロジェクト', 'project', 'item', '商品名', '商品'];
const DATE_CANDIDATES = ['日付', '購入日', '購入日時', 'date', 'purchase_date', 'created_at', 'ordered_at'];
const AMOUNT_CANDIDATES = ['final_price', '金額', '価格', '購入金額', 'amount', 'price', 'total'];

function findColumn(headers: string[], candidates: string[]): string {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return '';
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  return {
    name: findColumn(headers, NAME_CANDIDATES),
    email: findColumn(headers, EMAIL_CANDIDATES),
    contentHolder: findColumn(headers, CONTENT_HOLDER_CANDIDATES),
    project: findColumn(headers, PROJECT_CANDIDATES),
    date: findColumn(headers, DATE_CANDIDATES),
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

export async function fetchGoogleSheet(url: string): Promise<string> {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('無効なGoogle スプレッドシートURLです');
  const id = match[1];

  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

  // Try direct fetch first
  try {
    const resp = await fetch(csvUrl);
    if (resp.ok) {
      const text = await resp.text();
      if (!isHtml(text)) return text;
    }
  } catch {
    // CORS blocked — fall through to proxy
  }

  // CORS proxy fallback (allorigins.win)
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
  let resp: Response;
  try {
    resp = await fetch(proxyUrl);
  } catch {
    throw new Error(
      'スプレッドシートの取得に失敗しました。\n' +
      'スプレッドシートの共有設定を「リンクを知っている全員が閲覧可能」にしてから再試行してください。'
    );
  }

  if (!resp.ok) {
    throw new Error(
      `取得に失敗しました (${resp.status})。\n` +
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
