import { formatDate } from '@angular/common';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';

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
    const peso = parseFloat(this.U_pesoTotal) || 0;
    return peso.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getActions(): Action[] {
    return [
      new Action('', new ActionReturn('selected', this), 'far fa-eye')
    ];
  }
}
