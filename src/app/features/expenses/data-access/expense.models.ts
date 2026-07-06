// Matches Java Expense entity exactly.
// Key fix: 'isRecurring' (not 'recurring') — Jackson serializes
// `boolean isRecurring` as JSON key "isRecurring".
export interface Expense {
  expenseId: number;
  userId: number;
  categoryId: number;
  title: string;
  amount: number;
  currency: string;
  type: string;
  paymentMethod: string;
  date: string;           // LocalDate → ISO string "YYYY-MM-DD"
  notes?: string | null;
  receiptUrl?: string | null;
  isRecurring: boolean;   // FIX: was 'recurring'
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseTotalResponse {
  totalExpenses: number;
}
