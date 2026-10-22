import { NecessidadeProducaoDocumentosComponent } from './necessidade-producao-documentos.component';
import { DocumentoNecessidade } from '../../modelos/necessidade-producao.model';

describe('NecessidadeProducaoDocumentosComponent', () => {
  const documento = (tipo: DocumentoNecessidade['tipo'], saldo: number): DocumentoNecessidade => ({
    tipo, docEntry: 1, docNum: 1, data: '2026-04-14', previsao: null, cardCode: 'CLI1', cardName: 'CLIENTE',
    filial: 2, filialNome: 'Matriz', deposito: null, vendedor: null, contratoVendaFutura: null,
    quantidade: 80, entregue: 50, emPedido: 0, saldo,
  });

  it('separa venda futura de simples faturamento e so linka o que tem tela', () => {
    const component = new NecessidadeProducaoDocumentosComponent();
    component.detalhe = {
      itemCode: 'A', detalhe: 'SEM_PREVISAO', filiais: [2], total: 1308,
      documentos: [documento('VENDA_FUTURA', 30), documento('SIMPLES_FATURAMENTO', 1278)],
    };

    expect(component.subtotais.map((it) => [it.rotulo, it.saldo])).toEqual([['Venda futura', 30], ['Simples faturamento', 1278]]);
    expect(component.total('saldo')).toBe(1308);
    expect(component.link(component.documentos[0])).toBe('/venda/venda-futura');
    expect(component.link(component.documentos[1])).toBeNull();
    expect(component.data('2026-04-14')).toBe('14/04/2026');
  });
});
