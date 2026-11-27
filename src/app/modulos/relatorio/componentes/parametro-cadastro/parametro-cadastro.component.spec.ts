import { SimpleChange } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ParametroCadastroComponent } from './parametro-cadastro.component';
import { TipoParametro } from '../../modelos/relatorio.model';
import { CadastroRelatorioService } from '../../servicos/cadastro-relatorio.service';
import { ConfigService } from '../../../../core/services/config.service';
import { SalesPersonService } from '../../../../sap/service/sales-person.service';
import { LocalidadeService } from '../../../sap-shared/_services/localidade.service';

describe('Parametro de cadastro: provider', () => {
  it('fornece o CadastroRelatorioService so no proprio componente', () => {
    TestBed.configureTestingModule({
      declarations: [ParametroCadastroComponent],
      providers: [
        { provide: SalesPersonService, useValue: {} },
        { provide: LocalidadeService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: HttpClient, useValue: {} },
      ],
    }).overrideTemplate(ParametroCadastroComponent, '');
    const fixture = TestBed.createComponent(ParametroCadastroComponent);
    expect(fixture.debugElement.injector.get(CadastroRelatorioService)).toBeTruthy();
    expect(TestBed.inject(CadastroRelatorioService, null)).toBeNull();
  });
});

describe('Parametro de cadastro', () => {
  let component: ParametroCadastroComponent;
  let service: any;
  let cadastros: any;
  function configurar(tipo: TipoParametro, multiplo = false, valor: any = null): void {
    component.parametro = { nome: 'filtro', tipo, multiplo, obrigatorio: true };
    component.valor = valor;
    component.ngOnChanges({ parametro: new SimpleChange(null, component.parametro, true) });
  }
  beforeEach(() => {
    service = jasmine.createSpyObj('Cadastro', ['search']);
    service.search.and.returnValue(of({ content: [], nextLink: '' }));
    cadastros = jasmine.createSpyObj('CadastroRelatorioService', ['buscar']);
    cadastros.buscar.and.returnValue(of({ content: [], nextLink: '' }));
    component = new ParametroCadastroComponent(service, service, cadastros);
  });
  afterEach(() => component.ngOnDestroy());

  it('extrai apenas o codigo numerico e permite zero', () => {
    configurar('vendedor');
    component.selecionar({ SalesEmployeeCode: 0, SalesEmployeeName: 'Vendedor' });
    expect(component.valor).toBe(0);
    expect(component.descricao(0)).toBe('0 — Vendedor');
    component.remover(0);
    expect(component.valor).toBeNull();
  });

  it('acumula sem duplicar, preserva padrao e remove individualmente', () => {
    configurar('parceiro_negocio', true, ['C001']);
    component.selecionar({ codigo: 'C002', nome: 'Cliente' });
    component.selecionar({ codigo: 'C002', nome: 'Cliente' });
    component.selecionar(undefined);
    expect(component.valor).toEqual(['C001', 'C002']);
    component.remover('C001');
    expect(component.valor).toEqual(['C002']);
  });

  it('converte as duas variantes de identificador de filial', () => {
    configurar('filial', true);
    component.selecionarFiliais([{ Bplid: 1 }, { BPLID: '2' }]);
    expect(component.valor).toEqual([1, 2]);
    configurar('filial');
    component.selecionarFiliais({ BPLID: 0 });
    expect(component.valor).toBe(0);
  });

  it('mantem codigo textual de item e localidade', () => {
    configurar('item');
    component.selecionar({ codigo: '001', nome: 'Item' });
    expect(component.valor).toBe('001');
    configurar('localidade');
    component.selecionar({ Code: '007', Name: 'Local' });
    expect(component.valor).toBe('007');
  });

  it('sinaliza erro da busca e permite nova tentativa', () => {
    configurar('vendedor');
    service.search.and.returnValue(throwError(() => new Error('falha')));
    component.service!.search('termo').subscribe({ error: () => {} });
    expect(component.erro).toContain('Tente novamente');
    service.search.and.returnValue(of({ content: [], nextLink: '' }));
    component.service!.search('termo').subscribe();
    expect(component.erro).toBe('');
  });

  it('item usa a busca do sap-reports', () => {
    configurar('item');
    component.service!.search('x').subscribe();
    expect(cadastros.buscar).toHaveBeenCalledWith('item', 'x');
    expect(service.search).not.toHaveBeenCalled();
  });

  it('parceiro_negocio nao usa BusinessPartnerService', () => {
    configurar('parceiro_negocio');
    component.service!.search('Joao').subscribe();
    expect(cadastros.buscar).toHaveBeenCalledWith('parceiro_negocio', 'Joao');
    expect(service.search).not.toHaveBeenCalled();
    expect(component.colunas.map(coluna => coluna.property)).toEqual(['codigo', 'nome']);
  });

  it('condicao_pagamento guarda codigo numerico', () => {
    configurar('condicao_pagamento');
    component.selecionar({ codigo: '-1', nome: 'À vista' });
    expect(component.valor).toBe(-1);
    expect(component.descricao(-1)).toBe('-1 — À vista');
  });

  it('grupo_item guarda codigo numerico e deposito textual', () => {
    configurar('grupo_item');
    component.selecionar({ codigo: 100, nome: 'Rações' });
    expect(component.valor).toBe(100);
    configurar('deposito');
    component.selecionar({ codigo: '01', nome: 'Matriz' });
    expect(component.valor).toBe('01');
  });

  it('conta_contabil multiplo acumula escolhas', () => {
    configurar('conta_contabil', true);
    component.selecionar({ codigo: '1.1.01', nome: 'Caixa' });
    component.selecionar({ codigo: '2.1.02', nome: 'Fornecedores' });
    component.selecionar({ codigo: '1.1.01', nome: 'Caixa' });
    expect(component.valor).toEqual(['1.1.01', '2.1.02']);
  });

  it('busca cada tipo novo pelo proprio nome', () => {
    for (const tipo of ['fornecedor', 'conta_contabil', 'centro_custo', 'condicao_pagamento', 'grupo_item', 'deposito'] as const) {
      configurar(tipo);
      component.service!.search('a').subscribe();
      expect(cadastros.buscar).toHaveBeenCalledWith(tipo, 'a');
    }
  });

  it('vendedor continua no SalesPersonService', () => {
    configurar('vendedor');
    component.service!.search('Ana').subscribe();
    expect(service.search).toHaveBeenCalledWith('Ana');
    expect(cadastros.buscar).not.toHaveBeenCalled();
  });
});
