import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsDatepickerDirective, BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { CampoDataComponent } from './campo-data.component';

@Component({
  template: `<app-campo-data inputId="campo" [hora]="hora" [(ngModel)]="valor"
               (ngModelChange)="mudancas = mudancas + 1" [disabled]="desabilitado"></app-campo-data>`,
})
class HostComponent {
  valor: string | null = null;
  hora = false;
  desabilitado = false;
  mudancas = 0;
}

describe('CampoDataComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HostComponent, CampoDataComponent],
      imports: [FormsModule, NoopAnimationsModule, BsDatepickerModule.forRoot()],
    }).compileComponents();
  });

  function criar(valor: string | null, hora = false) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.valor = valor;
    fixture.componentInstance.hora = hora;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
    const debug = fixture.debugElement.query(By.directive(BsDatepickerDirective));
    return {
      fixture,
      host: fixture.componentInstance,
      input: debug.nativeElement as HTMLInputElement,
      picker: debug.injector.get(BsDatepickerDirective),
    };
  }

  it('mostra a string ISO em DD/MM/AAAA sem emitir alteracao', fakeAsync(() => {
    const { host, input, fixture } = criar('2026-09-18');
    expect(input.value).toBe('18/09/2026');
    expect(input.id).toBe('campo');
    expect(host.mudancas).toBe(0);
    fixture.destroy();
  }));

  it('aceita valor com hora vindo do SAP e le no dia certo (sem voltar um dia pelo fuso)', fakeAsync(() => {
    const { input, fixture } = criar('2026-01-01T00:00:00Z');
    expect(input.value).toBe('01/01/2026');
    fixture.destroy();
  }));

  it('devolve YYYY-MM-DD ao escolher uma data', fakeAsync(() => {
    const { host, picker, fixture } = criar(null);
    picker.bsValue = new Date(2026, 8, 18, 14, 30);
    fixture.detectChanges();
    tick();
    expect(host.valor).toBe('2026-09-18');
    expect(host.mudancas).toBe(1);
    fixture.destroy();
  }));

  it('com hora devolve YYYY-MM-DDTHH:mm:00', fakeAsync(() => {
    const { host, picker, fixture } = criar(null, true);
    picker.bsValue = new Date(2026, 8, 18, 14, 30);
    fixture.detectChanges();
    tick();
    expect(host.valor).toBe('2026-09-18T14:30:00');
    fixture.destroy();
  }));

  it('limpar devolve null', fakeAsync(() => {
    const { host, fixture } = criar('2026-09-18');
    const limpar: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[1];
    limpar.click();
    fixture.detectChanges();
    tick();
    expect(host.valor).toBeNull();
    fixture.destroy();
  }));

  it('respeita disabled', fakeAsync(() => {
    const { host, input, fixture } = criar('2026-09-18');
    host.desabilitado = true;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(input.disabled).toBeTrue();
    fixture.nativeElement.querySelectorAll('button').forEach((b: HTMLButtonElement) => expect(b.disabled).toBeTrue());
    fixture.destroy();
  }));

  it('abre o calendario em portugues', fakeAsync(() => {
    const { picker, fixture } = criar('2026-09-18');
    picker.show();
    fixture.detectChanges();
    tick(500);
    const calendario = document.body.querySelector('bs-datepicker-container') as HTMLElement;
    expect(calendario).not.toBeNull();
    const texto = calendario.textContent!.toLowerCase();
    expect(texto).toContain('setembro');
    expect(texto).not.toContain('september');
    picker.hide();
    fixture.destroy();
    tick(500);
  }));
});
