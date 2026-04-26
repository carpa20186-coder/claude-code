import { useState, useRef, useEffect, useCallback } from 'react';
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
  fixedSheetUrl: string;
}

export function ImportPanel({
  onImport, googleToken, googleUser, googleReady, googleLoading,
  onGoogleSignIn, onGoogleSignOut, clientIdConfigured, fixedSheetUrl,
}: Props) {
  const [sheetUrl, setSheetUrl] = useState(fixedSheetUrl);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoImportStartedRef = useRef(false);

  useEffect(() => {
    if (fixedSheetUrl) {
      setSheetUrl(fixedSheetUrl);
    }
  }, [fixedSheetUrl]);

  async function handleFiles(files: FileList | File[]) {
    setError('');
    setLoading(true);
    try {
      const fileList = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.csv'));
      if (fileList.length === 0) {
        throw new Error('CSVファイルを選択してください。');
      }

      const parsedResults = await Promise.all(
        fileList.map(async (file) => {
          const text = await file.text();
          return parseCSVText(text);
        })
      );

      const columnOrder: string[] = [];
      parsedResults.forEach((result) => {
        result.columns.forEach((column) => {
          if (!columnOrder.includes(column)) columnOrder.push(column);
        });
      });

      const mergedRecords = parsedResults.flatMap((result) =>
        result.records.map((record) => {
          const merged: PurchaseRecord = {};
          columnOrder.forEach((column) => {
            merged[column] = record[column] ?? '';
          });
          return merged;
        })
      );

      onImport(mergedRecords, columnOrder);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const handleSheetImport = useCallback(async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl ?? sheetUrl).trim();
    if (!targetUrl) return;
    setError('');
    setLoading(true);
    try {
      if (googleToken) {
        const result = await fetchSheetWithToken(targetUrl, googleToken);
        onImport(result.records, result.columns, targetUrl);
      } else {
        const text = await fetchGoogleSheet(targetUrl);
        const result = await parseCSVText(text);
        onImport(result.records, result.columns);
      }
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, ''));
    } finally {
      setLoading(false);
    }
  }, [googleToken, onImport, sheetUrl]);

  useEffect(() => {
    if (!fixedSheetUrl || !googleToken || loading || autoImportStartedRef.current) return;
    autoImportStartedRef.current = true;
    void handleSheetImport(fixedSheetUrl);
  }, [fixedSheetUrl, googleToken, loading, handleSheetImport]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  const isLoading = loading || googleLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <header className="bg-white border-b border-blue-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0f1729] rounded-lg flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">IPS Search</span>
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
            <p className="text-slate-500 text-sm">
              Googleログインで固定の社内スプレッドシートを読み込みます
            </p>
          </div>

          {/* Google Auth + Sheet URL section */}
          {clientIdConfigured && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                {fixedSheetUrl ? '固定スプレッドシートと連動' : 'Googleスプレッドシートと連動（推奨）'}
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
                  {googleUser?.email} でログイン済み・{fixedSheetUrl ? '固定シートを自動同期します' : '自動同期が有効になります'}
                </div>
              )}

              {googleToken && (
                <div className="space-y-2">
                  {fixedSheetUrl ? (
                    <>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                          <Link size={12} />
                          連動先スプレッドシート
                        </div>
                        <p className="mt-2 break-all text-sm text-slate-700">{fixedSheetUrl}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSheetImport(fixedSheetUrl)}
                          disabled={isLoading}
                          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                        >
                          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          今すぐ同期
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                        URLは固定です。共有権限のあるGoogleアカウントでログインした時だけ読み込めます。
                        「全体（IPS）」と「全体（未来教育）」の2タブをまとめて読み込み、ログイン後は自動読込し、以後5分ごとに更新されます。
                      </p>
                    </>
                  ) : (
                    <>
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
                          onKeyDown={e => e.key === 'Enter' && void handleSheetImport()}
                        />
                        <button
                          onClick={() => void handleSheetImport()}
                          disabled={isLoading || !sheetUrl.trim()}
                          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                        >
                          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          読み込む
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                        ログイン済みアカウントでアクセス可能なシートを直接読み込みます。gid未指定なら「全体（未来教育）」を優先し、読み込み後は5分ごとに自動更新されます。
                      </p>
                    </>
                  )}
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
              <p className="text-slate-400 text-sm">予備対応です。複数選択できます。ドラッグ＆ドロップ またはクリックして選択</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={e => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)}
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
                      onClick={() => void handleSheetImport()}
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
