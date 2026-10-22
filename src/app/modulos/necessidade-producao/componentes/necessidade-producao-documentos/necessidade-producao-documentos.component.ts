import { Component, Input } from '@angular/core';
import {
  DocumentoNecessidade,
  NecessidadeProducaoDetalhe,
  TipoDocumentoNecessidade,
} from '../../modelos/necessidade-producao.model';

const ROTULOS: Record<TipoDocumentoNecessidade, string> = {
  PEDIDO: 'Pedido',
  VENDA_FUTURA: 'Venda futura',
  SIMPLES_FATURAMENTO: 'Simples faturamento',
};

/**
 * Tabela dos documentos por tras de uma celula da necessidade de producao. Usada no modal
 * (compacto) e na tela de detalhe aberta em nova aba (todas as colunas).
 */
@Component({
  selector: 'app-necessidade-producao-documentos',
  templateUrl: './necessidade-producao-documentos.component.html',
  styleUrls: ['./necessidade-producao-documentos.component.scss'],
})
export class NecessidadeProducaoDocumentosComponent {
  @Input() detalhe: NecessidadeProducaoDetalhe | null = null;
  /** No modal: some com vendedor, filial e as colunas de andamento do documento. */
  @Input() compacto = false;

  get documentos(): DocumentoNecessidade[] {
    return this.detalhe?.documentos ?? [];
  }

  get semPrevisao(): boolean {
    return this.detalhe?.detalhe == 'SEM_PREVISAO';
  }

  /** Subtotal por origem: no sem previsao separa venda futura de simples faturamento. */
  get subtotais(): { tipo: TipoDocumentoNecessidade; rotulo: string; documentos: number; saldo: number }[] {
    const porTipo = new Map<TipoDocumentoNecessidade, { documentos: number; saldo: number }>();
    this.documentos.forEach((it) => {
      const atual = porTipo.get(it.tipo) ?? { documentos: 0, saldo: 0 };
      porTipo.set(it.tipo, { documentos: atual.documentos + 1, saldo: atual.saldo + Number(it.saldo || 0) });
    });
    return [...porTipo.entries()].map(([tipo, soma]) => ({ tipo, rotulo: ROTULOS[tipo], ...soma }));
  }

  rotulo(tipo: TipoDocumentoNecessidade): string {
    return ROTULOS[tipo] ?? tipo;
  }

  classeTipo(tipo: TipoDocumentoNecessidade): string {
    switch (tipo) {
      case 'VENDA_FUTURA':
        return 'badge-info';
      case 'SIMPLES_FATURAMENTO':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  /** Pedido e contrato tem tela no portal; a nota de simples faturamento so copia o numero. */
  link(documento: DocumentoNecessidade): string | null {
    switch (documento.tipo) {
      case 'PEDIDO':
        return '/venda/pedidos-venda';
      case 'VENDA_FUTURA':
        return '/venda/venda-futura';
      default:
        return null;
    }
  }

  total(campo: 'quantidade' | 'entregue' | 'emPedido' | 'saldo'): number {
    return this.documentos.reduce((soma, it) => soma + Number(it[campo] || 0), 0);
  }

  data(valor: string | null): string {
    if (!valor) return '-';
    const [ano, mes, dia] = valor.substring(0, 10).split('-');
    return dia && mes && ano ? `${dia}/${mes}/${ano}` : valor;
  }

  numero(valor: number): string {
    return Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  trackBy(_: number, it: DocumentoNecessidade): string {
    return `${it.tipo}-${it.docEntry}-${it.deposito ?? ''}`;
  }
}
