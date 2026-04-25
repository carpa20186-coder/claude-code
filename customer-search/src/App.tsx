import { useState, useCallback, useEffect, useRef } from 'react';
import { ImportPanel } from './components/ImportPanel';
import { MappingPanel } from './components/MappingPanel';
import { SearchPanel } from './components/SearchPanel';
import { DetailPanel } from './components/DetailPanel';
import { autoDetectMapping } from './utils/csv';
import { buildCustomers } from './utils/customers';
import { fetchSheetWithToken } from './utils/sheets';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import type { PurchaseRecord, Customer, ColumnMapping, ViewMode, SyncConfig } from './types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export default function App() {
  const [view, setView] = useState<ViewMode>('import');
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '', email: '', contentHolder: '', project: '', date: '', amount: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [syncing, setSyncing] = useState(false);
  const mappingRef = useRef(mapping);
  mappingRef.current = mapping;

  const { token, user, ready, loading: authLoading, signIn, signOut } = useGoogleAuth(CLIENT_ID);

  const applyRecords = useCallback((recs: PurchaseRecord[], cols: string[], currentMapping?: ColumnMapping) => {
    setRecords(recs);
    setColumns(cols);
    const m = currentMapping ?? autoDetectMapping(cols);
    setCustomers(buildCustomers(recs, m));
    return m;
  }, []);

  const handleImport = useCallback((recs: PurchaseRecord[], cols: string[], sheetUrl?: string) => {
    const detected = autoDetectMapping(cols);
    setMapping(detected);
    applyRecords(recs, cols, detected);
    if (sheetUrl) {
      setSyncConfig({ sheetUrl, intervalMin: 5, lastSync: new Date() });
      setView('mapping');
    } else {
      setSyncConfig(null);
      setView('mapping');
    }
  }, [applyRecords]);

  const handleMappingConfirm = useCallback(() => {
    setCustomers(buildCustomers(records, mapping));
    setView('search');
  }, [records, mapping]);

  // Auto-refresh
  const doSync = useCallback(async () => {
    if (!syncConfig || !token) return;
    setSyncing(true);
    try {
      const result = await fetchSheetWithToken(syncConfig.sheetUrl, token);
      applyRecords(result.records, result.columns, mappingRef.current);
      setSyncConfig(prev => prev ? { ...prev, lastSync: new Date() } : null);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
    }
  }, [syncConfig, token, applyRecords]);

  useEffect(() => {
    if (!syncConfig || !token || view !== 'search') return;
    const ms = syncConfig.intervalMin * 60 * 1000;
    const id = setInterval(doSync, ms);
    return () => clearInterval(id);
  }, [syncConfig, token, view, doSync]);

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
        syncConfig={syncConfig}
        syncing={syncing}
        onManualSync={doSync}
        googleUser={user}
        onSyncIntervalChange={min =>
          setSyncConfig(prev => prev ? { ...prev, intervalMin: min } : null)
        }
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
