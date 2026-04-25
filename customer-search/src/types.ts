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

export type ViewMode = 'import' | 'mapping' | 'search' | 'detail';
