import { useMemo } from 'react';
import { ArrowLeft, Mail, ShoppingBag, Calendar, DollarSign } from 'lucide-react';
import type { Customer, ColumnMapping } from '../types';

interface Props {
  customer: Customer;
  columns: string[];
  mapping: ColumnMapping;
  onBack: () => void;
}

export function DetailPanel({ customer, columns, mapping, onBack }: Props) {
  const totalAmount = useMemo(() => {
    if (!mapping.amount) return null;
    const total = customer.purchases.reduce((sum, p) => {
      const raw = (p[mapping.amount] ?? '').replace(/[¥,￥\s]/g, '');
      const n = parseFloat(raw);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    return total > 0 ? total : null;
  }, [customer.purchases, mapping.amount]);

  const sortedPurchases = useMemo(() => {
    if (!mapping.date) return customer.purchases;
    return [...customer.purchases].sort((a, b) => {
      const da = (a[mapping.date] ?? '');
      const db = (b[mapping.date] ?? '');
      return db.localeCompare(da);
    });
  }, [customer.purchases, mapping.date]);

  const displayColumns = useMemo(() => {
    const keyFields = [mapping.name, mapping.email].filter(Boolean);
    return columns.filter(c => !keyFields.includes(c));
  }, [columns, mapping]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-3 text-sm"
          >
            <ArrowLeft size={16} />
            検索一覧に戻る
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {customer.name || '(名前なし)'}
              </h2>
              {customer.email && (
                <p className="flex items-center gap-1.5 text-slate-500 mt-1 text-sm">
                  <Mail size={14} />
                  {customer.email}
                </p>
              )}
            </div>
            <div className="text-right space-y-1 shrink-0">
              <div className="flex items-center gap-1.5 justify-end text-slate-600">
                <ShoppingBag size={16} />
                <span className="font-semibold">{customer.purchases.length}件</span>
              </div>
              {totalAmount !== null && (
                <div className="flex items-center gap-1.5 justify-end text-green-700">
                  <DollarSign size={16} />
                  <span className="font-semibold">¥{totalAmount.toLocaleString('ja-JP')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">購入履歴</h3>

        {sortedPurchases.map((p, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              {mapping.date && p[mapping.date] && (
                <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                  <Calendar size={14} />
                  {p[mapping.date]}
                </span>
              )}
              {mapping.amount && p[mapping.amount] && (
                <span className="font-semibold text-green-700">
                  {p[mapping.amount].match(/[¥￥]/) ? p[mapping.amount] : `¥${p[mapping.amount]}`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {displayColumns.filter(c => p[c]?.trim()).map(col => (
                <div key={col}>
                  <p className="text-xs text-slate-400">{col}</p>
                  <p className="text-sm text-slate-700 font-medium break-words">{p[col]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
