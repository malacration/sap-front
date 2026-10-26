import { of } from 'rxjs';
import { NecessidadeProducaoComponent } from './necessidade-producao.component';
import { DepositoNecessidade, NecessidadeProducaoLinha } from '../../modelos/necessidade-producao.model';

describe('NecessidadeProducaoComponent', () => {
  const depositos: DepositoNecessidade[] = [
    { whsCode: '500.01', whsName: 'PRODUTO ACABADO', filial: 2, filialNome: 'Matriz', estoque: 19780 },
    { whsCode: '500.05', whsName: 'NAO CONFORMIDADE', filial: 2, filialNome: 'Matriz', estoque: 323 },
    { whsCode: '502.06', whsName: 'REVENDA CD PVH', filial: 11, filialNome: 'Filial RO', estoque: 1589 },
    { whsCode: 'teste', whsName: 'TESTE', filial: 0, filialNome: null, estoque: 0 },
  ];

  const linha = (
    itemCode: string, estoque: number, pedido: number, semPrevisao = 0,
    linha: string | null = 'premium', linhaNome: string | null = 'OX PREMIUM', linhaOrdem: number | null = 4,
  ): NecessidadeProducaoLinha => ({
    itemCode, itemName: itemCode, grupo: null, linha, linhaNome, linhaOrdem, unidade: null, estoque, pedido,
    contratoVendaFutura: semPrevisao, simplesFaturamento: 0, aFabricar: estoque - pedido, semPrevisao,
  });

  const resultado = (linhas: NecessidadeProducaoLinha[]) => ({
    linhas, depositos: ['500.01', '502.06'], filiais: [11], depositosExcluidos: [], utilizacoesSimplesFaturamento: [16],
  });

  let service: jasmine.SpyObj<any>;
  let router: jasmine.SpyObj<any>;
  let component: NecessidadeProducaoComponent;

  beforeEach(() => {
    service = jasmine.createSpyObj('NecessidadeProducaoService', ['getDepositos', 'get', 'getDetalhe']);
    service.getDepositos.and.returnValue(of(depositos));
    router = jasmine.createSpyObj('Router', ['createUrlTree', 'serializeUrl']);
    component = new NecessidadeProducaoComponent(service, jasmine.createSpyObj('AlertService', ['info']), router);
    component.ngOnInit();
  });

  it('lista as filiais com venda e agrupa os depositos por filial', () => {
    expect(component.opcoesFiliais.map((it) => it.value)).toEqual(['2', '11']);
    expect(component.gruposDepositos.map((it) => it.options.length)).toEqual([2, 1, 1]);
  });

  it('filial marcada nao limita os depositos: venda da filial contra estoque da fabrica + filial', () => {
    service.get.and.returnValue(of(resultado([])));
    component.aoSelecionarDepositos(['500.01', '502.06']);
    component.aoSelecionarFiliais(['11']);

    expect(component.gruposDepositos.length).toBe(3);
    expect(component.depositosSelecionados).toEqual(['500.01', '502.06']);

    component.gerar();
    expect(service.get.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ filiais: [11], depositos: ['500.01', '502.06'] }));
  });

  it('agrupa pela linha de produto na ordem do SAP, sem linha por ultimo, com subtotais', () => {
    service.get.and.returnValue(of(resultado([
      linha('A', 5, 50),
      linha('B', 10, 0, 0, null, null, null),
      linha('C', 100, 10, 0, 'mega', 'OX MEGA', 2),
      linha('D', 1, 20),
    ])));
    component.gerar();

    expect(component.grupos.map((it) => it.nome)).toEqual(['OX MEGA', 'OX PREMIUM', 'Sem linha']);
    const premium = component.grupos[1];
    expect(premium.linhas.map((it) => it.itemCode)).toEqual(['A', 'D']);
    expect(premium.aFabricar).toBe(-64);
    expect(premium.pedido).toBe(70);
  });

    it('clique na celula abre o detalhe com as filiais do relatorio e leva o mesmo filtro para a nova aba', () => {
    service.get.and.returnValue(of(resultado([linha('A', 5, 50)])));
    service.getDetalhe.and.returnValue(of({ itemCode: 'A', detalhe: 'PEDIDO', documentos: [], filiais: [11], total: 0 }));
    component.gerar();
    component.aoSelecionarFiliais(['2']);

    component.abrirDetalhe(component.linhas[0], 'PEDIDO');
    expect(service.getDetalhe).toHaveBeenCalledWith({ itemCode: 'A', detalhe: 'PEDIDO', filiais: [11] });
    expect(component.detalhe?.itemCode).toBe('A');

    router.serializeUrl.and.returnValue('/relatorios/necessidade-producao/detalhe?itemCode=A');
    spyOn(window, 'open');
    component.abrirDetalheNovaAba();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/relatorios/necessidade-producao/detalhe'], {
      queryParams: { itemCode: 'A', detalhe: 'PEDIDO', filiais: [11], nome: 'A' },
    });
    expect(window.open).toHaveBeenCalledWith('/relatorios/necessidade-producao/detalhe?itemCode=A', '_blank', 'noopener');
  });

  it('manda as filiais como numero e ordena pelo menor a fabricar', () => {
    service.get.and.returnValue(of(resultado([linha('B', 100, 10), linha('A', 5, 50), linha('C', 0, 0)])));
    component.aoSelecionarFiliais(['11']);
    component.gerar();

    expect(service.get.calls.mostRecent().args[0].filiais).toEqual([11]);
    expect(component.linhas.map((it) => it.itemCode)).toEqual(['A', 'B']);

    component.ocultarSemMovimento = false;
    expect(component.linhas.map((it) => it.itemCode)).toEqual(['A', 'C', 'B']);
    expect(component.total('aFabricar')).toBe(45);
  });
});
