import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { BsDatepickerDirective, BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormularioParametrosComponent } from './formulario-parametros.component';
import { CampoDataComponent } from '../../../../shared/components/campo-data/campo-data.component';

@Component({ selector: 'app-parametro-cadastro', template: '' })
class CadastroStub {
  @Input() parametro: any;
  @Input() valor: any;
  @Output() valorChange = new EventEmitter<any>();
}

describe('Calendario do formulario de parametros', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormularioParametrosComponent, CampoDataComponent, CadastroStub],
      imports: [CommonModule, ReactiveFormsModule, NoopAnimationsModule, BsDatepickerModule.forRoot()],
    }).compileComponents();
  });

  for (const tipo of ['date', 'datetime'] as const) {
    it(`abre o calendario real para ${tipo} e envia ISO`, fakeAsync(() => {
      const fixture = TestBed.createComponent(FormularioParametrosComponent);
      const component = fixture.componentInstance;
      component.parametros = [{ nome: 'inicio', tipo, obrigatorio: true }];
      fixture.detectChanges();
      tick();
      const input = fixture.debugElement.query(By.directive(BsDatepickerDirective));
      const picker = input.injector.get(BsDatepickerDirective);
      const botao: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      botao.click();
      fixture.detectChanges();
      tick(500);
      expect(picker.isOpen).toBeTrue();
      expect(document.body.querySelector('bs-datepicker-container .bs-datepicker')).not.toBeNull();
      expect(!!document.body.querySelector('bs-datepicker-container timepicker')).toBe(tipo === 'datetime');
      picker.bsValue = new Date(2026, 8, 18, 14, 30);
      fixture.detectChanges();
      tick(500);
      expect(component.valores().inicio).toBe(tipo === 'date' ? '2026-09-18' : '2026-09-18T14:30:00');
      expect((input.nativeElement as HTMLInputElement).value).toContain('18/09/2026');
      const limpar: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[1];
      limpar.click();
      fixture.detectChanges();
      tick(500);
      expect(component.valores().inicio).toBeNull();
      expect(component.valido).toBeFalse();
      fixture.destroy();
      tick(500);
    }));
  }
});
