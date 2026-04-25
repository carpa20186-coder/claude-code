import { BarChart3 } from 'lucide-react';
import type { ColumnMapping } from '../types';

interface Props {
  columns: string[];
  mapping: ColumnMapping;
  onMappingChange: (m: ColumnMapping) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const FIELDS: { key: keyof ColumnMapping; label: string; desc: string; required: boolean }[] = [
  { key: 'name',          label: '顧客名',             desc: '氏名・名前の列',           required: true  },
  { key: 'email',         label: 'メールアドレス',      desc: 'メール・連絡先の列',        required: true  },
  { key: 'contentHolder', label: 'コンテンツホルダー',  desc: '販売元・ホルダーの列',      required: false },
  { key: 'project',       label: '案件・商品名',        desc: '商品名・案件名の列',        required: false },
  { key: 'date',          label: '購入日',              desc: '日付・購入日時の列',        required: false },
  { key: 'amount',        label: '金額',                desc: '価格・金額の列',            required: false },
];

export function MappingPanel({ columns, mapping, onMappingChange, onConfirm, onBack }: Props) {
  const canConfirm = mapping.name || mapping.email;

  function setField(key: keyof ColumnMapping, value: string) {
    onMappingChange({ ...mapping, [key]: value });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <header className="bg-white border-b border-blue-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">CustomerInsight</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-2">
              ステップ 2 / 2
            </div>
            <h2 className="text-2xl font-bold text-slate-900">列のマッピング</h2>
            <p className="text-slate-500 text-sm">CSVの列名とアプリの項目を対応させてください</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-44 shrink-0">
                  <p className="text-sm font-medium text-slate-700">
                    {f.label}
                    {f.required && <span className="text-blue-500 ml-1">*</span>}
                  </p>
                  <p className="text-xs text-slate-400">{f.desc}</p>
                </div>
                <select
                  value={mapping[f.key]}
                  onChange={e => setField(f.key, e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-700"
                >
                  <option value="">(未設定)</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              戻る
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className="flex-2 bg-blue-600 text-white rounded-xl py-3 px-8 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              検索画面へ進む →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
