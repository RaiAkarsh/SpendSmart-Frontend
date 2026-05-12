export interface MonthlySummary {
  userId: number;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  totalSpent: number;
  percentage: number;
}

export interface SpendingTrend {
  month: number;
  year: number;
  totalExpenses: number;
  totalIncome: number;
}

export interface FinancialHealthScore {
  userId: number;
  totalScore: number;
  grade: string;
  savingsRate: number;
  savingsScore: number;
  budgetScore: number;
  consistencyScore: number;
  recommendation: string;
}

export interface YearlySummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  year: number;
}

export interface CompareSummary {
  totalIncome: number;
  totalExpenses: number;
  difference: number;
  month: number;
  year: number;
}

export interface AllTimeTotals {
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  netPosition?: number;
}
