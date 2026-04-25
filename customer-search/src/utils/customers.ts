import type { PurchaseRecord, Customer, ColumnMapping } from '../types';

export function buildCustomers(records: PurchaseRecord[], mapping: ColumnMapping): Customer[] {
  const map = new Map<string, Customer>();

  for (const rec of records) {
    const name = (rec[mapping.name] ?? '').trim();
    const email = (rec[mapping.email] ?? '').trim().toLowerCase();
    const key = email || name;
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { key, name, email, purchases: [] });
    } else {
      const existing = map.get(key)!;
      if (!existing.name && name) existing.name = name;
      if (!existing.email && email) existing.email = email;
    }
    map.get(key)!.purchases.push(rec);
  }

  return Array.from(map.values()).sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email, 'ja')
  );
}

export function getUniqueValues(records: PurchaseRecord[], column: string): string[] {
  const set = new Set<string>();
  for (const r of records) {
    const v = (r[column] ?? '').trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
}

export function filterCustomers(
  customers: Customer[],
  query: string,
  mapping: ColumnMapping,
  filters: { contentHolder: string; project: string; dateFrom: string; dateTo: string }
): Customer[] {
  const q = query.toLowerCase().trim();

  return customers
    .map(c => {
      let purchases = c.purchases;

      if (filters.contentHolder) {
        purchases = purchases.filter(p =>
          (p[mapping.contentHolder] ?? '').trim() === filters.contentHolder
        );
      }
      if (filters.project) {
        purchases = purchases.filter(p =>
          (p[mapping.project] ?? '').trim() === filters.project
        );
      }
      if (filters.dateFrom && mapping.date) {
        purchases = purchases.filter(p => {
          const d = (p[mapping.date] ?? '').trim();
          return !d || d >= filters.dateFrom;
        });
      }
      if (filters.dateTo && mapping.date) {
        purchases = purchases.filter(p => {
          const d = (p[mapping.date] ?? '').trim();
          return !d || d <= filters.dateTo;
        });
      }

      if (!q) return purchases.length > 0 ? { ...c, purchases } : null;

      const matchCustomer =
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);

      if (matchCustomer) return { ...c, purchases };

      const matchPurchase = purchases.some(p =>
        Object.values(p).some(v => v.toLowerCase().includes(q))
      );
      return matchPurchase ? { ...c, purchases } : null;
    })
    .filter((c): c is Customer => c !== null);
}
