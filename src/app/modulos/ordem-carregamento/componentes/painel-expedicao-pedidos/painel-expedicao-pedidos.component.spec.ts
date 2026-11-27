import { Subject, of } from 'rxjs';
import { PainelExpedicaoPedidosComponent } from './painel-expedicao-pedidos.component';
import { Page } from '../../../../sap/model/page.model';

describe('PainelExpedicaoPedidosComponent', () => {
  function tela() {
    const chamadas = { pedidos: [] as any[], totais: 0 };
    const service = {
      getByFilters: (...args: any[]) => {
        chamadas.pedidos.push(args);
        return of(Object.assign(new Page<any>(), { content: [{ DocDate: '20260101' }], totalElements: 120, size: 50 }));
      },
      getTotais: () => {
        chamadas.totais++;
        return of({ linhas: 120, pedidos: 100, notasVendaFutura: 20 });
      },
    } as any;
    const componente = new PainelExpedicaoPedidosComponent(service);
    componente.branchIds = [1, 2];
    componente.ngOnInit();
    return { componente, chamadas };
  }

  // args: ..., emOrdem (11), page (12), size (13)
  it('mudar filtro volta para a pagina 0, envia emOrdem e atualiza os totais', () => {
    const { componente, chamadas } = tela();
    componente.carregarPagina(2);
    expect(componente.paginaAtual).toBe(2);

    componente.onEmOrdemDeCarregamentoChange('Sim');

    const ultima = chamadas.pedidos[chamadas.pedidos.length - 1];
    expect(ultima[11]).toBe('Sim');
    expect(ultima[12]).toBe(0);
    expect(ultima[13]).toBe(50);
    expect(componente.paginaAtual).toBe(0);
    expect(componente.totalItens).toBe(120);
    expect(componente.totais?.notasVendaFutura).toBe(20);
  });

  it('trocar de pagina nao recalcula os totais', () => {
    const { componente, chamadas } = tela();
    const antes = chamadas.totais;
    componente.carregarPagina(1);
    expect(chamadas.totais).toBe(antes);
    expect(chamadas.pedidos[chamadas.pedidos.length - 1][12]).toBe(1);
  });

  it('limpa os totais ao mudar o filtro, ate a nova resposta chegar', () => {
    const { componente } = tela();
    const svc = (componente as any).PainelExpedicaoPedidosService;
    const pendente = new Subject<any>();
    svc.getTotais = () => pendente;
    componente.onEmOrdemDeCarregamentoChange('Não');
    expect(componente.totais).toBeNull();
    pendente.next({ linhas: 1, pedidos: 1, notasVendaFutura: 0 });
    expect(componente.totais?.linhas).toBe(1);
  });

  it('sem nenhuma filial nao consulta e limpa a tela', () => {
    const { componente, chamadas } = tela();
    const antes = chamadas.pedidos.length;
    componente.selectBranches([]);
    expect(chamadas.pedidos.length).toBe(antes);
    expect(componente.resultado.content.length).toBe(0);
    expect(componente.totais).toBeNull();
  });

  it('trocar as filiais volta para a pagina 0 e envia a lista', () => {
    const { componente, chamadas } = tela();
    componente.carregarPagina(2);
    componente.selectBranches([{ Bplid: 2 } as any, { Bplid: 5 } as any]);
    expect(componente.paginaAtual).toBe(0);
    expect(chamadas.pedidos[chamadas.pedidos.length - 1][2]).toEqual([2, 5]);
  });
});
