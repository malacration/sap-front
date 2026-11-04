import { formatDate } from '@angular/common';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';
import { RouteLink } from '../../../sap/model/route-link';

export class OrdemCarregamento {
  DocEntry: number;
  U_nameOrdem: string;
  U_Status: string;
  U_filial3: string;
  CreateDate: string;
  Weight1: string;
  quantidadePedidos: number;
  U_pesoTotal: string;
  Ord_CRG_LINHACollection: any[] = [];
  U_placa: string 
  U_motorista: string 
  U_capacidadeCaminhao: number 
  U_transportadora: string 
  pedidosVenda: any[] = [];
  pedidosVendaCarregados = false;

  get dataCriacao(): string {
    if (!this.CreateDate) return '';
    return formatDate(this.CreateDate, 'dd/MM/yyyy', 'pt-BR', 'UTC');
  }

  get pesoTotalFormatted(): string {
    const peso = parseFloat(this.Weight1) || 0;
    return peso.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  get statusBadge(): string {
    const cor = { Aberto: 'primary', Fechado: 'success', Cancelado: 'secondary', Falhou: 'danger' }[this.U_Status] ?? 'light';
    return `<span class="badge badge-${cor}">${escaparHtml(this.U_Status ?? '')}</span>`;
  }

  routerLinkOrdem(): RouteLink {
    return new RouteLink(
      this.DocEntry?.toString(),
      '/logistica/ordem-carregamento',
      { id: this.DocEntry }
    );
  }

  getActions(): Action[] {
    return [
      new Action('', new ActionReturn('selected', this), 'far fa-eye')
    ];
  }
}

// Texto da API que vai para uma coluna com html ({{{value}}}): a tabela confia no HTML.
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
