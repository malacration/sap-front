import { of, throwError } from 'rxjs';
import { DocumentStatementComponent } from './documento.statement.component';

/**
 * O valor do frete na tela nao pode sobreviver a uma mudanca no pedido. Antes, durante o
 * recalculo o campo seguia exibindo o valor anterior como se fosse o vigente - e se a chamada
 * falhasse ou nunca voltasse, um numero irreal ficava travado na tela e entrava no total.
 */
describe('DocumentStatementComponent - frete confiavel na tela', () => {

  let component: DocumentStatementComponent;
  let regiaoService: any;
  let freteManual = false;

  function item(quantidade : number) {
    return { quantidade, unitPriceLiquid: () => 10, PriceList: 1, GroupNum: 1 } as any;
  }

  function regiaoQueCalcula(total : number) {
    return [{ ativa: true, U_Filial: 2, calcularFrete: () => ({ total }) }];
  }

  beforeEach(() => {
    regiaoService = { getByLocalidade: () => of(regiaoQueCalcula(500)) };
    component = new DocumentStatementComponent(
      {} as any, {} as any, {} as any, regiaoService,
      { get: () => of({ Code: '20', Name: 'MANICORE' }) } as any,
      { tipoOperacao: [] } as any, {} as any, {} as any,
      { snapshot: { queryParamMap: { get: () => null } } } as any,
      { backendOnline: true, hasValidCatalog: false } as any,
      {} as any, {} as any,
      { isFreteManual: () => freteManual } as any);
    component.ngOnInit();

    component.tipoEnvio = 'ent';
    component.branchId = 2;
    component.businesPartner = { CardCode: 'CLI001' } as any;
    component.enderecoEntrega = { AddressName: 'ENTREGA', U_Localidade: 20 } as any;
    component.itens = [item(10)];
  });

  /** Estado inicial: nada calculado ainda, entao nao ha valor para mostrar. */
  it('nasce sem frete confirmado', () => {
    expect(component.freteCalculado).toBeFalse();
  });

  it('invalida o valor assim que um recalculo comeca', () => {
    component.changeItens([item(10)]);
    expect(component.freteCalculado).toBeFalse();
  });

  it('zera o frete quando o pedido fica sem itens, em vez de manter o valor antigo', () => {
    component.changeItens([]);

    expect(component.frete).toEqual(0);
    expect(component.freteCalculado).toBeTrue();
  });

  it('zera o frete ao voltar para retirada', () => {
    component.tipoEnvio = 'ret';
    component.changeItens([item(10)]);

    expect(component.frete).toEqual(0);
    expect(component.freteCalculado).toBeTrue();
  });

  it('nao soma frete nao confirmado no total', () => {
    component.frete = 500;
    component.freteCalculado = false;

    expect(component.total()).toEqual(100);
  });

  it('soma o frete no total depois de confirmado', () => {
    component.frete = 500;
    component.freteCalculado = true;

    expect(component.total()).toEqual(600);
  });

  /**
   * Faixa de preco por quantidade: ate 99 itens custa R$ 10/un, de 100 em diante R$ 5/un.
   * 60 + 40 somam 100 e alcancam a faixa barata que nenhum dos dois grupos atinge sozinho.
   */
  function regiaoComFaixas() {
    return {
      ativa: true,
      U_Filial: 2,
      calcularFrete: (_cod: string, quantidade: number) =>
        ({ total: quantidade * (quantidade >= 100 ? 5 : 10) }),
    } as any;
  }

  /**
   * O frete de cada documento tem que sair da quantidade DAQUELE grupo. Ratear o frete combinado
   * aplicava a faixa dos 100 itens aos dois documentos, e o backend - que revalida cada documento
   * sozinho, com 60 e com 40 - nao reproduz esse valor: os documentos seriam recusados.
   */
  it('calcula o frete de cada documento pela quantidade do proprio grupo', () => {
    (component as any).regiaoFrete = regiaoComFaixas();
    (component as any).localidadeFrete = '20';
    component.itens = [
      { ...item(60), GroupNum: 'A' } as any,
      { ...item(40), GroupNum: 'B' } as any,
    ];

    const grupos = Array.from(component.agruparPorGroupNum().values());
    const fretes = grupos.map(itens => (component as any).freteDoGrupo(itens));

    //60 x 10 e 40 x 10 - cada um na sua faixa, nao na faixa dos 100 combinados
    expect(fretes).toEqual([600, 400]);
  });

  /** O total exibido tem que ser o que sera cobrado de verdade, nao o do pedido combinado. */
  it('o total do frete e a soma do que cada documento vai cobrar', () => {
    (component as any).regiaoFrete = regiaoComFaixas();
    (component as any).localidadeFrete = '20';
    component.itens = [
      { ...item(60), GroupNum: 'A' } as any,
      { ...item(40), GroupNum: 'B' } as any,
    ];

    //combinado seria 100 x 5 = 500; dividido, sao 1000
    expect((component as any).somaDoFretePorGrupo()).toEqual(1000);
  });

  /** Sem divisao, um grupo so: o frete e o da quantidade inteira. */
  it('pedido em um documento so usa a faixa da quantidade total', () => {
    (component as any).regiaoFrete = regiaoComFaixas();
    (component as any).localidadeFrete = '20';
    component.itens = [{ ...item(100), GroupNum: 'A' } as any];

    expect((component as any).somaDoFretePorGrupo()).toEqual(500);
  });

  it('sem regiao resolvida o frete do grupo e zero', () => {
    (component as any).regiaoFrete = null;
    component.itens = [{ ...item(10), GroupNum: 'A' } as any];

    expect((component as any).freteDoGrupo(component.itens)).toEqual(0);
  });

  /** Falha na busca da regiao tem que virar zero + erro, nunca deixar o valor anterior. */
  it('nao mantem o valor anterior quando a busca de regiao falha', (done) => {
    component.frete = 500;
    component.freteCalculado = true;
    regiaoService.getByLocalidade = () => throwError(() => new Error('rede'));

    component.changeItens([item(10)]);

    setTimeout(() => {
      expect(component.frete).toEqual(0);
      expect(component.freteErro).toBeTruthy();
      done();
    }, 500);
  });
});

