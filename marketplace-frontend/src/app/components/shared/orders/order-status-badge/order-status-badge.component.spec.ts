import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderStatusBadgeComponent } from './order-status-badge.component';

describe('OrderStatusBadgeComponent', () => {
  let fixture: ComponentFixture<OrderStatusBadgeComponent>;
  let component: OrderStatusBadgeComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrderStatusBadgeComponent],
    });
    fixture = TestBed.createComponent(OrderStatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('renders pending status with warn tone', () => {
    fixture.componentRef.setInput('status', 'PENDING');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('Pending');
    expect(span.className).toContain('pill warn');
  });

  it('renders confirmed and shipped status with info tone', () => {
    fixture.componentRef.setInput('status', 'CONFIRMED');
    fixture.detectChanges();
    let span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('Confirmed');
    expect(span.className).toContain('pill info');

    fixture.componentRef.setInput('status', 'SHIPPED');
    fixture.detectChanges();
    span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('Shipped');
    expect(span.className).toContain('pill info');
  });

  it('renders delivered and paid status with good tone', () => {
    fixture.componentRef.setInput('status', 'DELIVERED');
    fixture.detectChanges();
    let span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('Delivered');
    expect(span.className).toContain('pill good');

    fixture.componentRef.setInput('status', 'PAID');
    fixture.detectChanges();
    span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('Paid');
    expect(span.className).toContain('pill good');
  });

  it('renders cancelled and failed status with bad tone', () => {
    fixture.componentRef.setInput('status', 'CANCELLED');
    fixture.detectChanges();
    let span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('Cancelled');
    expect(span.className).toContain('pill bad');

    fixture.componentRef.setInput('status', 'FAILED');
    fixture.detectChanges();
    span = fixture.nativeElement.querySelector('span');
    expect(span.textContent.trim()).toBe('Failed');
    expect(span.className).toContain('pill bad');
  });
});
