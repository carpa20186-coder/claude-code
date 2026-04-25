export interface PurchaseRecord {
  [key: string]: string;
}

export interface Customer {
  key: string;
  name: string;
  email: string;
  purchases: PurchaseRecord[];
}

export interface ColumnMapping {
  name: string;
  email: string;
  contentHolder: string;
  project: string;
  date: string;
  amount: string;
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export interface SyncConfig {
  sheetUrl: string;
  intervalMin: number;
  lastSync: Date | null;
}

export type ViewMode = 'import' | 'mapping' | 'search' | 'detail';
