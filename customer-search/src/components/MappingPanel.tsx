import type { ColumnMapping } from '../types';

interface Props {
  columns: string[];
  mapping: ColumnMapping;
  onMappingChange: (m: ColumnMapping) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'name', label: '顧客名', required: true },
  { key: 'email', label: 'メールアドレス', required: true },
  { key: 'contentHolder', label: 'コンテンツホルダー', required: false },
  { key: 'project', label: '案件・商品名', required: false },
  { key: 'date', label: '購入日', required: false },
  { key: 'amount', label: '金額', required: false },
];

export function MappingPanel({ columns, mapping, onMappingChange, onConfirm, onBack }: Props) {
  const canConfirm = mapping.name || mapping.email;

  function setField(key: keyof ColumnMapping, value: string) {
    onMappingChange({ ...mapping, [key]: value });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">列のマッピング設定</h2>
          <p className="text-slate-500 text-sm">
            CSVの列名とアプリの項目を対応させてください。<br />
            「顧客名」か「メールアドレス」のどちらかは必須です。
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {FIELDS.map(f => (
            <div key={f.key} className="flex items-center gap-4 p-4">
              <label className="w-44 text-sm font-medium text-slate-700 shrink-0">
                {f.label}
                {f.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <select
                value={mapping[f.key]}
                onChange={e => setField(f.key, e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">(未設定)</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-500">
          <strong>検出された列:</strong> {columns.join(', ')}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            戻る
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            検索画面へ進む
          </button>
        </div>
      </div>
    </div>
  );
}
