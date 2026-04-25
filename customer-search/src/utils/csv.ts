import Papa from 'papaparse';
import type { PurchaseRecord, ColumnMapping } from '../types';

const NAME_CANDIDATES = ['名前', '氏名', '顧客名', '顧客氏名', 'name', 'customer_name', 'full_name'];
const EMAIL_CANDIDATES = ['メール', 'メールアドレス', 'email', 'mail', 'e-mail', 'email_address'];
const CONTENT_HOLDER_CANDIDATES = ['コンテンツホルダー', 'コンテンツ', 'content_holder', 'holder', 'publisher'];
const PROJECT_CANDIDATES = ['案件', '案件名', 'プロジェクト', 'project', 'item', '商品名', '商品'];
const DATE_CANDIDATES = ['日付', '購入日', '購入日時', 'date', 'purchase_date', 'created_at'];
const AMOUNT_CANDIDATES = ['金額', '価格', '購入金額', 'amount', 'price', 'total'];

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

export async function fetchGoogleSheet(url: string): Promise<string> {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('無効なGoogle スプレッドシートURLです');
  const id = match[1];

  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  const resp = await fetch(csvUrl);
  if (!resp.ok) throw new Error(`スプレッドシートの取得に失敗しました (${resp.status})`);
  return resp.text();
}
