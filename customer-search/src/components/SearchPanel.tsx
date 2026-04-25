import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Users, ShoppingBag, X, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { filterCustomers, getUniqueValues } from '../utils/customers';
import type { Customer, ColumnMapping, PurchaseRecord } from '../types';

interface Props {
  customers: Customer[];
  records: PurchaseRecord[];
  columns: string[];
  mapping: ColumnMapping;
  onSelectCustomer: (c: Customer) => void;
  onReimport: () => void;
}

export function SearchPanel({ customers, records, mapping, onSelectCustomer, onReimport }: Props) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [contentHolder, setContentHolder] = useState('');
  const [project, setProject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const contentHolders = useMemo(
    () => mapping.contentHolder ? getUniqueValues(records, mapping.contentHolder) : [],
    [records, mapping.contentHolder]
  );
  const projects = useMemo(
    () => mapping.project ? getUniqueValues(records, mapping.project) : [],
    [records, mapping.project]
  );

  const filtered = useMemo(
    () => filterCustomers(customers, query, mapping, { contentHolder, project, dateFrom, dateTo }),
    [customers, query, mapping, contentHolder, project, dateFrom, dateTo]
  );

  const activeFilterCount = [contentHolder, project, dateFrom, dateTo].filter(Boolean).length;

  function clearFilters() {
    setContentHolder('');
    setProject('');
    setDateFrom('');
    setDateTo('');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-800">顧客購入履歴 検索</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {customers.length}名
              </span>
              <span className="flex items-center gap-1">
                <ShoppingBag size={14} />
                {records.length}件
              </span>
              <button
                onClick={onReimport}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Upload size={14} />
                再インポート
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="名前・メールアドレス・案件名などで検索..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                activeFilterCount > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={16} />
              絞り込み
              {activeFilterCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {contentHolders.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">コンテンツホルダー</label>
                    <select
                      value={contentHolder}
                      onChange={e => setContentHolder(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">すべて</option>
                      {contentHolders.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                {projects.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">案件・商品名</label>
                    <select
                      value={project}
                      onChange={e => setProject(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">すべて</option>
                      {projects.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                {mapping.date && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">購入日（開始）</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">購入日（終了）</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-red-500 transition-colors">
                  フィルターをリセット
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p>条件に一致する顧客が見つかりません</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 pb-1">{filtered.length}名 を表示中</p>
            {filtered.map(c => (
              <CustomerCard key={c.key} customer={c} mapping={mapping} onClick={() => onSelectCustomer(c)} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function CustomerCard({ customer, mapping, onClick }: { customer: Customer; mapping: ColumnMapping; onClick: () => void }) {
  const totalAmount = useMemo(() => {
    if (!mapping.amount) return null;
    const total = customer.purchases.reduce((sum, p) => {
      const raw = (p[mapping.amount] ?? '').replace(/[¥,￥\s]/g, '');
      const n = parseFloat(raw);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    return total > 0 ? total : null;
  }, [customer.purchases, mapping.amount]);

  const latestDate = useMemo(() => {
    if (!mapping.date) return null;
    const dates = customer.purchases.map(p => p[mapping.date] ?? '').filter(Boolean).sort();
    return dates[dates.length - 1] ?? null;
  }, [customer.purchases, mapping.date]);

  const contentHolders = useMemo(() => {
    if (!mapping.contentHolder) return [];
    const s = new Set(customer.purchases.map(p => (p[mapping.contentHolder] ?? '').trim()).filter(Boolean));
    return Array.from(s);
  }, [customer.purchases, mapping.contentHolder]);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{customer.name || '(名前なし)'}</p>
          {customer.email && (
            <p className="text-sm text-slate-500 truncate">{customer.email}</p>
          )}
          {contentHolders.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contentHolders.map(ch => (
                <span key={ch} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">
                  {ch}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <p className="text-sm font-semibold text-slate-700">
            {customer.purchases.length}件購入
          </p>
          {totalAmount !== null && (
            <p className="text-sm text-green-700 font-medium">
              ¥{totalAmount.toLocaleString('ja-JP')}
            </p>
          )}
          {latestDate && (
            <p className="text-xs text-slate-400">{latestDate}</p>
          )}
        </div>
      </div>
    </button>
  );
}
