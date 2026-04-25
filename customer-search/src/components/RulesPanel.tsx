import { useState } from 'react';
import { X, Plus, Trash2, RotateCcw, Settings2 } from 'lucide-react';
import type { ClassificationRule } from '../types';
import { DEFAULT_RULES } from '../utils/classify';

interface Props {
  rules: ClassificationRule[];
  onChange: (rules: ClassificationRule[]) => void;
  onClose: () => void;
}

export function RulesPanel({ rules, onChange, onClose }: Props) {
  const [keyword, setKeyword] = useState('');
  const [contentHolder, setContentHolder] = useState('');

  function addRule() {
    const kw = keyword.trim();
    const ch = contentHolder.trim();
    if (!kw || !ch) return;
    const newRule: ClassificationRule = {
      id: `r${Date.now()}`,
      keyword: kw,
      contentHolder: ch,
      priority: 10,
    };
    onChange([...rules, newRule]);
    setKeyword('');
    setContentHolder('');
  }

  function deleteRule(id: string) {
    onChange(rules.filter(r => r.id !== id));
  }

  function resetToDefaults() {
    onChange(DEFAULT_RULES);
  }

  const grouped = rules.reduce<Record<string, ClassificationRule[]>>((acc, r) => {
    (acc[r.contentHolder] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2.5 text-white">
            <Settings2 size={18} />
            <div>
              <p className="font-bold text-sm">分類ルール設定</p>
              <p className="text-blue-200 text-xs">商品名からコンテンツホルダーを自動分類</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Current rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">現在のルール ({rules.length}件)</h3>
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
              >
                <RotateCcw size={12} />
                デフォルトに戻す
              </button>
            </div>

            {Object.keys(grouped).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">ルールがありません</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([holder, holderRules]) => (
                  <div key={holder} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-blue-50 border-b border-slate-200">
                      <span className="text-xs font-bold text-blue-700">{holder}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {holderRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">キーワード:</span>
                            <code className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-mono">
                              {rule.keyword}
                            </code>
                          </div>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add rule form */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-3">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest">ルールを追加</h3>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">キーワード（商品名に含まれる文字列）</label>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="例: 苫米地, 長倉, NAGAKURA..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                onKeyDown={e => e.key === 'Enter' && addRule()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">コンテンツホルダー名</label>
              <input
                type="text"
                value={contentHolder}
                onChange={e => setContentHolder(e.target.value)}
                placeholder="例: Dr.苫米地英人"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                onKeyDown={e => e.key === 'Enter' && addRule()}
              />
            </div>
            <button
              onClick={addRule}
              disabled={!keyword.trim() || !contentHolder.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Plus size={15} />
              追加
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
            <p className="font-semibold mb-1">分類の仕組み</p>
            <ul className="space-y-1 text-amber-600">
              <li>• 商品名にキーワードが含まれていれば、対応するコンテンツホルダーに分類</li>
              <li>• 【残り〇回のお支払い】など継続払いは自動除外</li>
              <li>• 【12分割払い】などの分割払いは合計金額を自動計算（初回×分割数）</li>
            </ul>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            閉じる（自動保存済み）
          </button>
        </div>
      </div>
    </div>
  );
}
