import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { IncomeService } from './income.service';

describe('IncomeService', () => {
  let service: IncomeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IncomeService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(IncomeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads incomes by source through gateway API', () => {
    const response = [
      {
        incomeId: 21,
        userId: 7,
        categoryId: 9,
        title: 'Freelance project',
        amount: 25000,
        currency: 'INR',
        source: 'FREELANCE',
        date: '2026-05-02',
        notes: 'Milestone payout',
        isRecurring: false,
        recurrencePeriod: null,
        createdAt: '2026-05-02T09:30:00'
      }
    ];

    service.getBySource(7, 'FREELANCE').subscribe((incomes) => {
      expect(incomes).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.apiBase}/incomes/user/7/source/FREELANCE`);
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('deletes income through gateway API', () => {
    const response = { message: 'Income entry deleted successfully' };

    service.delete(21).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.apiBase}/incomes/21`);
    expect(request.request.method).toBe('DELETE');
    request.flush(response);
  });
});
