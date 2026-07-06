// Matches Java Income entity exactly.
// Key fix: 'isRecurring' (not 'recurring').
export interface Income {
  incomeId: number;
  userId: number;
  categoryId: number;
  title: string;
  amount: number;
  currency: string;
  source: string;
  date: string;               // LocalDate → ISO string "YYYY-MM-DD"
  notes?: string | null;
  isRecurring: boolean;       // FIX: was 'recurring'
  recurrencePeriod?: string | null;
  createdAt: string;
}

export interface IncomeTotalResponse {
  totalIncome: number;
}
