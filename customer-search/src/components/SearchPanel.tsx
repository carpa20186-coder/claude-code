import { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, Users, ShoppingBag, X, Upload,
  ChevronDown, ChevronUp, BarChart3, Package,
  RefreshCw, Clock, Settings2, Columns3, Tag, Download,
} from 'lucide-react';
import { filterCustomers, getUniqueValues, buildProjects, buildHolders } from '../utils/customers';
import {
  downloadCsv,
  getCustomerStats,
} from '../utils/analytics';
import { RulesPanel } from './RulesPanel';
import type { Customer, ColumnMapping, PurchaseRecord, SyncConfig, GoogleUser, ClassificationRule } from '../types';
import type { Project, Holder } from '../utils/customers';

type Tab = 'customers' | 'projects' | 'holders';

interface Props {
  customers: Customer[];
  records: PurchaseRecord[];
  columns: string[];
  mapping: ColumnMapping;
  onSelectCustomer: (c: Customer) => void;
  onReimport: () => void;
  onConfigureMapping: () => void;
  syncConfig: SyncConfig | null;
  syncing: boolean;
  onManualSync: () => void;
  googleUser: GoogleUser | null;
  onSyncIntervalChange: (min: number) => void;
  rules: ClassificationRule[];
  onRulesChange: (rules: ClassificationRule[]) => void;
}

