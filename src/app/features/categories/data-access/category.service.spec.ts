import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CategoryService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads categories for a user from the gateway API', () => {
    const response = [
      {
        categoryId: 1,
        userId: 7,
        name: 'Food',
        type: 'EXPENSE' as const,
        icon: 'restaurant',
        colorCode: '#FF6B6B',
        budgetLimit: 5000,
        default: true,
        createdAt: '2026-05-04'
      }
    ];

    service.getByUser(7).subscribe((categories) => {
      expect(categories).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.apiBase}/categories/user/7`);
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('creates a category through the gateway API', () => {
    const payload = {
      userId: 7,
      name: 'Travel',
      type: 'EXPENSE' as const,
      icon: 'flight',
      colorCode: '#42A5F5',
      budgetLimit: 0
    };
    const response = {
      ...payload,
      categoryId: 12,
      default: false,
      createdAt: '2026-05-04'
    };

    service.create(payload).subscribe((category) => {
      expect(category).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.apiBase}/categories`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(response);
  });
});
