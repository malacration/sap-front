import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ParametroCadastroComponent } from './parametro-cadastro.component';
import { TipoParametro } from '../../modelos/relatorio.model';

describe('Parametro de cadastro', () => {
  let component: ParametroCadastroComponent;
  let service: any;
  function configurar(tipo: TipoParametro, multiplo = false, valor: any = null): void {
    component.parametro = { nome: 'filtro', tipo, multiplo, obrigatorio: true };
    component.valor = valor;
    component.ngOnChanges({ parametro: new SimpleChange(null, component.parametro, true) });
  }
  beforeEach(() => {
    service = jasmine.createSpyObj('Cadastro', ['search', 'searchItem']);
    service.search.and.returnValue(of({ content: [], nextLink: '' }));
    component = new ParametroCadastroComponent(service, service, service, service);
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
    component.selecionar({ CardCode: 'C002', CardName: 'Cliente' });
    component.selecionar({ CardCode: 'C002', CardName: 'Cliente' });
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
    component.selecionar({ ItemCode: '001', ItemDescription: 'Item' });
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
});
