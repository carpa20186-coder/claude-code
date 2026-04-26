import { useMemo } from 'react';
import { ArrowLeft, Mail, ShoppingBag, TrendingUp, Calendar, BarChart3, Layers } from 'lucide-react';
import type { Customer, ColumnMapping } from '../types';
import { getCustomerStats } from '../utils/analytics';
import { inferDateColumn } from '../utils/csv';

interface Props {
  customer: Customer;
  columns: string[];
  mapping: ColumnMapping;
  onBack: () => void;
}

const HIDDEN_COLUMNS = new Set([
  'id', 'user_id', '分析シート反映', 'net_charge_usd', 'net_product_charge_usd',
  'amount_refunded', 'author_fees', 'earnings_usd', 'affiliate_fees',
  'custom_gateway', 'sale_id', 'zipcode', 'billing_address_zipcode',
  'delivery_address_zipcode', 'coupon_amount',
]);

export function DetailPanel({ customer, columns, mapping, onBack }: Props) {
  const resolvedDateColumn = useMemo(
    () => mapping.date || inferDateColumn(columns, customer.purchases),
    [mapping.date, columns, customer.purchases]
  );

  const effectiveMapping = useMemo(
    () => resolvedDateColumn && resolvedDateColumn !== mapping.date
      ? { ...mapping, date: resolvedDateColumn }
      : mapping,
    [mapping, resolvedDateColumn]
  );

  const customerStats = useMemo(() => getCustomerStats(customer, effectiveMapping), [customer, effectiveMapping]);
  const totalAmount = customerStats.totalAmount > 0 ? customerStats.totalAmount : null;

  const sortedPurchases = useMemo(() => {
    if (!resolvedDateColumn) return customer.purchases;
    return [...customer.purchases].sort((a, b) =>
      (b[resolvedDateColumn] ?? '').localeCompare(a[resolvedDateColumn] ?? '')
    );
  }, [customer.purchases, resolvedDateColumn]);

  const displayColumns = useMemo(() => {
    const skip = new Set([
      mapping.name, mapping.email, resolvedDateColumn, mapping.amount,
      mapping.project, mapping.contentHolder,
      '_contentHolder', '_normalizedName', '_installments', '_totalPrice', '_isContinuation', '_skip',
    ]);
    return columns.filter(c => c && !skip.has(c) && !HIDDEN_COLUMNS.has(c.toLowerCase()));
  }, [columns, mapping, resolvedDateColumn]);

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
              {customerStats.averagePurchaseIntervalDays !== null && (
                <div className="text-center">
                  <div className="text-slate-700 font-bold text-xl">
                    {Math.round(customerStats.averagePurchaseIntervalDays)}日
                  </div>
                  <p className="text-xs text-slate-400">平均購入間隔</p>
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
                  {resolvedDateColumn && p[resolvedDateColumn] && (
                    <>
                      <Calendar size={13} className="text-blue-400" />
                      <span className="font-medium text-slate-600">{p[resolvedDateColumn]}</span>
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

              {(mapping.amount || displayColumns.filter(c => p[c]?.trim()).length > 0) && (
                <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  {resolvedDateColumn && p[resolvedDateColumn]?.trim() && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">購入日</p>
                      <p className="text-sm text-slate-700 font-medium">{p[resolvedDateColumn]}</p>
                    </div>
                  )}
                  {/* 契約金額 – always first */}
                  {mapping.amount && (
                    <div className="col-span-2 sm:col-span-1 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">契約金額</p>
                      <p className="text-xl font-bold text-green-700">
                        ¥{(parseFloat((p['_totalPrice'] ?? '0').replace(/[¥,￥\s]/g, '')) || parseFloat((p[mapping.amount] ?? '0').replace(/[¥,￥\s]/g, '')) || 0).toLocaleString('ja-JP')}
                      </p>
                      {installments > 1 && (
                        <p className="text-xs text-green-500 mt-0.5 flex items-center gap-1">
                          <Layers size={10} />
                          ¥{Number(paymentAmount.replace(/[¥,￥\s]/g, '')).toLocaleString('ja-JP')} × {installments}回分割
                        </p>
                      )}
                    </div>
                  )}
                  {/* final_price – always shown */}
                  {mapping.amount && paymentAmount && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{mapping.amount}</p>
                      <p className="text-sm text-slate-700 font-medium">
                        ¥{Number(paymentAmount.replace(/[¥,￥\s]/g, '')).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  )}
                  {installments > 1 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">分割回数</p>
                      <p className="text-sm text-slate-700 font-medium">{installments}回</p>
                    </div>
                  )}
                  {/* Other columns */}
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
