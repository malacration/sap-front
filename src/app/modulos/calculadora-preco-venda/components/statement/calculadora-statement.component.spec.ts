import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { CalculadoraService } from '../../service/calculadora.service';
import { ParameterService } from '../../../../shared/service/parameter.service';
import { of, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CalculadoraStatementComponent } from './statement.component';
import { By } from '@angular/platform-browser';

class CalculadoraServiceStub {
  getProdutosFromLocalStorage(_k: string) { return of([]); }
}
class ParameterServiceStub {
  private params$ = new Subject<Record<string, string | null>>();
  subscribeToParam(_route: ActivatedRoute, key: string, cb: (v: string|null)=>void) {
    const sub = this.params$.subscribe(m => cb(m[key] ?? null));
    return [sub];
  }
}

describe('CalculadoraStatementComponent', () => {
  let fixture: ComponentFixture<CalculadoraStatementComponent>;
  let component: CalculadoraStatementComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterTestingModule],
      declarations: [CalculadoraStatementComponent],
      providers: [
        { provide: CalculadoraService, useClass: CalculadoraServiceStub },
        { provide: ParameterService, useClass: ParameterServiceStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const dataBase = require('src/testing/fixtures/database-calculadora.json')
    localStorage.clear();
    localStorage.setItem('calculadora-relatorioMock', JSON.stringify(dataBase));
    
    fixture = TestBed.createComponent(CalculadoraStatementComponent);
    component = fixture.componentInstance;
  });

  type Timings = Record<string, number[]>;

  const timings: Timings = {};
  
  function addTiming(label: string, ms: number) {
    (timings[label] ??= []).push(ms);
  }
  
  async function measure(label: string, run: () => Promise<void>) {
    const t0 = performance.now();
    await run();
    const t1 = performance.now();
    addTiming(label, t1 - t0);
  }
  
  afterAll(() => {
    const lines = Object.entries(timings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, arr]) => `${label} -> ${arr.map(n => `${n.toFixed(2)}ms`).join(', ')}`);
    if (lines.length) {
      // eslint-disable-next-line no-console
      console.info(lines.join('\n'));
    }
  });
  
  it("o localstorage deve ter itens", () => {
    expect(localStorage.length).toBeGreaterThan(0)
  })

  it('deve chamar getList() no ngOnInit e ter mais que 0 valores', () => {
    const spy = spyOn(component, 'getList').and.callThrough();
    fixture.detectChanges();
    expect(component.getList().length).toBeGreaterThan(0);
    expect(spy).toHaveBeenCalled();
    expect(Array.isArray(component.relatoriosSalvos)).toBeTrue();
    expect(component.relatoriosSalvos.length).toBeGreaterThan(0);
  });

  it('clica no botão Salvar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.analiseSelected).toBeNull
    const carregarButtons = fixture.debugElement.queryAll(By.css('.form-group > button.btn.btn-primary'));
    expect(carregarButtons.length).withContext('Nenhum botão .btn-primary encontrado').toBeGreaterThan(0);
    const firstBtnDe = carregarButtons[0];
    
    measure("Carrega Relatorio", async () =>{
        firstBtnDe.nativeElement.click();
        await fixture.whenStable();
    })

    expect(component.analiseSelected).not.toBeNull
  });

  it('Clica no input do componente', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.analiseSelected).toBeNull
    const carregarButtons = fixture.debugElement.queryAll(By.css('.form-group > button.btn.btn-primary'));
    expect(carregarButtons.length).withContext('Nenhum botão .btn-primary encontrado').toBeGreaterThan(0);
    const firstBtnDe = carregarButtons[0];
    
    firstBtnDe.nativeElement.click();
    await fixture.whenStable();
    
    measure("teste table com o currency", async () =>{
        //TODO procurar como achar esse botao na tela...
    })

    expect(component.analiseSelected).not.toBeNull
  });


});
