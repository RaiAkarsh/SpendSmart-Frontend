import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { ExpenseService } from './expense.service';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExpenseService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(ExpenseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads expenses by month through gateway API', () => {
    const response = [
      {
        expenseId: 11,
        userId: 7,
        categoryId: 1,
        title: 'Groceries',
        amount: 1450,
        currency: 'INR',
        paymentMethod: 'UPI',
        date: '2026-05-03',
        notes: 'Weekly run',
        receiptUrl: null,
        isRecurring: false,
        isDefault: false,
        createdAt: '2026-05-03T10:00:00',
        updatedAt: '2026-05-03T10:00:00'
      }
    ];

    service.getByMonth(7, 5, 2026).subscribe((expenses) => {
      expect(expenses).toEqual(response);
    });

    const request = httpMock.expectOne(
      `${environment.apiBase}/expenses/user/7/month?month=5&year=2026`
    );
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('updates an expense through gateway API', () => {
    const payload = {
      userId: 7,
      categoryId: 1,
      title: 'Groceries Updated',
      amount: 1600,
      currency: 'INR',
      type: 'EXPENSE' as const,
      paymentMethod: 'CARD',
      date: '2026-05-04',
      notes: 'Added snacks',
      receiptUrl: null,
      isRecurring: false
    };

    const response = {
      expenseId: 11,
      ...payload,
      isDefault: false,
      createdAt: '2026-05-03T10:00:00',
      updatedAt: '2026-05-04T11:00:00'
    };

    service.update(11, payload).subscribe((expense) => {
      expect(expense).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.apiBase}/expenses/11`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(response);
  });
});
