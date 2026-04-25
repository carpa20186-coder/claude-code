import { useState, useRef } from 'react';
import { Upload, Link, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSVText, fetchGoogleSheet } from '../utils/csv';
import type { PurchaseRecord } from '../types';

interface Props {
  onImport: (records: PurchaseRecord[], columns: string[]) => void;
}

export function ImportPanel({ onImport }: Props) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      const result = await parseCSVText(text);
      onImport(result.records, result.columns);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSheetUrl() {
    if (!sheetUrl.trim()) return;
    setError('');
    setLoading(true);
    try {
      const text = await fetchGoogleSheet(sheetUrl.trim());
      const result = await parseCSVText(text);
      onImport(result.records, result.columns);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">顧客購入履歴 検索アプリ</h1>
          <p className="text-slate-500">CSVファイルまたはGoogleスプレッドシートからデータをインポートしてください</p>
        </div>

        <div
          className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mx-auto text-slate-400 mb-3" size={40} />
          <p className="text-slate-600 font-medium">CSVファイルをドラッグ＆ドロップ</p>
          <p className="text-slate-400 text-sm mt-1">またはクリックしてファイルを選択</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-slate-400 text-sm">または</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Link size={16} />
            Googleスプレッドシート URL（公開共有リンク）
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onKeyDown={e => e.key === 'Enter' && handleSheetUrl()}
            />
            <button
              onClick={handleSheetUrl}
              disabled={loading || !sheetUrl.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              読み込む
            </button>
          </div>
          <p className="text-xs text-slate-400">
            ※ スプレッドシートを「リンクを知っている全員が閲覧可能」に設定してください
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-indigo-600">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">読み込み中...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="font-medium">読み込みに失敗しました</span>
            </div>
            <p className="whitespace-pre-wrap text-red-600 text-xs leading-relaxed">{error.replace(/^Error:\s*/,'')}</p>
            <div className="border-t border-red-200 pt-2 text-xs text-red-500 space-y-1">
              <p className="font-medium">💡 CSVでインポートする方法：</p>
              <p>スプレッドシートを開き、「ファイル」→「ダウンロード」→「カンマ区切り (.csv)」でダウンロードして上のエリアにドロップしてください。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
