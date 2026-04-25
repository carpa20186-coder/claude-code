import { useMemo } from 'react';
import { ArrowLeft, Mail, ShoppingBag, TrendingUp, Calendar, BarChart3, Layers } from 'lucide-react';
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
      const raw = (p['_totalPrice'] ?? p[mapping.amount] ?? '').replace(/[¥,￥\s]/g, '');
      const n = parseFloat(raw);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    return total > 0 ? total : null;
  }, [customer.purchases, mapping.amount]);

  const sortedPurchases = useMemo(() => {
    if (!mapping.date) return customer.purchases;
    return [...customer.purchases].sort((a, b) =>
      (b[mapping.date] ?? '').localeCompare(a[mapping.date] ?? '')
    );
  }, [customer.purchases, mapping.date]);

  const displayColumns = useMemo(() => {
    const skip = new Set([
      mapping.name, mapping.email, mapping.date, mapping.amount,
      mapping.project, mapping.contentHolder,
      '_contentHolder', '_normalizedName', '_installments', '_totalPrice', '_isContinuation', '_skip',
    ]);
    return columns.filter(c => c && !skip.has(c));
  }, [columns, mapping]);

  const initials = (customer.name || customer.email || '?').slice(0, 2).toUpperCase();

  const contentHolders = useMemo(() => {
    const s = new Set(
      customer.purchases
        .map(p => (p['_contentHolder'] ?? '').trim())
        .filter(Boolean)
    );
    return Array.from(s);
  }, [customer.purchases]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-[#0f1729] rounded-lg flex items-center justify-center">
              <BarChart3 size={16} className="text-white" />
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={15} />
              一覧に戻る
            </button>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 truncate">{customer.name || '(名前なし)'}</h2>
              {customer.email && (
                <p className="flex items-center gap-1.5 text-slate-400 text-sm mt-0.5">
                  <Mail size={13} />
                  {customer.email}
                </p>
              )}
              {contentHolders.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {contentHolders.map(ch => (
                    <span key={ch} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
                      {ch}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xl">
                  <ShoppingBag size={16} />
                  {customer.purchases.length}
                </div>
                <p className="text-xs text-slate-400">新規契約</p>
              </div>
              {totalAmount !== null && (
                <div className="text-center">
                  <div className="flex items-center gap-1.5 text-green-600 font-bold text-xl">
                    <TrendingUp size={16} />
                    ¥{totalAmount.toLocaleString('ja-JP')}
                  </div>
                  <p className="text-xs text-slate-400">契約総額</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 py-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">購入履歴（新規契約のみ）</h3>

        {sortedPurchases.map((p, i) => {
          const installments = parseInt(p['_installments'] ?? '1') || 1;
          const paymentAmount = mapping.amount ? (p[mapping.amount] ?? '') : '';
          const totalPrice = p['_totalPrice'];
          const normalizedName = p['_normalizedName'];
          const contentHolder = p['_contentHolder'];
          const rawProductName = mapping.project ? p[mapping.project] : '';

          return (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                  {mapping.date && p[mapping.date] && (
                    <>
                      <Calendar size={13} className="text-blue-400" />
                      <span className="font-medium text-slate-600">{p[mapping.date]}</span>
                    </>
                  )}
                  {contentHolder && (
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2 py-0.5 rounded-full">
                      {contentHolder}
                    </span>
                  )}
                  {normalizedName && (
                    <span className="text-slate-700 font-medium text-xs">{normalizedName}</span>
                  )}
                  {!normalizedName && rawProductName && (
                    <span className="text-slate-700 font-medium text-xs">{rawProductName}</span>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  {totalPrice && parseFloat(totalPrice) > 0 ? (
                    <div>
                      <span className="font-bold text-green-600">
                        ¥{parseFloat(totalPrice).toLocaleString('ja-JP')}
                      </span>
                      {installments > 1 && (
                        <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                          <Layers size={11} />
                          ¥{Number(paymentAmount.replace(/[¥,￥\s]/g, '')).toLocaleString('ja-JP')} × {installments}回
                        </p>
                      )}
                    </div>
                  ) : paymentAmount ? (
                    <span className="font-bold text-green-600">
                      {paymentAmount.match(/[¥￥]/) ? paymentAmount : `¥${Number(paymentAmount.replace(/[,\s]/g, '')).toLocaleString('ja-JP')}`}
                    </span>
                  ) : null}
                </div>
              </div>

              {displayColumns.filter(c => p[c]?.trim()).length > 0 && (
                <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  {displayColumns.filter(c => p[c]?.trim()).map(col => (
                    <div key={col}>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{col}</p>
                      <p className="text-sm text-slate-700 font-medium break-words">{p[col]}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
