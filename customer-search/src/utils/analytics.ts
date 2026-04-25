import type { ColumnMapping, Customer, PurchaseRecord } from '../types';

export interface CustomerStats {
  totalAmount: number;
  lastPurchaseDate: string | null;
  averagePurchaseIntervalDays: number | null;
  purchaseCount: number;
}

export interface SummaryMetrics {
  averageLtv: number | null;
  medianLtv: number | null;
  repeatRate: number | null;
  dormantCount: number;
  dormantRate: number | null;
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  count: number;
  revenue: number;
}

export interface CrossSellPair {
  baseHolder: string;
  targetHolder: string;
  customerCount: number;
  totalBaseCustomers: number;
  rate: number;
}

export function parseAmount(value: string | undefined): number {
  const normalized = (value ?? '').replace(/[¥,￥\s]/g, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function parseDateValue(value: string | undefined): Date | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/[.]/g, '-')
    .replace(/\//g, '-')
    .replace(/\s+/g, ' ')
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '');

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateLabel(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function diffDays(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function getCustomerStats(customer: Customer, mapping: ColumnMapping): CustomerStats {
  const datedPurchases = mapping.date
    ? customer.purchases
      .map((purchase) => ({
        purchase,
        date: parseDateValue(purchase[mapping.date]),
      }))
      .filter((entry): entry is { purchase: PurchaseRecord; date: Date } => entry.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    : [];

  const totalAmount = customer.purchases.reduce((sum, purchase) => (
    sum + parseAmount(purchase['_totalPrice'] ?? purchase[mapping.amount])
  ), 0);

  const lastPurchaseDate = datedPurchases.length > 0
    ? formatDateLabel(datedPurchases[datedPurchases.length - 1].date)
    : null;

  let averagePurchaseIntervalDays: number | null = null;
  if (datedPurchases.length >= 2) {
    const intervals = datedPurchases
      .slice(1)
      .map((entry, index) => diffDays(entry.date, datedPurchases[index].date))
      .filter((days) => days >= 0);

    if (intervals.length > 0) {
      averagePurchaseIntervalDays = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
    }
  }

  return {
    totalAmount,
    lastPurchaseDate,
    averagePurchaseIntervalDays,
    purchaseCount: customer.purchases.length,
  };
}

export function isDormantCustomer(customer: Customer, mapping: ColumnMapping, dormantMonths: number, now = new Date()): boolean {
  if (!mapping.date || dormantMonths <= 0) return false;
  const stats = getCustomerStats(customer, mapping);
  const lastDate = parseDateValue(stats.lastPurchaseDate ?? undefined);
  if (!lastDate) return false;

  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - dormantMonths);
  return lastDate < threshold;
}

export function buildSummaryMetrics(
  customers: Customer[],
  mapping: ColumnMapping,
  dormantMonths: number,
): SummaryMetrics {
  if (customers.length === 0) {
    return {
      averageLtv: null,
      medianLtv: null,
      repeatRate: null,
      dormantCount: 0,
      dormantRate: null,
    };
  }

  const totals = customers
    .map((customer) => getCustomerStats(customer, mapping).totalAmount)
    .sort((a, b) => a - b);

  const averageLtv = totals.reduce((sum, value) => sum + value, 0) / totals.length;
  const medianLtv = totals.length % 2 === 1
    ? totals[(totals.length - 1) / 2]
    : (totals[totals.length / 2 - 1] + totals[totals.length / 2]) / 2;

  const repeatCustomers = customers.filter((customer) => customer.purchases.length >= 2).length;
  const dormantCount = customers.filter((customer) => isDormantCustomer(customer, mapping, dormantMonths)).length;

  return {
    averageLtv,
    medianLtv,
    repeatRate: repeatCustomers / customers.length,
    dormantCount,
    dormantRate: dormantCount / customers.length,
  };
}

export function buildMonthlyTrend(records: PurchaseRecord[], mapping: ColumnMapping): MonthlyTrendPoint[] {
  if (!mapping.date) return [];

  const byMonth = new Map<string, MonthlyTrendPoint>();

  for (const record of records) {
    const date = parseDateValue(record[mapping.date]);
    if (!date) continue;

    const month = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
    const existing = byMonth.get(month) ?? {
      month,
      label: `${date.getFullYear()}/${date.getMonth() + 1}`,
      count: 0,
      revenue: 0,
    };

    existing.count += 1;
    existing.revenue += parseAmount(record['_totalPrice'] ?? record[mapping.amount]);
    byMonth.set(month, existing);
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function buildCrossSellPairs(customers: Customer[]): CrossSellPair[] {
  const pairMap = new Map<string, { customerCount: number; totalBaseCustomers: number }>();
  const baseCounts = new Map<string, number>();

  for (const customer of customers) {
    const holders = Array.from(new Set(
      customer.purchases
        .map((purchase) => (purchase['_contentHolder'] ?? '').trim())
        .filter(Boolean),
    ));

    for (const baseHolder of holders) {
      baseCounts.set(baseHolder, (baseCounts.get(baseHolder) ?? 0) + 1);
      for (const targetHolder of holders) {
        if (baseHolder === targetHolder) continue;
        const key = `${baseHolder}__${targetHolder}`;
        pairMap.set(key, {
          customerCount: (pairMap.get(key)?.customerCount ?? 0) + 1,
          totalBaseCustomers: 0,
        });
      }
    }
  }

  return Array.from(pairMap.entries())
    .map(([key, value]) => {
      const [baseHolder, targetHolder] = key.split('__');
      const totalBaseCustomers = baseCounts.get(baseHolder) ?? 0;
      return {
        baseHolder,
        targetHolder,
        customerCount: value.customerCount,
        totalBaseCustomers,
        rate: totalBaseCustomers > 0 ? value.customerCount / totalBaseCustomers : 0,
      };
    })
    .sort((a, b) => b.rate - a.rate || b.customerCount - a.customerCount)
    .slice(0, 8);
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const escapeCell = (value: string) => {
    const escaped = value.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const csv = rows.map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
