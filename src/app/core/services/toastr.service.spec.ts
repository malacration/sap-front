import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastrService } from './toastr.service';

describe('ToastrService notifications', () => {
  let service: ToastrService;
  beforeEach(() => { service = TestBed.inject(ToastrService); });
  afterEach(() => service.clear());

  it('renders backend messages as text, prevents duplicates and supports dismissal', () => {
    const message = '<img src=x onerror=alert(1)>';
    const first = service.error(message, 'Falha', { timeOut: 0 });
    expect(service.error(message, 'Falha').toastId).toBe(first.toastId);
    const notification = document.querySelector('.app-toast-container [role="alert"]')!;
    expect(notification.textContent).toContain(message);
    expect(notification.querySelector('img')).toBeNull();
    expect(document.querySelectorAll('.app-toast-container .alert').length).toBe(1);
    (notification.querySelector('button') as HTMLButtonElement).click();
    expect(document.querySelector('.app-toast-container')).toBeNull();
  });

  it('honors extended timeouts and cleans the container after the last message', fakeAsync(() => {
    service.info('Processamento em andamento', 'Importação', { timeOut: 15000 });
    tick(3000);
    expect(document.querySelector('.app-toast-container')).not.toBeNull();
    tick(12000);
    expect(document.querySelector('.app-toast-container')).toBeNull();
  }));
});
