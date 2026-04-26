import { useState, useCallback, useEffect, useRef } from 'react';
import { LandingPage } from './components/LandingPage';
import { ImportPanel } from './components/ImportPanel';
import { MappingPanel } from './components/MappingPanel';
import { SearchPanel } from './components/SearchPanel';
import { DetailPanel } from './components/DetailPanel';
import { autoDetectMapping } from './utils/csv';
import { buildCustomers } from './utils/customers';
import { fetchSheetWithToken } from './utils/sheets';
import { enrichRecord, loadRules, saveRules } from './utils/classify';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import type { PurchaseRecord, Customer, ColumnMapping, ViewMode, SyncConfig, ClassificationRule } from './types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const FIXED_SHEET_URL = import.meta.env.VITE_FIXED_SHEET_URL
  ?? 'https://docs.google.com/spreadsheets/d/1qwtZzo1NL3ClHYyLfMLLnm_pt-1Z2ZTRpIQCUhs5lOs/edit?usp=sharing';

export default function App() {
  const [view, setView] = useState<ViewMode>('landing');
  const [rawRecords, setRawRecords] = useState<PurchaseRecord[]>([]);
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '', email: '', contentHolder: '', project: '', date: '', amount: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [rules, setRules] = useState<ClassificationRule[]>(loadRules);

  const mappingRef = useRef(mapping);
  mappingRef.current = mapping;
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const { token, user, ready, loading: authLoading, signIn, signOut } = useGoogleAuth(CLIENT_ID);

  function applyEnrichAndBuild(recs: PurchaseRecord[], m: ColumnMapping, r: ClassificationRule[]) {
    const enriched = recs.map(rec => enrichRecord(rec, m, r));
    const filtered = enriched.filter(rec => rec['_isContinuation'] !== 'true' && rec['_skip'] !== 'true');
    setRecords(filtered);
    setCustomers(buildCustomers(filtered, m));
  }

  const applyRecords = useCallback((recs: PurchaseRecord[], cols: string[], currentMapping?: ColumnMapping) => {
    setRawRecords(recs);
    setColumns(cols);
    const m = currentMapping ?? autoDetectMapping(cols, recs);
    applyEnrichAndBuild(recs, m, rulesRef.current);
    return m;
  }, []);

  const handleImport = useCallback((recs: PurchaseRecord[], cols: string[], sheetUrl?: string) => {
    const detected = autoDetectMapping(cols, recs);
    setMapping(detected);
    applyRecords(recs, cols, detected);
    setSyncConfig(sheetUrl ? { sheetUrl, intervalMin: 5, lastSync: new Date() } : null);

    // Auto-skip mapping panel when all key fields are detected
    const confident = !!(detected.name || detected.email) && !!detected.project && !!detected.amount;
    setView(confident ? 'search' : 'mapping');
  }, [applyRecords]);

  const handleMappingConfirm = useCallback(() => {
    applyEnrichAndBuild(rawRecords, mapping, rulesRef.current);
    setView('search');
  }, [rawRecords, mapping]);

  const handleRulesChange = useCallback((newRules: ClassificationRule[]) => {
    setRules(newRules);
    saveRules(newRules);
    if (rawRecords.length > 0) {
      applyEnrichAndBuild(rawRecords, mappingRef.current, newRules);
    }
  }, [rawRecords]);

  const doSync = useCallback(async () => {
    if (!syncConfig || !token) return;
    setSyncing(true);
    try {
      const result = await fetchSheetWithToken(syncConfig.sheetUrl, token);
      setRawRecords(result.records);
      applyEnrichAndBuild(result.records, mappingRef.current, rulesRef.current);
      setColumns(result.columns);
      setSyncConfig(prev => prev ? { ...prev, lastSync: new Date() } : null);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
    }
  }, [syncConfig, token]);

  useEffect(() => {
    if (!syncConfig || !token || view !== 'search') return;
    const ms = syncConfig.intervalMin * 60 * 1000;
    const id = setInterval(doSync, ms);
    return () => clearInterval(id);
  }, [syncConfig, token, view, doSync]);

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('import')} />;
  }

  if (view === 'import') {
    return (
      <ImportPanel
        onImport={handleImport}
        googleToken={token}
        googleUser={user}
        googleReady={ready}
        googleLoading={authLoading}
        onGoogleSignIn={signIn}
        onGoogleSignOut={signOut}
        clientIdConfigured={!!CLIENT_ID}
        fixedSheetUrl={FIXED_SHEET_URL}
      />
    );
  }

  if (view === 'mapping') {
    return (
      <MappingPanel
        columns={columns}
        mapping={mapping}
        onMappingChange={setMapping}
        onConfirm={handleMappingConfirm}
        onBack={() => setView('import')}
      />
    );
  }

  if (view === 'search') {
    return (
      <SearchPanel
        customers={customers}
        records={records}
        columns={columns}
        mapping={mapping}
        onSelectCustomer={c => { setSelectedCustomer(c); setView('detail'); }}
        onReimport={() => setView('import')}
        onConfigureMapping={() => setView('mapping')}
        syncConfig={syncConfig}
        syncing={syncing}
        onManualSync={doSync}
        googleUser={user}
        onSyncIntervalChange={min =>
          setSyncConfig(prev => prev ? { ...prev, intervalMin: min } : null)
        }
        rules={rules}
        onRulesChange={handleRulesChange}
      />
    );
  }

  if (view === 'detail' && selectedCustomer) {
    return (
      <DetailPanel
        customer={selectedCustomer}
        columns={columns}
        mapping={mapping}
        onBack={() => setView('search')}
      />
    );
  }

  return null;
}
