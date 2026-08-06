import { formatCurrency } from '@angular/common';
import { ReplaceFilial } from '../../../utils/replaceFilial';

// Duas unidades de contagem convivem aqui, e a diferença é de propósito:
//  - PARCELA na carteira/aging/SLA, porque o total soma as quatro faixas e uma nota com
//    parcelas em faixas diferentes seria contada mais de uma vez se a chave fosse a nota.
//    É também a unidade que o time usa (as linhas da planilha eram parcelas).
//  - DOCUMENTO no recuperado, que não é quebrado em faixas — ali "quantas notas voltaram"
//    é o que o gestor pergunta.
export class CobrancaFaixa {
  Faixa: string;
  Saldo: number;
  Parcelas: number;
  // As bordas vêm do backend (enum FaixaAtraso) em vez de serem redefinidas aqui: é o que
  // garante que a janela de vencimento do drill-down é a MESMA que gerou o número.
  DiasMin: number;
  DiasMax: number | null;

  get saldoCurrency(): string {
    return formatCurrency(this.Saldo ?? 0, 'pt', 'R$') ?? '';
  }
}

export class CobrancaPorFilial {
  BPLId: number;
  BPLName: string;
  Saldo: number;
  Parcelas: number;

  get filialFormatada(): string {
    const nome = ReplaceFilial.limparFilial(this.BPLName);
    if (nome) {
      return nome;
    }
    return this.BPLId != null ? `Filial ${this.BPLId}` : 'Sem filial';
  }

  get saldoCurrency(): string {
    return formatCurrency(this.Saldo ?? 0, 'pt', 'R$') ?? '';
  }
}

export class CobrancaPorStatus {
  Status: string;
  Saldo: number;
  Parcelas: number;

  get saldoCurrency(): string {
    return formatCurrency(this.Saldo ?? 0, 'pt', 'R$') ?? '';
  }
}

export class CobrancaPorCobrador {
  Cobrador: string;
  Recuperado: number;
  Documentos: number;
  TitulosTrabalhados: number;
  ParcelasComPromessaVencida: number;

  get recuperadoCurrency(): string {
    return formatCurrency(this.Recuperado ?? 0, 'pt', 'R$') ?? '';
  }
}

export class CobrancaMes {
  Mes: string;
  Rotulo: string;
  Recuperado: number;
  Documentos: number;

  get recuperadoCurrency(): string {
    return formatCurrency(this.Recuperado ?? 0, 'pt', 'R$') ?? '';
  }
}

export class CobrancaDashboard {
  De: string;
  Ate: string;
  DeAnterior: string;
  AteAnterior: string;
  CarteiraSaldo = 0;
  CarteiraParcelas = 0;
  Recuperado = 0;
  RecuperadoAnterior = 0;
  RecuperadoDocumentos = 0;
  SemAcaoSaldo = 0;
  SemAcaoParcelas = 0;
  PromessaVencidaSaldo = 0;
  PromessaVencidaParcelas = 0;
  Faixas: CobrancaFaixa[] = [];
  PorFilial: CobrancaPorFilial[] = [];
  PorStatus: CobrancaPorStatus[] = [];
  PorCobrador: CobrancaPorCobrador[] = [];

  // O backend serializa com NON_EMPTY, então lista vazia simplesmente não vem no JSON -
  // por isso cada coleção tem fallback em vez de confiar no Object.assign.
  static from(json: any): CobrancaDashboard {
    const dashboard = Object.assign(new CobrancaDashboard(), json ?? {});
    dashboard.Faixas = (json?.Faixas ?? []).map((it: any) => Object.assign(new CobrancaFaixa(), it));
    dashboard.PorFilial = (json?.PorFilial ?? []).map((it: any) => Object.assign(new CobrancaPorFilial(), it));
    dashboard.PorStatus = (json?.PorStatus ?? []).map((it: any) => Object.assign(new CobrancaPorStatus(), it));
    dashboard.PorCobrador = (json?.PorCobrador ?? []).map((it: any) => Object.assign(new CobrancaPorCobrador(), it));
    return dashboard;
  }

  get carteiraCurrency(): string {
    return formatCurrency(this.CarteiraSaldo ?? 0, 'pt', 'R$') ?? '';
  }

  get recuperadoCurrency(): string {
    return formatCurrency(this.Recuperado ?? 0, 'pt', 'R$') ?? '';
  }

  get semAcaoCurrency(): string {
    return formatCurrency(this.SemAcaoSaldo ?? 0, 'pt', 'R$') ?? '';
  }

  get promessaVencidaCurrency(): string {
    return formatCurrency(this.PromessaVencidaSaldo ?? 0, 'pt', 'R$') ?? '';
  }

  // Delta só existe para Recuperado, que é a única grandeza de período. Carteira, "sem ação" e
  // promessas são foto de hoje — dar a elas um "vs mês anterior" exigiria reconstruir o estado
  // passado da carteira, então essas usam percentualDaCarteira, que compara dois números que
  // já existem em vez de inventar história.
  //
  // Retorna null (não 0, não Infinity) quando não há base de comparação: período anterior
  // zerado faz a variação percentual não existir, e "↑ ∞%" é pior que não mostrar nada.
  get variacaoRecuperado(): number | null {
    const anterior = this.RecuperadoAnterior ?? 0;
    if (anterior === 0) {
      return null;
    }
    return (((this.Recuperado ?? 0) - anterior) / anterior) * 100;
  }

  get variacaoRecuperadoLabel(): string {
    const variacao = this.variacaoRecuperado;
    if (variacao === null) {
      return this.RecuperadoAnterior === 0 && (this.Recuperado ?? 0) > 0
        ? 'sem recuperação no período anterior'
        : '';
    }
    const sinal = variacao >= 0 ? '↑' : '↓';
    return `${sinal} ${Math.abs(variacao).toFixed(0)}%`;
  }

  get recuperadoSubiu(): boolean {
    return (this.variacaoRecuperado ?? 0) >= 0;
  }

  get anteriorCurrency(): string {
    return formatCurrency(this.RecuperadoAnterior ?? 0, 'pt', 'R$') ?? '';
  }

  get semAcaoPercentual(): string {
    return this.percentualDaCarteira(this.SemAcaoSaldo);
  }

  get promessaVencidaPercentual(): string {
    return this.percentualDaCarteira(this.PromessaVencidaSaldo);
  }

  private percentualDaCarteira(valor: number): string {
    const carteira = this.CarteiraSaldo ?? 0;
    if (carteira === 0) {
      return '';
    }
    return `${(((valor ?? 0) / carteira) * 100).toFixed(0)}% da carteira`;
  }
}
