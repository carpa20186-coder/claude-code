import { useState, useRef } from 'react';
import { Upload, Link, AlertCircle, Loader2, BarChart3, LogOut, RefreshCw } from 'lucide-react';
import { parseCSVText, fetchGoogleSheet } from '../utils/csv';
import { fetchSheetWithToken } from '../utils/sheets';
import type { PurchaseRecord, GoogleUser } from '../types';

interface Props {
  onImport: (records: PurchaseRecord[], columns: string[], sheetUrl?: string) => void;
  googleToken: string | null;
  googleUser: GoogleUser | null;
  googleReady: boolean;
  googleLoading: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  clientIdConfigured: boolean;
}

export function ImportPanel({
  onImport, googleToken, googleUser, googleReady, googleLoading,
  onGoogleSignIn, onGoogleSignOut, clientIdConfigured,
}: Props) {
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

  async function handleSheetImport() {
    if (!sheetUrl.trim()) return;
    setError('');
    setLoading(true);
    try {
      if (googleToken) {
        const result = await fetchSheetWithToken(sheetUrl.trim(), googleToken);
        onImport(result.records, result.columns, sheetUrl.trim());
      } else {
        const text = await fetchGoogleSheet(sheetUrl.trim());
        const result = await parseCSVText(text);
        onImport(result.records, result.columns);
      }
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, ''));
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isLoading = loading || googleLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <header className="bg-white border-b border-blue-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">CustomerInsight</span>
          </div>
          {googleUser && (
            <div className="flex items-center gap-3">
              {googleUser.picture && (
                <img src={googleUser.picture} alt="" className="w-8 h-8 rounded-full" />
              )}
              <span className="text-sm text-slate-600">{googleUser.name}</span>
              <button
                onClick={onGoogleSignOut}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut size={13} />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">データをインポート</h1>
            <p className="text-slate-500 text-sm">Googleスプレッドシートまたはアップロードして顧客データを読み込む</p>
          </div>

          {/* Google Auth + Sheet URL section */}
          {clientIdConfigured && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                Googleスプレッドシートと連動（推奨）
              </div>

              {!googleToken ? (
                <button
                  onClick={onGoogleSignIn}
                  disabled={!googleReady || googleLoading}
                  className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {googleLoading ? (
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  ) : (
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
                  )}
                  Googleアカウントでログイン
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                  {googleUser?.email} でログイン済み・自動同期が有効になります
                </div>
              )}

              {googleToken && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Link size={12} />
                    スプレッドシートURL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={e => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      onKeyDown={e => e.key === 'Enter' && handleSheetImport()}
                    />
                    <button
                      onClick={handleSheetImport}
                      disabled={isLoading || !sheetUrl.trim()}
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      読み込む
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                    ログイン済みアカウントでアクセス可能なシートを直接読み込みます。読み込み後は5分ごとに自動更新されます。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CSV Upload */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl m-4 p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Upload className="text-blue-500" size={24} />
              </div>
              <p className="font-semibold text-slate-700 mb-1">CSVファイルをアップロード</p>
              <p className="text-slate-400 text-sm">ドラッグ＆ドロップ またはクリックして選択</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {!clientIdConfigured && (
              <>
                <div className="relative flex items-center px-4 mb-4">
                  <div className="flex-1 border-t border-slate-100" />
                  <span className="px-3 text-slate-400 text-xs">または</span>
                  <div className="flex-1 border-t border-slate-100" />
                </div>
                <div className="px-4 pb-4 space-y-2">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Link size={12} />
                    Googleスプレッドシート URL（公開シートのみ）
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={e => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      onKeyDown={e => e.key === 'Enter' && handleSheetImport()}
                    />
                    <button
                      onClick={handleSheetImport}
                      disabled={isLoading || !sheetUrl.trim()}
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      読み込む
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-medium">読み込み中...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium text-red-700">
                <AlertCircle size={15} />
                読み込みに失敗しました
              </div>
              <p className="text-red-600 text-xs whitespace-pre-wrap leading-relaxed">{error}</p>
              {!googleToken && (
                <div className="border-t border-red-200 pt-2 text-xs text-red-500">
                  <p className="font-medium mb-1">CSVでインポートする方法</p>
                  <p>スプレッドシート →「ファイル」→「ダウンロード」→「カンマ区切り (.csv)」</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
