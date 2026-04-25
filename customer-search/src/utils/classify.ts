import type { PurchaseRecord, ColumnMapping, ClassificationRule } from '../types';

const CONTINUATION_RE = /【残り\d+回(?:のお支払い)?】|【残額[^】]*】/;
const INSTALLMENT_RE = /【(\d+)(?:分割(?:払い)?|回払い?)】/i;
const SKIP_KEYWORDS = ['送料', 'テスト', 'test', 'admin enrolled'];

export const DEFAULT_RULES: ClassificationRule[] = [
  { id: 'd1', keyword: '苫米地', contentHolder: 'Dr.苫米地英人', priority: 10 },
  { id: 'd2', keyword: 'トマベチ', contentHolder: 'Dr.苫米地英人', priority: 10 },
  { id: 'd3', keyword: 'Tomabechi', contentHolder: 'Dr.苫米地英人', priority: 10 },
  { id: 'd4', keyword: '長倉', contentHolder: '長倉顕太', priority: 10 },
  { id: 'd5', keyword: 'NAGAKURA', contentHolder: '長倉顕太', priority: 10 },
  { id: 'd6', keyword: '井上裕之', contentHolder: '井上裕之', priority: 10 },
  { id: 'd7', keyword: '井上', contentHolder: '井上裕之', priority: 5 },
  { id: 'd8', keyword: '星友啓', contentHolder: '星友啓', priority: 10 },
  { id: 'd9', keyword: 'たてばやし', contentHolder: 'たてばやし淳', priority: 10 },
  { id: 'd10', keyword: '立林', contentHolder: 'たてばやし淳', priority: 10 },
  { id: 'd11', keyword: '清水悠貴', contentHolder: '清水悠貴', priority: 10 },
  { id: 'd12', keyword: '清水', contentHolder: '清水悠貴', priority: 5 },
];

export function isContinuation(productName: string): boolean {
  return CONTINUATION_RE.test(productName);
}

export function shouldSkip(productName: string): boolean {
  const lower = productName.toLowerCase();
  return SKIP_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
}

export function extractInstallments(productName: string): number {
  const m = INSTALLMENT_RE.exec(productName);
  return m ? parseInt(m[1]) : 1;
}

export function extractContentHolder(productName: string, rules: ClassificationRule[]): string {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (productName.includes(rule.keyword)) return rule.contentHolder;
  }
  return '';
}

export function normalizeProductName(productName: string): string {
  return productName
    .replace(/【[^】]*】/g, '')
    .replace(/《[^》]*》/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function enrichRecord(
  rec: PurchaseRecord,
  mapping: ColumnMapping,
  rules: ClassificationRule[]
): PurchaseRecord {
  const productName = rec[mapping.project] ?? '';
  const amountStr = (rec[mapping.amount] ?? '').replace(/[¥,￥\s,]/g, '');
  const amount = parseFloat(amountStr) || 0;

  const continuation = isContinuation(productName);
  const skip = shouldSkip(productName);
  const installments = continuation || skip ? 1 : extractInstallments(productName);
  const totalPrice = amount * installments;

  let contentHolder = mapping.contentHolder ? (rec[mapping.contentHolder] ?? '').trim() : '';
  if (!contentHolder) contentHolder = extractContentHolder(productName, rules);

  return {
    ...rec,
    _contentHolder: contentHolder,
    _normalizedName: normalizeProductName(productName),
    _installments: String(installments),
    _totalPrice: String(totalPrice),
    _isContinuation: String(continuation),
    _skip: String(skip),
  };
}

export function loadRules(): ClassificationRule[] {
  try {
    const stored = localStorage.getItem('classificationRules');
    return stored ? JSON.parse(stored) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(rules: ClassificationRule[]): void {
  try { localStorage.setItem('classificationRules', JSON.stringify(rules)); } catch {}
}
