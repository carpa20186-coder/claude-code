import { useState, useCallback } from 'react';
import { ImportPanel } from './components/ImportPanel';
import { MappingPanel } from './components/MappingPanel';
import { SearchPanel } from './components/SearchPanel';
import { DetailPanel } from './components/DetailPanel';
import { autoDetectMapping } from './utils/csv';
import { buildCustomers } from './utils/customers';
import type { PurchaseRecord, Customer, ColumnMapping, ViewMode } from './types';

export default function App() {
  const [view, setView] = useState<ViewMode>('import');
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '', email: '', contentHolder: '', project: '', date: '', amount: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleImport = useCallback((recs: PurchaseRecord[], cols: string[]) => {
    setRecords(recs);
    setColumns(cols);
    const detected = autoDetectMapping(cols);
    setMapping(detected);
    setView('mapping');
  }, []);

  const handleMappingConfirm = useCallback(() => {
    setCustomers(buildCustomers(records, mapping));
    setView('search');
  }, [records, mapping]);

  const handleSelectCustomer = useCallback((c: Customer) => {
    setSelectedCustomer(c);
    setView('detail');
  }, []);

  if (view === 'import') {
    return <ImportPanel onImport={handleImport} />;
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
        onSelectCustomer={handleSelectCustomer}
        onReimport={() => setView('import')}
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
