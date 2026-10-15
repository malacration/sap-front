import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LastPrice } from '../../models/last-price';
import { CalculadoraService } from '../../service/calculadora.service';
import { FontesPrecoComponent } from './fontes-preco.component';

describe('FontesPrecoComponent', () => {
  const precoComNf: LastPrice = {
    ItemCode: 'INS01',
    LastPurPrc: 3000,
    LstEvlPric: 2.9,
    AvgPrice: 2.8,
    U_productionCost: 2.5,
    InvntryUom: 'KG',
    UgpCode: 'TON-KG',
    PrecoUltimaNfUnEstoque: 3,
    FreteUltimaNf: 300,
    FreteUnEstoque: 0.15,
    CustoComFreteUnEstoque: 3.15,
    QtdCtesUltimaNf: 1,
    UltimaNf: { DocEntry: 10, DocNum: 92826, DocDate: '2026-10-01', ItemCode: 'INS01',
      UnidadeCompra: 'TON', Quantidade: 2, LineTotal: 6000, InvQty: 2000 },
  };

  function criar(resposta: any) {
    const service = jasmine.createSpyObj<CalculadoraService>('CalculadoraService', ['getLastPrice']);
    service.getLastPrice.and.returnValue(resposta);
    const componente = new FontesPrecoComponent(service);
    componente.itemCode = 'INS01';
    componente.deposito = '500.01';
    componente.ngOnChanges({ itemCode: new SimpleChange(null, 'INS01', true) });
    return { componente, service };
  }

  it('consulta o item no deposito e comeca pela ultima NF com frete', () => {
    const { componente, service } = criar(of([precoComNf]));
    expect(service.getLastPrice).toHaveBeenCalledWith('INS01', '500.01');
    expect(componente.selecionada).toBe('compraComFrete');
    const comFrete = componente.fontes[0];
    expect(comFrete.preco).toBe(3);
    expect(comFrete.frete).toBe(0.15);
    expect(comFrete.total).toBe(3.15);
  });

  it('so a fonte com NF mostra o frete', () => {
    const { componente } = criar(of([precoComNf]));
    expect(componente.fontes.filter(f => f.frete !== null).map(f => f.codigo)).toEqual(['compraComFrete']);
  });

  it('sem NF de entrada nao oferece as fontes da nota e comeca pelo custo contabil', () => {
    const { componente } = criar(of([{ ...precoComNf, UltimaNf: undefined }]));
    expect(componente.fontes.map(f => f.codigo)).not.toContain('compraComFrete');
    expect(componente.selecionada).toBe('contabil');
  });

  it('usar emite o total da fonte selecionada', () => {
    const { componente } = criar(of([precoComNf]));
    const emitidos: number[] = [];
    componente.precoSelecionado.subscribe(v => emitidos.push(v));
    componente.selecionar('contabil');
    componente.usar();
    expect(emitidos).toEqual([2.8]);
  });

  it('avisa quando a unidade da receita nao e a de estoque', () => {
    const { componente } = criar(of([precoComNf]));
    componente.unidadeReceita = 'kg';
    expect(componente.unidadeDiferente).toBeFalse();
    componente.unidadeReceita = 'TON';
    expect(componente.unidadeDiferente).toBeTrue();
  });

  it('item sem registro no deposito ou erro na consulta vira mensagem', () => {
    expect(criar(of([])).componente.erro).toContain('500.01');
    expect(criar(throwError(() => new Error('x'))).componente.erro).toContain('Não foi possível');
  });
});
