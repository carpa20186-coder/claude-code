import {
  Users, Search, LayoutGrid, Tag, BarChart3,
  Upload, Home, List, Settings, Bell, ChevronDown,
  RefreshCw, ArrowRight,
} from 'lucide-react';

interface Props {
  onStart: () => void;
}

export function LandingPage({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-[#f0f5ff] to-[#edf4ff] flex flex-col overflow-hidden">
      {/* Logo bar */}
      <header className="px-8 pt-8 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0f1729] rounded-xl flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-[#0f1729] tracking-tight">IPS Search</span>
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">
            社内顧客データ検索
          </span>
        </div>
      </header>

      {/* Main hero */}
      <main className="flex-1 flex items-center px-8 py-10 gap-12 max-w-7xl mx-auto w-full">
        {/* Left: text */}
        <div className="flex-1 min-w-0 space-y-7">
          <h1 className="text-5xl font-black text-[#0a0e1a] leading-[1.12] tracking-tight">
            顧客ごとの<br />
            購入履歴を、<br />
            すぐに<span className="text-blue-600">検索</span>。
          </h1>

          <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
            名前・メールアドレスを照合して、1人あたりの過去購入履歴をすばやく確認。コンテンツホルダー別・案件別の絞り込みや、CSVインポートにも対応。
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: Users, label: '名前・メアド照合' },
              { icon: Search, label: '購入履歴検索' },
              { icon: LayoutGrid, label: 'コンテンツホルダー別管理' },
              { icon: Tag, label: '案件別検索' },
              { icon: Upload, label: 'CSVインポート対応' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                <Icon size={14} className="text-blue-500 shrink-0" />
                {label}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onStart}
            className="inline-flex items-center gap-3 bg-[#0f1729] text-white px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-[#1a2540] transition-colors shadow-lg shadow-slate-900/20 group"
          >
            <LayoutGrid size={16} />
            管理画面を開く
            <ArrowRight size={15} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Right: app mockup */}
        <div className="flex-1 min-w-0 flex justify-center">
          <div
            className="w-full max-w-[620px] rounded-2xl shadow-2xl shadow-blue-900/15 overflow-hidden border border-white/60 flex"
            style={{ height: 420 }}
          >
            {/* Sidebar */}
            <div className="w-14 bg-[#0f1729] flex flex-col items-center py-5 gap-3 shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                <BarChart3 size={15} className="text-white" />
              </div>
              {[
                { Icon: Home, active: true },
                { Icon: Users, active: false },
                { Icon: List, active: false },
                { Icon: Tag, active: false },
                { Icon: BarChart3, active: false },
              ].map(({ Icon, active }, i) => (
                <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-blue-600' : 'hover:bg-white/5'}`}>
                  <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
                </div>
              ))}
              <div className="mt-auto">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                  <Settings size={16} className="text-slate-500" />
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 bg-[#f8fafc] flex flex-col overflow-hidden">
              {/* Top bar */}
              <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                  <Search size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-400">名前・メールアドレスで検索</span>
                </div>
                <Bell size={15} className="text-slate-400 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users size={11} className="text-blue-600" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">管理者</span>
                  <ChevronDown size={11} className="text-slate-400" />
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden">
                {/* Filter panel */}
                <div className="w-36 bg-white border-r border-slate-100 p-3 space-y-3 shrink-0">
                  <p className="text-xs font-bold text-slate-600">絞り込み</p>
                  {['コンテンツホルダー', '案件', '期間'].map(label => (
                    <div key={label}>
                      <p className="text-[10px] text-slate-400 mb-1">{label}</p>
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                        <span className="text-[10px] text-slate-500">すべて</span>
                        <ChevronDown size={9} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                  <button className="w-full flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-500">
                    <RefreshCw size={9} />条件をクリア
                  </button>
                </div>

                {/* Customer panel */}
                <div className="flex-1 p-3 space-y-2 overflow-hidden">
                  {/* Customer card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Users size={16} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">山田 太郎</p>
                        <p className="text-[10px] text-slate-400">yamada@example.com</p>
                      </div>
                      <div className="flex gap-3 text-right">
                        <div>
                          <p className="text-[10px] text-slate-400">購入回数</p>
                          <p className="text-sm font-bold text-blue-600">4 回</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">累計購入額</p>
                          <p className="text-sm font-bold text-blue-600">¥128,000</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase history */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] font-bold text-slate-600 mb-2">購入履歴一覧</p>
                    <div className="space-y-1.5">
                      {[
                        { date: '2026/04/12', name: '出版基礎 入門コース', amount: '¥36,000', color: 'bg-blue-500' },
                        { date: '2026/03/01', name: 'AIライティング講座', amount: '¥32,000', color: 'bg-violet-500' },
                        { date: '2025/12/18', name: 'セールス講座', amount: '¥30,000', color: 'bg-green-500' },
                        { date: '2025/10/05', name: '出版基礎 実践コース', amount: '¥30,000', color: 'bg-orange-500' },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-5 h-5 ${row.color} rounded-md flex items-center justify-center shrink-0`}>
                            <BarChart3 size={10} className="text-white" />
                          </div>
                          <span className="text-[9px] text-slate-400 shrink-0 w-16">{row.date}</span>
                          <span className="text-[9px] text-slate-600 flex-1 truncate">{row.name}</span>
                          <span className="text-[9px] font-semibold text-slate-700 shrink-0">{row.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
