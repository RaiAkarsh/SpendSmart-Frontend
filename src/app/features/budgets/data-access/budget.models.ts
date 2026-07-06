export interface Budget {
  budgetId: number;
  userId: number;
  categoryId: number;
  name: string;
  limitAmount: number;
  currency: string;
  period: 'MONTHLY' | 'WEEKLY' | 'CUSTOM';
  startDate: string;
  endDate?: string | null;
  spentAmount: number;
  alertThreshold: number;
  active: boolean;
  createdAt: string;
}

export interface BudgetProgress {
  budgetId: number;
  name: string;
  limitAmount: number;
  spentAmount: number;
  remaining: number;
  percentageUsed: number;
  alertThreshold: number;
  alertTriggered: boolean;
  exceeded: boolean;
  status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED';
}
