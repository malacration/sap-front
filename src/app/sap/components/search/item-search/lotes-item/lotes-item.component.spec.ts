import { Subject, of, throwError } from 'rxjs';
import { LotesItemComponent } from './lotes-item.component';
import { Item } from '../../../../model/item';
import { ItemSearchComponent } from '../item.component';
import { ModalSelectComponent } from '../../../../../shared/components/modal/select/modal.select.component';
import { ActionReturn } from '../../../../../shared/components/action/action.model';

function item(itemCode: string, warehouseCode: string = null): Item {
  return Object.assign(new Item(), { ItemCode: itemCode, ItemDescription: itemCode, WarehouseCode: warehouseCode });
}

/** O botao Lotes so faz sentido com deposito: e dele que o saldo por lote e lido. */
describe('Item - acao Lotes na busca', () => {

  it('mostra Lotes quando o item tem deposito', () => {
    const tipos = item('PAC0000129', '02.01').getActions().map(acao => acao.retorno.type);
    expect(tipos).toEqual(['selected', 'ver-lotes']);
  });

  it('sem deposito (catalogo offline) so seleciona', () => {
    const tipos = item('PAC0000129').getActions().map(acao => acao.retorno.type);
    expect(tipos).toEqual(['selected']);
  });
});

describe('ModalSelectComponent - acao que nao seleciona', () => {

  it('repassa a acao sem selecionar nem fechar a busca', () => {
    const modal = new ModalSelectComponent();
    modal.buscaModal = { closeModal: jasmine.createSpy('closeModal') } as any;
    const selecionados = [];
    const outras = [];
    modal.contentSelected.subscribe(it => selecionados.push(it));
    modal.outraAcao.subscribe(it => outras.push(it.type));

    modal.action(new ActionReturn('ver-lotes', item('A', '01')));

    expect(outras).toEqual(['ver-lotes']);
    expect(selecionados).toEqual([]);
    expect(modal.buscaModal.closeModal).not.toHaveBeenCalled();
  });
});

describe('ModalSelectComponent - titulo do modal', () => {

  it('usa o titulo informado pela tela', () => {
    const modal = new ModalSelectComponent();
    modal.name = 'Item';
    modal.title = 'Selecione um produto';
    expect(modal.tituloModal).toBe('Selecione um produto');
  });

  it('sem titulo usa Selecionar + nome da busca, nunca o padrao "Titulo"', () => {
    const modal = new ModalSelectComponent();
    modal.name = 'Vendedor';
    expect(modal.tituloModal).toBe('Selecionar Vendedor');
  });
});

describe('ItemSearchComponent - lotes', () => {

  it('abre os lotes do item da linha', () => {
    const component = new ItemSearchComponent({} as any);
    const abertos = [];
    component.lotes = { abrir: (it) => abertos.push(it.ItemCode) } as any;

    component.acao(new ActionReturn('ver-lotes', item('PAC0000129', '02.01')));

    expect(abertos).toEqual(['PAC0000129']);
  });
});

describe('LotesItemComponent', () => {

  let consultas: Array<string>;
  let component: LotesItemComponent;

  function comResposta(resposta: (itemCode: string) => any) {
    consultas = [];
    component = new LotesItemComponent({
      get: (itemCode, deposito) => { consultas.push(`${itemCode}@${deposito}`); return resposta(itemCode); }
    } as any);
    component.modal = { openModal: () => {} } as any;
  }

  it('consulta o deposito do item e soma o disponivel', () => {
    comResposta(() => of([{ DistNumber: 'L1', Quantity: 10 }, { DistNumber: 'L2', Quantity: 2.5 }]));

    component.abrir(item('PAC0000129', '02.01'));

    expect(consultas).toEqual(['PAC0000129@02.01']);
    expect(component.totalDisponivel).toBe(12.5);
    expect(component.loading).toBeFalse();
  });

  it('erro na consulta nao deixa o loading ligado', () => {
    comResposta(() => throwError(() => new Error('403')));

    component.abrir(item('PAC0000129', '02.01'));

    expect(component.erro).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('resposta atrasada do item anterior e descartada', () => {
    const respostas = { A: new Subject<any>(), B: new Subject<any>() };
    comResposta(itemCode => respostas[itemCode].asObservable());

    component.abrir(item('A', '01'));
    component.abrir(item('B', '01'));
    respostas.A.next([{ DistNumber: 'DO-A', Quantity: 99 }]);

    expect(component.lotes).toEqual([]);
    expect(component.loading).toBeTrue();
  });

  it('formata data yyyyMMdd e ISO como dd/MM/yyyy', () => {
    comResposta(() => of([]));
    expect(component.data('20261022')).toBe('22/10/2026');
    expect(component.data('2026-10-22T00:00:00Z')).toBe('22/10/2026');
    expect(component.data(null)).toBe('-');
  });
});
