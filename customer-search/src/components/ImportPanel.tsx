import { useState, useRef } from 'react';
import { Upload, Link, AlertCircle, Loader2, BarChart3 } from 'lucide-react';
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
            <h1 className="text-3xl font-bold text-slate-900">データをインポート</h1>
            <p className="text-slate-500">CSVファイルまたはGoogleスプレッドシートのURLから顧客データを読み込みます</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl m-4 p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="text-blue-500" size={28} />
              </div>
              <p className="font-semibold text-slate-700 mb-1">CSVファイルをドロップ</p>
              <p className="text-slate-400 text-sm">またはクリックしてファイルを選択</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            <div className="relative flex items-center px-4 mb-4">
              <div className="flex-1 border-t border-slate-100" />
              <span className="px-3 text-slate-400 text-xs font-medium">または</span>
              <div className="flex-1 border-t border-slate-100" />
            </div>

            <div className="px-4 pb-4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Link size={14} className="text-blue-500" />
                Googleスプレッドシート URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && handleSheetUrl()}
                />
                <button
                  onClick={handleSheetUrl}
                  disabled={loading || !sheetUrl.trim()}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  読み込む
                </button>
              </div>
              <p className="text-xs text-slate-400">
                スプレッドシートの共有設定を「リンクを知っている全員が閲覧可能」にしてください
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-medium">読み込み中...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium text-red-700">
                <AlertCircle size={16} />
                読み込みに失敗しました
              </div>
              <p className="text-red-600 text-xs whitespace-pre-wrap leading-relaxed">{error.replace(/^Error:\s*/, '')}</p>
              <div className="border-t border-red-200 pt-2 text-xs text-red-500">
                <p className="font-medium mb-1">CSVでインポートする方法</p>
                <p>スプレッドシート →「ファイル」→「ダウンロード」→「カンマ区切り (.csv)」でダウンロードしてください。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
