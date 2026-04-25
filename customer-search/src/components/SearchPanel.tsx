import { useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  Search, SlidersHorizontal, Users, ShoppingBag, X, Upload,
  ChevronDown, ChevronUp, BarChart3, TrendingUp, Package,
  RefreshCw, Clock, Settings2, Columns3, Crown, Tag, Download, LineChart, AlertTriangle,
} from 'lucide-react';
import { filterCustomers, getUniqueValues, buildProjects, buildHolders } from '../utils/customers';
import {
  buildCrossSellPairs,
  buildMonthlyTrend,
  buildSummaryMetrics,
  downloadCsv,
  getCustomerStats,
  isDormantCustomer,
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
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [dormantMonths, setDormantMonths] = useState<number>(() => {
    const saved = localStorage.getItem('dormantMonths');
    return saved ? Number.parseInt(saved, 10) : 6;
  });
  const [vipThreshold, setVipThreshold] = useState<number>(() => {
    const s = localStorage.getItem('vipThreshold');
    return s ? parseInt(s) : 300000;
  });
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

  const isVip = useCallback(
    (c: Customer) => (customerStats.get(c.key)?.totalAmount ?? 0) >= vipThreshold,
    [customerStats, vipThreshold]
  );

  const vipCount = useMemo(() => customers.filter(isVip).length, [customers, isVip]);

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

  const displayedCustomers = useMemo(() => {
    let list = showVipOnly ? filtered.filter(isVip) : filtered;
    if (showVipOnly) {
      list = [...list].sort((a, b) => (customerStats.get(b.key)?.totalAmount ?? 0) - (customerStats.get(a.key)?.totalAmount ?? 0));
    }
    return list;
  }, [filtered, showVipOnly, isVip, customerStats]);

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
  const totalAmount = useMemo(() => {
    if (!mapping.amount) return null;
    return records.reduce((sum, r) => {
      const raw = (r['_totalPrice'] ?? r[mapping.amount] ?? '').replace(/[¥,￥\s]/g, '');
      const n = parseFloat(raw);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [records, mapping.amount]);

  const summaryMetrics = useMemo(
    () => buildSummaryMetrics(displayedCustomers, mapping, dormantMonths),
    [displayedCustomers, mapping, dormantMonths]
  );

  const monthlyTrend = useMemo(() => {
    const visibleKeys = new Set(displayedCustomers.map((customer) => customer.key));
    const visibleRecords = records.filter((record) => {
      const name = (record[mapping.name] ?? '').trim();
      const email = (record[mapping.email] ?? '').trim().toLowerCase();
      const key = email || name;
      return key ? visibleKeys.has(key) : false;
    });
    return buildMonthlyTrend(visibleRecords, mapping);
  }, [displayedCustomers, records, mapping]);

  const crossSellPairs = useMemo(
    () => buildCrossSellPairs(displayedCustomers),
    [displayedCustomers]
  );

  const dormantKeys = useMemo(() => new Set(
    displayedCustomers
      .filter((customer) => isDormantCustomer(customer, mapping, dormantMonths))
      .map((customer) => customer.key)
  ), [displayedCustomers, mapping, dormantMonths]);

  function handleVipThresholdChange(value: number) {
    setVipThreshold(value);
    localStorage.setItem('vipThreshold', String(value));
  }

  function handleDormantMonthsChange(value: number) {
    setDormantMonths(value);
    localStorage.setItem('dormantMonths', String(value));
  }

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
        dormantKeys.has(customer.key) ? '要フォロー' : '',
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
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-blue-400" />
                  <strong className="text-slate-700">{customers.length}</strong>名
                </span>
                {vipCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Crown size={13} className="text-amber-400" />
                    <strong className="text-amber-600">VIP {vipCount}</strong>名
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-blue-400" />
                  <strong className="text-slate-700">{records.length}</strong>件
                </span>
                {totalAmount !== null && (
                  <span className="flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-green-400" />
                    <strong className="text-slate-700">¥{totalAmount.toLocaleString('ja-JP')}</strong>
                  </span>
                )}
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
            <>
              {/* VIP toggle */}
              <button
                onClick={() => setShowVipOnly(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                  showVipOnly
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Crown size={15} className={showVipOnly ? 'text-amber-500' : 'text-slate-400'} />
                VIP
                {showVipOnly && vipCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {vipCount}
                  </span>
                )}
              </button>
              {/* Other filters */}
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
            </>
          )}
        </div>

        {/* VIP threshold config */}
        {showVipOnly && tab === 'customers' && (
          <div className="max-w-5xl mx-auto px-4 pb-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
              <Crown size={15} className="text-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-amber-700">VIP基準（契約総額）</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-amber-600">¥</span>
                <input
                  type="number"
                  value={vipThreshold}
                  onChange={e => handleVipThresholdChange(parseInt(e.target.value) || 0)}
                  className="w-28 border border-amber-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-slate-700"
                  step={100000}
                  min={0}
                />
                <span className="text-xs text-amber-600">以上</span>
              </div>
              <div className="flex items-center gap-1.5 ml-1">
                {[100000, 300000, 500000, 1000000].map(v => (
                  <button
                    key={v}
                    onClick={() => handleVipThresholdChange(v)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      vipThreshold === v
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-amber-600 border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    {v >= 10000 ? `${v / 10000}万` : v.toLocaleString()}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-xs font-bold text-amber-700">
                {vipCount}名が対象
              </span>
            </div>
          </div>
        )}

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
        {tab === 'customers' && (
          <>
            <section className="grid gap-3 md:grid-cols-4 mb-4">
              <SummaryCard
                label="平均LTV"
                value={summaryMetrics.averageLtv !== null ? `¥${Math.round(summaryMetrics.averageLtv).toLocaleString('ja-JP')}` : '-'}
                accent="blue"
              />
              <SummaryCard
                label="中央値LTV"
                value={summaryMetrics.medianLtv !== null ? `¥${Math.round(summaryMetrics.medianLtv).toLocaleString('ja-JP')}` : '-'}
                accent="violet"
              />
              <SummaryCard
                label="リピート率"
                value={summaryMetrics.repeatRate !== null ? `${Math.round(summaryMetrics.repeatRate * 100)}%` : '-'}
                subValue={`${displayedCustomers.filter(customer => customer.purchases.length >= 2).length} / ${displayedCustomers.length}名`}
                accent="emerald"
              />
              <SummaryCard
                label="要フォロー"
                value={`${summaryMetrics.dormantCount}名`}
                subValue={summaryMetrics.dormantRate !== null ? `${Math.round(summaryMetrics.dormantRate * 100)}%` : undefined}
                accent="amber"
                control={(
                  <select
                    value={dormantMonths}
                    onChange={(event) => handleDormantMonthsChange(Number(event.target.value))}
                    className="bg-transparent text-xs font-medium focus:outline-none"
                  >
                    {[3, 6, 9, 12].map((month) => (
                      <option key={month} value={month}>{month}ヶ月</option>
                    ))}
                  </select>
                )}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] mb-4">
              <MonthlyTrendCard trend={monthlyTrend} />
              <CrossSellCard pairs={crossSellPairs} />
            </section>
          </>
        )}

        {tab === 'customers' ? (
          displayedCustomers.length === 0 ? (
            <EmptyState label={showVipOnly ? 'VIP顧客が見つかりません' : '顧客が見つかりません'} />
          ) : (
            <>
              <p className="text-xs text-slate-400 pb-1 font-medium">
                {displayedCustomers.length}名 を表示
                {showVipOnly && <span className="ml-2 text-amber-500 font-semibold">（契約総額 降順）</span>}
              </p>
              {displayedCustomers.map(c => (
                <CustomerCard
                  key={c.key}
                  customer={c}
                  mapping={mapping}
                  onClick={() => onSelectCustomer(c)}
                  isVip={isVip(c)}
                  total={customerStats.get(c.key)?.totalAmount ?? 0}
                  averageIntervalDays={customerStats.get(c.key)?.averagePurchaseIntervalDays ?? null}
                  isDormant={dormantKeys.has(c.key)}
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
  customer, mapping, onClick, isVip, total, averageIntervalDays, isDormant,
}: {
  customer: Customer;
  mapping: ColumnMapping;
  onClick: () => void;
  isVip: boolean;
  total: number;
  averageIntervalDays: number | null;
  isDormant: boolean;
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
      className={`w-full bg-white border rounded-2xl p-4 text-left hover:shadow-md transition-all group ${
        isVip
          ? 'border-amber-200 hover:border-amber-300 ring-1 ring-amber-100'
          : isDormant
            ? 'border-rose-200 hover:border-rose-300 ring-1 ring-rose-100'
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
            isVip
              ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white'
              : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
          } transition-colors`}>
            {initials}
          </div>
          {isVip && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
              <Crown size={10} className="text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800 truncate">{customer.name || '(名前なし)'}</p>
            {isVip && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-bold shrink-0">
                VIP
              </span>
            )}
            {isDormant && (
              <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded-full px-2 py-0.5 font-bold shrink-0 flex items-center gap-1">
                <AlertTriangle size={11} />
                要フォロー
              </span>
            )}
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
            <p className={`text-sm font-bold ${isVip ? 'text-amber-600' : 'text-green-600'}`}>
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

function SummaryCard({
  label, value, subValue, accent, control,
}: {
  label: string;
  value: string;
  subValue?: string;
  accent: 'blue' | 'violet' | 'emerald' | 'amber';
  control?: ReactNode;
}) {
  const accentClass = {
    blue: 'from-blue-50 to-white border-blue-100 text-blue-700',
    violet: 'from-violet-50 to-white border-violet-100 text-violet-700',
    emerald: 'from-emerald-50 to-white border-emerald-100 text-emerald-700',
    amber: 'from-amber-50 to-white border-amber-100 text-amber-700',
  }[accent];

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {subValue && <p className="mt-1 text-xs font-medium text-slate-500">{subValue}</p>}
        </div>
        {control}
      </div>
    </div>
  );
}

function MonthlyTrendCard({ trend }: { trend: ReturnType<typeof buildMonthlyTrend> }) {
  const width = 560;
  const height = 220;
  const padding = 28;

  if (trend.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <LineChart size={16} className="text-blue-500" />
          <h3 className="font-semibold text-slate-800">月次購入トレンド</h3>
        </div>
        <p className="text-sm text-slate-400">日付列があると、月別の新規契約数と売上を表示できます。</p>
      </div>
    );
  }

  const maxCount = Math.max(...trend.map((point) => point.count), 1);
  const maxRevenue = Math.max(...trend.map((point) => point.revenue), 1);
  const stepX = trend.length > 1 ? (width - padding * 2) / (trend.length - 1) : 0;

  const countPath = trend.map((point, index) => {
    const x = padding + stepX * index;
    const y = height - padding - ((point.count / maxCount) * (height - padding * 2));
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const revenuePath = trend.map((point, index) => {
    const x = padding + stepX * index;
    const y = height - padding - ((point.revenue / maxRevenue) * (height - padding * 2));
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <LineChart size={16} className="text-blue-500" />
            <h3 className="font-semibold text-slate-800">月次購入トレンド</h3>
          </div>
          <p className="text-sm text-slate-400 mt-1">新規契約数と売上の動きを月ごとに確認できます。</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />契約数</span>
          <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />売上</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
        <path d={countPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
        <path d={revenuePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
        {trend.map((point, index) => {
          const x = padding + stepX * index;
          const countY = height - padding - ((point.count / maxCount) * (height - padding * 2));
          const revenueY = height - padding - ((point.revenue / maxRevenue) * (height - padding * 2));
          return (
            <g key={point.month}>
              <circle cx={x} cy={countY} r="4" fill="#3b82f6" />
              <circle cx={x} cy={revenueY} r="4" fill="#10b981" />
              <text x={x} y={height - 8} textAnchor="middle" fontSize="10" fill="#64748b">{point.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CrossSellCard({ pairs }: { pairs: ReturnType<typeof buildCrossSellPairs> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Tag size={16} className="text-violet-500" />
        <h3 className="font-semibold text-slate-800">クロスセル分析</h3>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        左側を基準にした併売率です。A→B は「A購入者のうち B も買った割合」で、B→A は別指標です。
      </p>

      {pairs.length === 0 ? (
        <p className="text-sm text-slate-400">複数ホルダーを横断した購入データが増えると表示されます。</p>
      ) : (
        <div className="space-y-3">
          {pairs.map((pair) => (
            <div key={`${pair.baseHolder}-${pair.targetHolder}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-700">{pair.baseHolder} 購入者 → {pair.targetHolder} も購入</p>
                  <p className="mt-1 text-xs text-slate-500">逆向きは別集計: {pair.targetHolder} 購入者 → {pair.baseHolder} も購入</p>
                </div>
                <p className="font-bold text-violet-600">{Math.round(pair.rate * 100)}%</p>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(pair.rate * 100, 4)}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{pair.baseHolder} 購入者 {pair.totalBaseCustomers}名中、{pair.customerCount}名が {pair.targetHolder} も購入</p>
            </div>
          ))}
        </div>
      )}
    </div>
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
