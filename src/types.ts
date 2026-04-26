export enum TransactionType {
  INCOME = 'receita',
  EXPENSE = 'despesa',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO string
  createdAt: string; // ISO string
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
}