describe('DocumentStatementComponent - frete manual', () => {

  let component: DocumentStatementComponent;

  function item(quantidade : number, GroupNum = 'A') {
    return { quantidade, unitPriceLiquid: () => 10, PriceList: 1, GroupNum } as any;
  }

  beforeEach(() => {
    component = new DocumentStatementComponent(
      {} as any, {} as any, {} as any, { getByLocalidade: () => { throw new Error('nao deve calcular') } } as any,
      {} as any, { tipoOperacao: [] } as any, {} as any, {} as any,
      { snapshot: { queryParamMap: { get: () => null } } } as any,
      { backendOnline: true, hasValidCatalog: false } as any,
      {} as any, {} as any,
      { isFreteManual: () => true } as any);
    component.ngOnInit();
    component.tipoEnvio = 'ent';
    component.branchId = 2;
    component.businesPartner = { CardCode: 'CLI001' } as any;
    //sem localidade: no modo manual isso nao e erro
    component.enderecoEntrega = { AddressName: 'ENTREGA' } as any;
    component.itens = [item(10)];
  });

  it('mantem o valor digitado ao mudar os itens, sem erro de localidade', () => {
    component.frete = 150;
    component.changeItens([item(20)]);

    expect(component.frete).toEqual(150);
    expect(component.freteCalculado).toBeTrue();
    expect(component.freteErro).toBeNull();
  });

  it('rateia o frete digitado entre os documentos pela quantidade, somando o valor exato', () => {
    component.frete = 100;
    const fretes = (component as any).rateiaFreteManual([[item(1)], [item(1)], [item(1)]]);

    expect(fretes).toEqual([33.33, 33.33, 33.34]);
  });
});

