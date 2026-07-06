export interface RecurringTransaction {
  recurringId: number;
  userId: number;
  categoryId: number;
  title: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  currency: string;
  startDate: string;
  endDate?: string | null;
  nextDueDate: string;
  active: boolean;
  description?: string | null;
  paymentMethod?: string | null;
  source?: string | null;
  createdAt: string;
}

export interface RecurringOccurrence extends RecurringTransaction {
  occurrenceKey: string;
  occurrenceDate: string;
}
