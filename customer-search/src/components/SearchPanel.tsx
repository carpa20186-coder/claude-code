import { useState, useMemo, type ReactNode } from 'react';
import {
  Search, SlidersHorizontal, Users, ShoppingBag, X, Upload,
  ChevronDown, ChevronUp, BarChart3, Package,
  RefreshCw, Clock, Settings2, Columns3, Tag, Download, Crown, Clipboard, Mail, ArrowRight, LayoutGrid,
} from 'lucide-react';
import { filterCustomers, getUniqueValues, buildProjects, buildHolders } from '../utils/customers';
import {
  downloadCsv,
  getCustomerStats,
} from '../utils/analytics';
import { RulesPanel } from './RulesPanel';
import type { Customer, ColumnMapping, PurchaseRecord, SyncConfig, GoogleUser, ClassificationRule } from '../types';
import type { Project, Holder } from '../utils/customers';

type Tab = 'home' | 'customers' | 'projects' | 'holders' | 'bulkHistory';

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
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [vipThreshold, setVipThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('vipThreshold');
    return saved ? Number.parseInt(saved, 10) : 300000;
  });
  const [tab, setTab] = useState<Tab>('home');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
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

  const isVip = (customer: Customer) => (customerStats.get(customer.key)?.totalAmount ?? 0) >= vipThreshold;
  const vipCount = useMemo(() => customers.filter(isVip).length, [customers, customerStats]);
  const displayedCustomers = useMemo(
    () => showVipOnly ? filtered.filter(isVip) : filtered,
    [filtered, showVipOnly, customerStats]
  );

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

  function handleVipThresholdChange(value: number) {
    setVipThreshold(value);
    localStorage.setItem('vipThreshold', String(value));
  }

  function clearFilters() {
    setContentHolder(''); setProject(''); setDateFrom(''); setDateTo('');
  }

  function handleExportCsv() {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const customerMap = new Map<string, Customer>();

    const addCustomers = (items: Customer[]) => {
      for (const customer of items) {
        const key = customer.email || customer.key;
        if (!key || customerMap.has(key)) continue;
        customerMap.set(key, customer);
      }
    };

    if (tab === 'customers') {
      addCustomers(displayedCustomers);
    } else if (tab === 'projects') {
      for (const projectItem of filteredProjects) {
        addCustomers(projectItem.customers);
      }
    } else if (tab === 'holders') {
      for (const holderItem of filteredHolders) {
        addCustomers(holderItem.customers);
      }
    }

    const rows = Array.from(customerMap.values())
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, 'ja'))
      .map((customer) => [customer.name || '', customer.email || '']);

    const tabLabel = tab === 'projects' ? 'products' : tab === 'holders' ? 'holders' : 'customers';
    downloadCsv(`customer-list-${tabLabel}-${dateLabel}.csv`, [['顧客名', 'メールアドレス'], ...rows]);
  }

  const bulkEmailData = useMemo(() => {
    const emails = extractEmails(bulkInput);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    const uniqueEmails: string[] = [];

    for (const email of emails) {
      if (seen.has(email)) {
        duplicates.add(email);
        continue;
      }
      seen.add(email);
      uniqueEmails.push(email);
    }

    return { emails, uniqueEmails, duplicates: Array.from(duplicates) };
  }, [bulkInput]);

  const bulkResults = useMemo(() => {
    const customerByEmail = new Map(
      customers
        .filter((customer) => customer.email)
        .map((customer) => [customer.email.toLowerCase(), customer] as const)
    );

    const matches: Customer[] = [];
    const unmatched: string[] = [];

    for (const email of bulkEmailData.uniqueEmails) {
      const customer = customerByEmail.get(email);
      if (customer) {
        matches.push(customer);
      } else {
        unmatched.push(email);
      }
    }

    return { matches, unmatched };
  }, [customers, bulkEmailData.uniqueEmails]);

  async function copyText(text: string, successMessage: string) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(successMessage);
      window.setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('コピーに失敗しました');
      window.setTimeout(() => setCopyStatus(''), 2000);
    }
  }

  const bulkSummaryText = useMemo(() => {
    return bulkResults.matches.map((customer) => {
      const stats = customerStats.get(customer.key) ?? getCustomerStats(customer, mapping);
      const purchaseNames = customer.purchases
        .map((purchase) => getPurchaseName(purchase, mapping))
        .filter(Boolean);

      return [
        `${customer.name || '(名前なし)'} (${customer.email || '-'})`,
        `- 過去購入 ${customer.purchases.length}件`,
        purchaseNames.length > 0 ? `- 購入商品: ${purchaseNames.join('、')}` : '- 購入商品: なし',
        `- 累計 ${formatCurrency(stats.totalAmount)}`,
        `- 最終購入日 ${stats.lastPurchaseDate ?? '-'}`,
      ].join('\n');
    }).join('\n\n');
  }, [bulkResults.matches, customerStats, mapping]);

  const bulkDetailedText = useMemo(() => {
    return bulkResults.matches.map((customer) => {
      const stats = customerStats.get(customer.key) ?? getCustomerStats(customer, mapping);
      const lines = customer.purchases.map((purchase) => {
        const name = getPurchaseName(purchase, mapping);
        const amount = formatCurrencyValue(purchase['_totalPrice'] ?? purchase[mapping.amount]);
        const date = mapping.date ? (purchase[mapping.date] ?? '').trim() : '';
        return `- ${[date, name, amount].filter(Boolean).join(' | ')}`;
      });

      return [
        `${customer.name || '(名前なし)'} (${customer.email || '-'})`,
        `累計: ${formatCurrency(stats.totalAmount)} / 最終購入日: ${stats.lastPurchaseDate ?? '-'}`,
        ...lines,
      ].join('\n');
    }).join('\n\n');
  }, [bulkResults.matches, customerStats, mapping]);

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

          {/* Tabs */}
          <div className="flex gap-1">
            {([['home', '機能一覧', LayoutGrid], ['customers', '顧客別', Users], ['projects', '商品別', Package], ['holders', 'ホルダー別', Tag], ['bulkHistory', '購入履歴一括照合', Mail]] as const).map(([key, label, Icon]) => (
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
      {tab !== 'bulkHistory' && tab !== 'home' && (
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
                {vipCount > 0 && (
                  <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${
                    showVipOnly ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {vipCount}
                  </span>
                )}
              </button>
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
                  onChange={e => handleVipThresholdChange(Number.parseInt(e.target.value, 10) || 0)}
                  className="w-28 border border-amber-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-slate-700"
                  step={100000}
                  min={0}
                />
                <span className="text-xs text-amber-600">以上</span>
              </div>
              <div className="flex items-center gap-1.5 ml-1">
                {[100000, 300000, 500000, 1000000].map(value => (
                  <button
                    key={value}
                    onClick={() => handleVipThresholdChange(value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      vipThreshold === value
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-amber-600 border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    {value >= 10000 ? `${value / 10000}万` : value.toLocaleString()}
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
      )}

      {/* Content */}
      <main className="max-w-5xl mx-auto w-full px-4 py-4 space-y-2">
        {tab === 'home' ? (
          <FunctionHome
            vipCount={vipCount}
            customerCount={customers.length}
            projectCount={projectData.length}
            holderCount={holderData.length}
            onSelect={setTab}
            onOpenCustomers={() => {
              setShowVipOnly(false);
              setTab('customers');
            }}
            onOpenVip={() => {
              setShowVipOnly(true);
              setTab('customers');
            }}
          />
        ) : tab === 'bulkHistory' ? (
          <BulkHistoryPanel
            input={bulkInput}
            onInputChange={setBulkInput}
            matchCount={bulkResults.matches.length}
            unmatched={bulkResults.unmatched}
            duplicateEmails={bulkEmailData.duplicates}
            matches={bulkResults.matches}
            mapping={mapping}
            customerStats={customerStats}
            copyStatus={copyStatus}
            onCopySummary={() => copyText(bulkSummaryText, '要約をコピーしました')}
            onCopyDetailed={() => copyText(bulkDetailedText, '詳細をコピーしました')}
            onCopyUnmatched={() => copyText(bulkResults.unmatched.join('\n'), '未一致メールをコピーしました')}
          />
        ) : tab === 'customers' ? (
          displayedCustomers.length === 0 ? (
            <EmptyState label={showVipOnly ? 'VIP顧客が見つかりません' : '顧客が見つかりません'} />
          ) : (
            <>
              <p className="text-xs text-slate-400 pb-1 font-medium">
                {displayedCustomers.length}名 を表示
                {showVipOnly && <span className="ml-2 text-amber-500 font-semibold">（VIPのみ）</span>}
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

function extractEmails(input: string): string[] {
  const matches = input.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g);
  return matches ?? [];
}

function FunctionHome({
  vipCount,
  customerCount,
  projectCount,
  holderCount,
  onSelect,
  onOpenCustomers,
  onOpenVip,
}: {
  vipCount: number;
  customerCount: number;
  projectCount: number;
  holderCount: number;
  onSelect: (tab: Tab) => void;
  onOpenCustomers: () => void;
  onOpenVip: () => void;
}) {
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-blue-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_32%),linear-gradient(135deg,_#eff6ff_0%,_#dbeafe_46%,_#ffffff_100%)] px-6 py-7 shadow-[0_28px_80px_-36px_rgba(37,99,235,0.45)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(96,165,250,0.24),_transparent_62%)] md:block" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700/80">Function Select</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">まず使いたい機能を選ぶ</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            顧客検索、VIP抽出、商品別確認、ホルダー別確認、購入履歴の一括照合まで、入口を分けて見やすくしています。
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-slate-700 shadow-sm">{customerCount}名の顧客データ</span>
          <span className="rounded-full border border-blue-300 bg-blue-600 px-3 py-1.5 text-white shadow-sm shadow-blue-300/50">VIP候補 {vipCount}名</span>
          <span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-slate-700 shadow-sm">{projectCount}件の商品</span>
          <span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-slate-700 shadow-sm">{holderCount}件のホルダー</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FunctionCard
          title="顧客別"
          description="名前やメールで顧客を検索し、過去購入履歴を確認します。通常の顧客一覧をまず見たい時の入口です。"
          meta={`${customerCount}名の顧客`}
          icon={<Users size={20} />}
          tone="primary"
          onClick={onOpenCustomers}
        />
        <FunctionCard
          title="VIP顧客"
          description="VIP候補だけをすぐに開いて、基準額つきで確認します。高単価購入者だけを先に見たい時に使えます。"
          meta={`${vipCount}名のVIP候補`}
          icon={<Crown size={20} />}
          tone="vip"
          onClick={onOpenVip}
        />
        <FunctionCard
          title="商品別"
          description="どの商品に誰が入っているかを一覧化して、商品ごとの購入者をまとまって確認します。"
          meta={`${projectCount}件の商品`}
          icon={<Package size={20} />}
          tone="secondary"
          onClick={() => onSelect('projects')}
        />
        <FunctionCard
          title="ホルダー別"
          description="コンテンツホルダー単位で顧客を確認し、販売元ごとの購入傾向をざっと把握できます。"
          meta={`${holderCount}件のホルダー`}
          icon={<Tag size={20} />}
          tone="secondary"
          onClick={() => onSelect('holders')}
        />
        <FunctionCard
          title="購入履歴一括照合"
          description="セミナーや講座の購入者メールをまとめて貼り付けて、既存顧客の過去購入履歴を一括で照合します。"
          meta="メール貼り付け対応"
          icon={<Mail size={20} />}
          tone="accent"
          onClick={() => onSelect('bulkHistory')}
        />
      </div>
    </section>
  );
}

function FunctionCard({
  title,
  description,
  meta,
  icon,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  meta: string;
  icon: ReactNode;
  tone: 'primary' | 'secondary' | 'accent' | 'vip';
  onClick: () => void;
}) {
  const toneClasses = {
    primary: 'border-blue-200 bg-[linear-gradient(180deg,_rgba(239,246,255,0.96),_rgba(255,255,255,1))] shadow-[0_24px_50px_-32px_rgba(59,130,246,0.42)]',
    secondary: 'border-sky-200 bg-[linear-gradient(180deg,_rgba(248,250,252,1),_rgba(239,246,255,0.88))] shadow-[0_24px_50px_-32px_rgba(14,165,233,0.32)]',
    accent: 'border-cyan-200 bg-[linear-gradient(180deg,_rgba(240,249,255,1),_rgba(255,255,255,1))] shadow-[0_24px_50px_-32px_rgba(6,182,212,0.32)]',
    vip: 'border-blue-200 bg-[linear-gradient(180deg,_rgba(239,246,255,0.94),_rgba(255,255,255,1))] shadow-[0_24px_50px_-32px_rgba(59,130,246,0.38)]',
  }[tone];

  const iconClasses = {
    primary: 'bg-blue-600 text-white shadow-blue-200/80',
    secondary: 'bg-white text-blue-700 shadow-blue-100/70',
    accent: 'bg-cyan-600 text-white shadow-cyan-200/80',
    vip: 'bg-white text-blue-700 shadow-blue-100/70',
  }[tone];

  const metaClasses = {
    primary: 'text-blue-700/80',
    secondary: 'text-sky-700/80',
    accent: 'text-cyan-700/80',
    vip: 'text-blue-700/80',
  }[tone];

  const titleClasses = 'text-slate-900';
  const bodyClasses = 'text-slate-600';
  const arrowClasses = 'text-slate-400';

  return (
    <button
      onClick={onClick}
      className={`group rounded-[26px] p-5 text-left transition-all hover:-translate-y-1 hover:shadow-[0_32px_70px_-34px_rgba(37,99,235,0.5)] ${toneClasses}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${iconClasses}`}>
            {icon}
          </div>
          <div>
            <h2 className={`text-lg font-bold ${titleClasses}`}>{title}</h2>
            <p className={`mt-1 text-xs font-semibold tracking-wide ${metaClasses}`}>{meta}</p>
          </div>
        </div>
        <ArrowRight size={18} className={`mt-1 transition-transform group-hover:translate-x-1 ${arrowClasses}`} />
      </div>
      <p className={`mt-4 text-sm leading-7 ${bodyClasses}`}>{description}</p>
    </button>
  );
}

function getPurchaseName(purchase: PurchaseRecord, mapping: ColumnMapping): string {
  const primary = (mapping.project ? purchase[mapping.project] : '')?.trim();
  if (primary) return primary;

  const holder = (purchase['_contentHolder'] ?? (mapping.contentHolder ? purchase[mapping.contentHolder] : '') ?? '').trim();
  if (holder) return holder;

  return '商品名なし';
}

function formatCurrency(amount: number): string {
  return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
}

function formatCurrencyValue(raw: string | undefined): string {
  const normalized = (raw ?? '').replace(/[¥,￥\s]/g, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? formatCurrency(amount) : '';
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

function BulkHistoryPanel({
  input,
  onInputChange,
  matchCount,
  unmatched,
  duplicateEmails,
  matches,
  mapping,
  customerStats,
  copyStatus,
  onCopySummary,
  onCopyDetailed,
  onCopyUnmatched,
}: {
  input: string;
  onInputChange: (value: string) => void;
  matchCount: number;
  unmatched: string[];
  duplicateEmails: string[];
  matches: Customer[];
  mapping: ColumnMapping;
  customerStats: Map<string, ReturnType<typeof getCustomerStats>>;
  copyStatus: string;
  onCopySummary: () => void;
  onCopyDetailed: () => void;
  onCopyUnmatched: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">購入履歴一括照合</h2>
            <p className="text-sm text-slate-500 mt-1">
              購入者メールアドレスを貼り付けると、既存顧客データと照合して過去の購入履歴をまとめて確認できます。
            </p>
          </div>
          {copyStatus && (
            <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {copyStatus}
            </div>
          )}
        </div>

        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={'メールアドレス一覧を貼り付け\nexample1@example.com\nexample2@example.com'}
          className="w-full min-h-40 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={onCopySummary}
            disabled={matches.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Clipboard size={15} />
            要約コピー
          </button>
          <button
            onClick={onCopyDetailed}
            disabled={matches.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
          >
            <Clipboard size={15} />
            詳細コピー
          </button>
          <button
            onClick={onCopyUnmatched}
            disabled={unmatched.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
          >
            <Clipboard size={15} />
            未一致コピー
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryMiniCard label="一致" value={`${matchCount}名`} tone="blue" />
        <SummaryMiniCard label="未一致" value={`${unmatched.length}件`} tone="amber" />
        <SummaryMiniCard label="重複メール" value={`${duplicateEmails.length}件`} tone="slate" />
      </div>

      {duplicateEmails.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">重複メール</p>
          <p className="text-xs text-amber-700 leading-relaxed">{duplicateEmails.join(', ')}</p>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-slate-800 mb-2">未一致メール</p>
          <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{unmatched.join('\n')}</p>
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState label="一致する顧客がまだありません" />
      ) : (
        <>
          <p className="text-xs text-slate-400 pb-1 font-medium">{matches.length}名の購入履歴を表示</p>
          {matches.map((customer) => (
            <BulkHistoryCard
              key={customer.key}
              customer={customer}
              mapping={mapping}
              stats={customerStats.get(customer.key) ?? getCustomerStats(customer, mapping)}
            />
          ))}
        </>
      )}
    </section>
  );
}

function SummaryMiniCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'slate' }) {
  const toneClass = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  }[tone];

  return (
    <div className={`border rounded-2xl px-4 py-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function BulkHistoryCard({
  customer,
  mapping,
  stats,
}: {
  customer: Customer;
  mapping: ColumnMapping;
  stats: ReturnType<typeof getCustomerStats>;
}) {
  const purchases = useMemo(() => {
    return [...customer.purchases].sort((a, b) => {
      if (!mapping.date) return 0;
      const aDate = a[mapping.date] ?? '';
      const bDate = b[mapping.date] ?? '';
      return bDate.localeCompare(aDate);
    });
  }, [customer.purchases, mapping.date]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-semibold text-slate-900">{customer.name || '(名前なし)'}</p>
          <p className="text-sm text-slate-500">{customer.email || '-'}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>{customer.purchases.length}件</p>
          <p className="font-bold text-green-600 mt-1">{formatCurrency(stats.totalAmount)}</p>
          <p className="mt-1">{stats.lastPurchaseDate ?? '-'}</p>
        </div>
      </div>

      <div className="space-y-2">
        {purchases.map((purchase, index) => (
          <div key={`${customer.key}-${index}`} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-sm">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-700">
              <span className="font-medium">{getPurchaseName(purchase, mapping)}</span>
              {mapping.date && (purchase[mapping.date] ?? '').trim() && (
                <span className="text-slate-500">{purchase[mapping.date]}</span>
              )}
              {formatCurrencyValue(purchase['_totalPrice'] ?? purchase[mapping.amount]) && (
                <span className="text-green-600 font-medium">{formatCurrencyValue(purchase['_totalPrice'] ?? purchase[mapping.amount])}</span>
              )}
              {(purchase['_contentHolder'] ?? '').trim() && (
                <span className="text-blue-600">{purchase['_contentHolder']}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerCard({
  customer, mapping, onClick, isVip, total, averageIntervalDays,
}: {
  customer: Customer;
  mapping: ColumnMapping;
  onClick: () => void;
  isVip: boolean;
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
      className={`w-full bg-white border rounded-2xl p-4 text-left hover:shadow-md transition-all group ${
        isVip
          ? 'border-amber-200 hover:border-amber-300 ring-1 ring-amber-100'
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
            isVip
              ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white'
              : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
          }`}>
            {initials}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800 truncate">{customer.name || '(名前なし)'}</p>
            {isVip && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-bold shrink-0 flex items-center gap-1">
                <Crown size={11} />
                VIP
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