export function SearchPanel({
  customers, records, mapping, onSelectCustomer, onReimport, onConfigureMapping,
  syncConfig, syncing, onManualSync, googleUser, onSyncIntervalChange,
  rules, onRulesChange,
}: Props) {
  const [tab, setTab] = useState<Tab>('customers');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [contentHolder, setContentHolder] = useState('');
  const [project, setProject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const customerStats = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCustomerStats>>();
    for (const c of customers) {
      map.set(c.key, getCustomerStats(c, mapping));
    }
    return map;
  }, [customers, mapping]);

  const contentHolders = useMemo(() => {
    if (records.some(r => r['_contentHolder'] !== undefined)) {
      return getUniqueValues(records, '_contentHolder');
    }
    return mapping.contentHolder ? getUniqueValues(records, mapping.contentHolder) : [];
  }, [records, mapping.contentHolder]);

  const projects = useMemo(
    () => mapping.project ? getUniqueValues(records, mapping.project) : [],
    [records, mapping.project]
  );
  const projectData = useMemo(() => buildProjects(customers, mapping), [customers, mapping]);
  const holderData = useMemo(() => buildHolders(customers, mapping.amount), [customers, mapping.amount]);

  const filtered = useMemo(
    () => filterCustomers(customers, query, mapping, { contentHolder, project, dateFrom, dateTo }),
    [customers, query, mapping, contentHolder, project, dateFrom, dateTo]
  );

  const displayedCustomers = filtered;

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projectData;
    const q = query.toLowerCase();
    return projectData.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.customers.some(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    );
  }, [projectData, query]);

  const filteredHolders = useMemo(() => {
    if (!query.trim()) return holderData;
    const q = query.toLowerCase();
    return holderData.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.customers.some(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    );
  }, [holderData, query]);

  const activeFilterCount = [contentHolder, project, dateFrom, dateTo].filter(Boolean).length;
  function clearFilters() {
    setContentHolder(''); setProject(''); setDateFrom(''); setDateTo('');
  }

  function handleExportCsv() {
    const header = ['顧客名', 'メールアドレス', '購入件数', 'LTV', '平均購入間隔(日)', '最終購入日', '休眠フラグ', 'ホルダー'];
    const rows = displayedCustomers.map((customer) => {
      const stats = customerStats.get(customer.key) ?? getCustomerStats(customer, mapping);
      const holders = Array.from(new Set(
        customer.purchases
          .map((purchase) => (purchase['_contentHolder'] ?? '').trim())
          .filter(Boolean)
      )).join(' / ');

      return [
        customer.name || '',
        customer.email || '',
        String(customer.purchases.length),
        String(Math.round(stats.totalAmount)),
        stats.averagePurchaseIntervalDays !== null ? String(Math.round(stats.averagePurchaseIntervalDays)) : '',
        stats.lastPurchaseDate ?? '',
        '',
        holders,
      ];
    });

    const dateLabel = new Date().toISOString().slice(0, 10);
    downloadCsv(`customer-search-${dateLabel}.csv`, [header, ...rows]);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showRules && (
        <RulesPanel rules={rules} onChange={onRulesChange} onClose={() => setShowRules(false)} />
      )}

      {/* Top header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0f1729] rounded-lg flex items-center justify-center">
                <BarChart3 size={16} className="text-white" />
              </div>
              <span className="text-base font-bold text-slate-800">IPS Search</span>
            </div>
            <div className="flex items-center gap-2">
                {syncConfig && (
                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                    <Clock size={12} className="text-blue-400" />
                    {syncConfig.lastSync
                      ? `${Math.floor((Date.now() - syncConfig.lastSync.getTime()) / 60000)}分前に更新`
                      : '同期中...'}
                    <select
                      value={syncConfig.intervalMin}
                      onChange={e => onSyncIntervalChange(Number(e.target.value))}
                      className="bg-transparent text-xs focus:outline-none cursor-pointer"
                    >
                      <option value={1}>1分毎</option>
                      <option value={5}>5分毎</option>
                      <option value={10}>10分毎</option>
                      <option value={30}>30分毎</option>
                    </select>
                    <button onClick={onManualSync} disabled={syncing} className="hover:text-blue-600 transition-colors disabled:opacity-50">
                      <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                )}
                {googleUser && (
                  <button onClick={onReimport} className="flex items-center gap-1.5">
                    {googleUser.picture
                      ? <img src={googleUser.picture} alt="" className="w-7 h-7 rounded-full" />
                      : <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{googleUser.name.slice(0, 1)}</div>
                    }
                  </button>
                )}
                <button
                  onClick={() => setShowRules(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Settings2 size={13} />
                  <span className="hidden sm:inline">ルール</span>
                </button>
                <button
                  onClick={onConfigureMapping}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Columns3 size={13} />
                  <span className="hidden sm:inline">列設定</span>
                </button>
                <button
                  onClick={onReimport}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Upload size={13} />
                  インポート
                </button>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-400 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Download size={13} />
                  CSV出力
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {([['customers', '顧客別', Users], ['projects', '商品別', Package], ['holders', 'ホルダー別', Tag]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Search & filters */}
      <div className="bg-white border-b border-slate-200 sticky top-[89px] z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'customers' ? '名前・メールアドレス・商品名で検索...' : tab === 'projects' ? '商品名・顧客名で検索...' : 'ホルダー名・顧客名で検索...'}
              className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          {tab === 'customers' && (
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={15} />
              絞り込み
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        {showFilters && tab === 'customers' && (
          <div className="max-w-5xl mx-auto px-4 pb-3">
            <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-2 gap-3">
              {contentHolders.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">コンテンツホルダー</label>
                  <select value={contentHolder} onChange={e => setContentHolder(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">すべて</option>
                    {contentHolders.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}
              {projects.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">案件・商品名</label>
                  <select value={project} onChange={e => setProject(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">すべて</option>
                    {projects.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}
              {mapping.date && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">購入日（開始）</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">購入日（終了）</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </>
              )}
              {activeFilterCount > 0 && (
                <div className="col-span-2">
                  <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-red-500 transition-colors font-medium">
                    フィルターをリセット
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto w-full px-4 py-4 space-y-2">
        {tab === 'customers' ? (
          displayedCustomers.length === 0 ? (
            <EmptyState label="顧客が見つかりません" />
          ) : (
            <>
              <p className="text-xs text-slate-400 pb-1 font-medium">{displayedCustomers.length}名 を表示</p>
              {displayedCustomers.map(c => (
                <CustomerCard
                  key={c.key}
                  customer={c}
                  mapping={mapping}
                  onClick={() => onSelectCustomer(c)}
                  total={customerStats.get(c.key)?.totalAmount ?? 0}
                  averageIntervalDays={customerStats.get(c.key)?.averagePurchaseIntervalDays ?? null}
                />
              ))}
            </>
          )
        ) : tab === 'projects' ? (
          filteredProjects.length === 0 ? (
            <EmptyState label="商品が見つかりません" />
          ) : (
            <>
              <p className="text-xs text-slate-400 pb-1 font-medium">{filteredProjects.length}件の商品</p>
              {filteredProjects.map(p => (
                <ProjectCard key={p.name} project={p} onSelectCustomer={onSelectCustomer} mapping={mapping} />
              ))}
            </>
          )
        ) : (
          filteredHolders.length === 0 ? (
            <EmptyState label="コンテンツホルダーが見つかりません" />
          ) : (
            <>
              <p className="text-xs text-slate-400 pb-1 font-medium">{filteredHolders.length}名のホルダー</p>
              {filteredHolders.map(h => (
                <HolderCard key={h.name} holder={h} onSelectCustomer={onSelectCustomer} mapping={mapping} />
              ))}
            </>
          )
        )}
      </main>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-20 text-slate-400">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Search size={28} className="opacity-40" />
      </div>
      <p className="font-medium">{label}</p>
    </div>
  );
}

function CustomerCard({
  customer, mapping, onClick, total, averageIntervalDays,
}: {
  customer: Customer;
  mapping: ColumnMapping;
  onClick: () => void;
  total: number;
  averageIntervalDays: number | null;
}) {
  const latestDate = useMemo(() => {
    if (!mapping.date) return null;
    const dates = customer.purchases.map(p => p[mapping.date] ?? '').filter(Boolean).sort();
    return dates[dates.length - 1] ?? null;
  }, [customer.purchases, mapping.date]);

  const contentHolders = useMemo(() => {
    const s = new Set(
      customer.purchases
        .map(p => (p['_contentHolder'] ?? (mapping.contentHolder ? p[mapping.contentHolder] : '') ?? '').trim())
        .filter(Boolean)
    );
    return Array.from(s);
  }, [customer.purchases, mapping.contentHolder]);

  const initials = (customer.name || customer.email || '?').slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left hover:shadow-md hover:border-blue-300 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {initials}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800 truncate">{customer.name || '(名前なし)'}</p>
          </div>
          {customer.email && <p className="text-sm text-slate-400 truncate">{customer.email}</p>}
          {contentHolders.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {contentHolders.map(ch => (
                <span key={ch} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
                  {ch}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
            {customer.purchases.length}件
          </span>
          {total > 0 && (
            <p className="text-sm font-bold text-green-600">
              ¥{total.toLocaleString('ja-JP')}
            </p>
          )}
          {averageIntervalDays !== null && (
            <p className="text-xs text-slate-500">平均 {Math.round(averageIntervalDays)}日おき</p>
          )}
          {latestDate && <p className="text-xs text-slate-400">{latestDate}</p>}
        </div>
      </div>
    </button>
  );
}

function HolderCard({ holder, onSelectCustomer, mapping }: { holder: Holder; onSelectCustomer: (c: Customer) => void; mapping: ColumnMapping }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-violet-200 transition-colors">
      <button onClick={() => setExpanded(v => !v)} className="w-full p-4 text-left">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shrink-0">
            <Tag size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">{holder.name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Users size={11} />{holder.customerCount}名</span>
              <span className="flex items-center gap-1"><ShoppingBag size={11} />{holder.purchaseCount}件</span>
              {holder.totalAmount !== null && (
                <span className="text-green-600 font-semibold">¥{holder.totalAmount.toLocaleString('ja-JP')}</span>
              )}
            </div>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
          {holder.customers.map(c => {
            const purchases = c.purchases.filter(p => (p['_contentHolder'] ?? '').trim() === holder.name);
            const amt = purchases.reduce((sum, p) => {
              const raw = (p['_totalPrice'] ?? (mapping.amount ? p[mapping.amount] : '') ?? '').replace(/[¥,￥\s]/g, '');
              const n = parseFloat(raw);
              return sum + (isNaN(n) ? 0 : n);
            }, 0);
            return (
              <button
                key={c.key}
                onClick={() => onSelectCustomer(c)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-violet-50 transition-colors"
              >
                <div className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                  {(c.name || c.email || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{c.name || '(名前なし)'}</p>
                  {c.email && <p className="text-xs text-slate-400 truncate">{c.email}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-600">{purchases.length}件</p>
                  {amt > 0 && <p className="text-xs text-green-600">¥{amt.toLocaleString('ja-JP')}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onSelectCustomer, mapping }: { project: Project; onSelectCustomer: (c: Customer) => void; mapping: ColumnMapping }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-200 transition-colors">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
            <Package size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">{project.name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Users size={11} />{project.customerCount}名</span>
              <span className="flex items-center gap-1"><ShoppingBag size={11} />{project.purchaseCount}件</span>
              {project.totalAmount !== null && (
                <span className="text-green-600 font-semibold">¥{project.totalAmount.toLocaleString('ja-JP')}</span>
              )}
            </div>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
          {project.customers.map(c => {
            const purchases = c.purchases.filter(p => (p[mapping.project] ?? '').trim() === project.name);
            const amt = mapping.amount ? purchases.reduce((sum, p) => {
              const raw = (p['_totalPrice'] ?? p[mapping.amount] ?? '').replace(/[¥,￥\s]/g, '');
              const n = parseFloat(raw);
              return sum + (isNaN(n) ? 0 : n);
            }, 0) : 0;
            return (
              <button
                key={c.key}
                onClick={() => onSelectCustomer(c)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                  {(c.name || c.email || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{c.name || '(名前なし)'}</p>
                  {c.email && <p className="text-xs text-slate-400 truncate">{c.email}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-600">{purchases.length}件</p>
                  {amt > 0 && <p className="text-xs text-green-600">¥{amt.toLocaleString('ja-JP')}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
