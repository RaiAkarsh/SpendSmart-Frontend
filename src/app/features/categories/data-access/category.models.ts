export interface Category {
  categoryId: number;
  userId: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon?: string | null;
  colorCode?: string | null;
  budgetLimit: number;
  default: boolean;
  createdAt: string;
}
