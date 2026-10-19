import { of } from 'rxjs';
import { TrocaComponent } from './troca.component';
import { Item } from '../../../model/item';
import { VendaFutura } from '../../../model/venda/venda-futura';

/**
 * A troca precificava os produtos novos sem o desconto da condicao de pagamento. Agora usa a
 * condicao do pedido original, gravada no contrato (U_condicaoPagamento).
 */
describe('TrocaComponent - condicao de pagamento do contrato', () => {

  let component: TrocaComponent;
  let buscas: number;

  function item(tabela: string, preco = 100) {
    return Object.assign(new Item(), { ItemCode: 'NOVO', ItemDescription: 'Produto', PriceList: tabela, UnitPrice: preco, quantidade: 1 });
  }

  beforeEach(() => {
    buscas = 0;
    const condicoes = {
      getByTabelaParaContrato: (tabela: number) => {
        buscas++;
        return of(tabela == 3 ? [{ GroupNum: '15', PymntGroup: '30 dias', ListNum: '3', U_desconto: 5, U_juros: 2 }] : []);
      }
    };
    component = new TrocaComponent({ info: () => Promise.resolve() } as any, {} as any, condicoes as any);
    component.vendaFutura = Object.assign(new VendaFutura(), { U_condicaoPagamento: 15 });
  });

  it('aplica desconto e juros da condicao do contrato ao produto novo', () => {
    const novo = item('3');
    component.changeItensNovos([novo]);

    //100 x 0,95 x 1,02
    expect(Number(novo.unitPriceLiquid())).toEqual(96.9);
    expect(novo.GroupNum).toEqual('15');
    expect(component.pendenciasCondicao).toEqual([]);
    expect(component.podeConfirmar).toBeTrue();
  });

  it('bloqueia produto de tabela sem a condicao do contrato', () => {
    component.changeItensNovos([item('9')]);

    expect(component.pendenciasCondicao.length).toEqual(1);
    expect(component.podeConfirmar).toBeFalse();
  });

  it('bloqueia contrato sem condicao de pagamento', () => {
    component.vendaFutura.U_condicaoPagamento = null;
    component.changeItensNovos([item('3')]);

    expect(component.podeConfirmar).toBeFalse();
  });

  it('busca a condicao uma vez por tabela', () => {
    component.changeItensNovos([item('3')]);
    component.changeItensNovos([item('3'), item('3')]);

    expect(buscas).toEqual(1);
  });
});
