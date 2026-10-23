import { formatCurrency } from '@angular/common';
import * as moment from 'moment';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';
import { ReplaceFilial } from '../../../utils/replaceFilial';

// DEVOLVIDO so existe no adiantamento: estornado por nota de credito (ODPI nao tem /Cancel).
export type StatusSapNota = 'ABERTO' | 'FECHADO' | 'CANCELADO' | 'DEVOLVIDO';

export const STATUS_SAP_NOTA: { valor: StatusSapNota; rotulo: string }[] = [
  { valor: 'ABERTO', rotulo: 'Aberto' },
  { valor: 'FECHADO', rotulo: 'Fechado' },
  { valor: 'CANCELADO', rotulo: 'Cancelado' },
  { valor: 'DEVOLVIDO', rotulo: 'Devolvido' },
];

// NF = NF-e de saida (DANFE, XML e boleto). AD = adiantamento de venda futura: nao emite NF-e,
// so tem boleto. OINV e ODPI tem DocEntry proprio, entao o documento e tipo + docEntry.
export type TipoDocumentoLote = 'NF' | 'AD';

export const TIPOS_DOCUMENTO_LOTE: { valor: TipoDocumentoLote; rotulo: string }[] = [
  { valor: 'NF', rotulo: 'NF-e' },
  { valor: 'AD', rotulo: 'Adiant. venda futura' },
];

// Separa, dentro das NF, a de venda futura do PADRAO ANTIGO: simples faturamento (CFOP
// 5922/6922), fatura de reserva com as entregas feitas em cima dela. O SAP nao deixa trocar a
// forma de pagamento nela.
export type CategoriaDocumentoLote = 'NF' | 'NF_FUTURA' | 'AD';

export const CATEGORIAS_DOCUMENTO_LOTE: { valor: CategoriaDocumentoLote; rotulo: string; filtro: string; badge: string }[] = [
  { valor: 'NF', rotulo: 'NF-e', filtro: 'NF-e de saída', badge: 'badge-secondary' },
  { valor: 'NF_FUTURA', rotulo: 'NF-e venda futura', filtro: 'NF-e venda futura (padrão antigo)', badge: 'badge-warning' },
  { valor: 'AD', rotulo: 'Adiant. venda futura', filtro: 'Adiantamento venda futura', badge: 'badge-info' },
];

export function categoriaInfo(categoria: CategoriaDocumentoLote | null | undefined, tipo?: TipoDocumentoLote) {
  const valor = categoria ?? (tipo === 'AD' ? 'AD' : 'NF');
  return CATEGORIAS_DOCUMENTO_LOTE.find((c) => c.valor === valor) ?? CATEGORIAS_DOCUMENTO_LOTE[0];
}

export interface FormaPagamentoLote {
  codigo: string;
  descricao: string;
  // Inativa so aparece no filtro da lista (documento antigo); a troca so aceita ativa.
  ativa?: boolean;
}

export type SituacaoTrocaFormaPagamento =
  'ATUALIZADO' | 'VINCULADO_E_ATUALIZADO' | 'SEM_MUDANCA' | 'SEM_CONFIRMACAO' | 'ERRO' | 'NAO_ENCONTRADO' | 'NAO_PERMITIDO';

export interface TrocaFormaPagamentoResultado {
  tipo: TipoDocumentoLote;
  docEntry: number;
  numero: number;
  cardCode: string;
  cardName: string;
  categoria: CategoriaDocumentoLote;
  formaAnterior: string;
  situacao: SituacaoTrocaFormaPagamento;
  mensagem: string;
  boletoAtivo: boolean;
  // Trocou (ou nem precisou), mas algo ficou por fazer ou conferir (vinculo ao parceiro que falhou,
  // boleto nao conferido): nao e sucesso limpo. O detalhe esta na mensagem.
  pendencia: boolean;
}

export const SITUACAO_TROCA_ROTULO: { [s in SituacaoTrocaFormaPagamento]: string } = {
  ATUALIZADO: 'Atualizado',
  VINCULADO_E_ATUALIZADO: 'Forma vinculada ao parceiro e atualizado',
  SEM_MUDANCA: 'Já estava com essa forma',
  // O prazo acabou com a gravacao em andamento: pode ter gravado.
  SEM_CONFIRMACAO: 'Sem confirmação (confira no SAP)',
  ERRO: 'Erro',
  NAO_ENCONTRADO: 'Não encontrado',
  // NF de venda futura do padrao antigo: o SAP recusa trocar a forma, entao o backend nem tenta.
  NAO_PERMITIDO: 'Não permitido',
};

// Importacao da planilha de titulos do banco (POST /nota-fiscal-lote/importar-planilha).
export type SituacaoLinhaImportacao = 'ENCONTRADO' | 'DIVERGENTE' | 'NAO_ENCONTRADO' | 'FORA_DA_TELA';

export const SITUACAO_IMPORTACAO_ROTULO: { [s in SituacaoLinhaImportacao]: string } = {
  ENCONTRADO: 'Encontrado',
  // Entra no lote (o nosso numero manda), mas nro beneficiario ou valor nao batem.
  DIVERGENTE: 'Divergente',
  NAO_ENCONTRADO: 'Não encontrado',
  // A BankPlus conhece o boleto, mas o documento nao aparece nesta tela.
  FORA_DA_TELA: 'Fora da tela',
};

export interface LinhaImportacaoLote {
  linha: number;
  nossoNumero: string;
  beneficiario: string;
  pagador: string;
  valor: number;
  vencimento: string;
  situacaoBanco: string;
  tipo: TipoDocumentoLote;
  docEntry: number;
  parcela: number;
  situacao: SituacaoLinhaImportacao;
  mensagem: string;
}

export interface ImportacaoLoteResultado {
  documentos: NotaFiscalLote[];
  linhas: LinhaImportacaoLote[];
}

export interface StatusSefaz {
  id: number;
  descricao: string;
}

// Documento da tela de lote (NF-e ou adiantamento de venda futura), de GET /nota-fiscal-lote.
export class NotaFiscalLote {
  tipo: TipoDocumentoLote = 'NF';
  // Sem categoria (lote guardado antes dela existir), vale a do tipo.
  categoria: CategoriaDocumentoLote;
  docEntry: number;
  docNum: number;
  numero: number;
  serie: string;
  // Adiantamento: numero do contrato de venda futura.
  contrato: number;
  data: string;
  cardCode: string;
  cardName: string;
  filialId: number;
  filial: string;
  total: number;
  // Primeira e ultima parcela; a ultima e o DocDueDate.
  vencimentoInicial: string;
  vencimentoFinal: string;
  parcelas: number;
  // A parcela desta linha da lista (uma linha por parcela): numero, valor original e vencimento.
  // O lote continua sendo de documentos: linhas do mesmo documento tem a mesma chave.
  parcela: number;
  valorParcela: number;
  vencimentoParcela: string;
  vendedorCodigo: number;
  vendedor: string;
  formaPagamento: string;
  // Nome da forma (Descript da OPYM).
  formaPagamentoNome: string;
  // Boleto da BankPlus desta parcela (o mais recente); nulo = sem boleto.
  nossoNumero: string;
  boletoStatusId: number;
  boletoStatus: string;
  boletoSituacao: string;
  chaveAcesso: string;
  statusSefazId: number;
  statusSefaz: string;
  statusSap: StatusSapNota;

  selecionado = false;

  // `chave` e getter aqui: um campo `chave` vindo no JSON (o backend ja nao manda) faria o
  // Object.assign lancar TypeError e a lista sumir em silencio.
  static from(json: any): NotaFiscalLote {
    const { chave, ...dados } = json ?? {};
    return Object.assign(new NotaFiscalLote(), dados);
  }

  // So os dados da nota, para guardar o lote no sessionStorage. Nao serializar a nota inteira: o
  // app-table pendura FormControl na linha (formControlFactory*), que tem referencia circular.
  static paraArmazenar(nota: NotaFiscalLote): object {
    const { tipo, categoria, docEntry, docNum, numero, serie, contrato, data, cardCode, cardName, filialId, filial, total,
      vencimentoInicial, vencimentoFinal, parcelas, formaPagamento, formaPagamentoNome, statusSefazId, statusSefaz, statusSap } = nota;
    return { tipo, categoria, docEntry, docNum, numero, serie, contrato, data, cardCode, cardName, filialId, filial, total,
      vencimentoInicial, vencimentoFinal, parcelas, formaPagamento, formaPagamentoNome, statusSefazId, statusSefaz, statusSap };
  }

  // Identifica o documento no lote: o mesmo docEntry pode existir como NF e como adiantamento.
  get chave(): string {
    return `${this.tipo}-${this.docEntry}`;
  }

  get tipoLabel(): string {
    return categoriaInfo(this.categoria, this.tipo).rotulo;
  }

  get tipoBadge(): string {
    return categoriaInfo(this.categoria, this.tipo).badge;
  }

  // Para a coluna da app-table (que renderiza o valor como HTML): so texto fixo daqui, nada do SAP.
  get tipoHtml(): string {
    return `<span class="badge ${this.tipoBadge}">${this.tipoLabel}</span>`;
  }

  get contratoFormatado(): string {
    return this.contrato != null ? `VF ${this.contrato}` : '';
  }

  getActions(): Action[] {
    return [
      new Action(
        this.selecionado ? 'Selecionada' : 'Selecionar',
        new ActionReturn('nota-lote-toggle-selecao', this),
        this.selecionado ? 'fas fa-check-square' : 'far fa-square',
        this.selecionado ? 'success' : 'secondary'
      ),
    ];
  }

  get notaFormatada(): string {
    if (this.numero == null) {
      return `Doc. ${this.docNum ?? this.docEntry}`;
    }
    return this.serie ? `${this.numero} / ${this.serie}` : `${this.numero}`;
  }

  get dataFormatada(): string {
    return this.data ? moment(this.data, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
  }

  // Linha de parcela: o vencimento dela. Sem parcela (lote guardado), parcela unica: a data;
  // varias: primeira a ultima, para nao esconder parcela antes do DocDueDate.
  get vencimentoFormatado(): string {
    if (this.vencimentoParcela) {
      return this.formatar(this.vencimentoParcela);
    }
    const final = this.formatar(this.vencimentoFinal);
    if (!(this.parcelas > 1) || !this.vencimentoInicial || this.vencimentoInicial === this.vencimentoFinal) {
      return final;
    }
    return `${this.formatar(this.vencimentoInicial)} a ${final} (${this.parcelas} parc.)`;
  }

  private formatar(data: string): string {
    return data ? moment(data, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
  }

  get filialFormatada(): string {
    return ReplaceFilial.limparFilial(this.filial) || (this.filialId != null ? `Filial ${this.filialId}` : '');
  }

  get statusSapLabel(): string {
    return STATUS_SAP_NOTA.find((s) => s.valor === this.statusSap)?.rotulo ?? '';
  }

  get statusSefazLabel(): string {
    if (this.tipo === 'AD') {
      return 'Sem NF-e';
    }
    return this.statusSefaz || (this.statusSefazId != null ? `Status ${this.statusSefazId}` : '');
  }

  get totalCurrency(): string {
    return formatCurrency(this.total ?? 0, 'pt', 'R$');
  }

  // "Confirmado · Normal" (status e situacao na BankPlus); sem boleto, vazio.
  get boletoFormatado(): string {
    if (this.boletoStatusId == null && !this.boletoStatus) {
      return '';
    }
    const status = this.boletoStatus || `Status ${this.boletoStatusId}`;
    return this.boletoSituacao ? `${status} · ${this.boletoSituacao}` : status;
  }

  // "Nome (codigo)"; sem nome (forma fora da OPYM ou lote guardado antes), so o codigo.
  get formaPagamentoFormatada(): string {
    if (!this.formaPagamento) {
      return '';
    }
    return this.formaPagamentoNome ? `${this.formaPagamentoNome} (${this.formaPagamento})` : this.formaPagamento;
  }

  get parcelaFormatada(): string {
    return this.parcela != null ? `${this.parcela}/${this.parcelas || this.parcela}` : '';
  }

  // Sem parcela na linha, o total do documento.
  get valorParcelaCurrency(): string {
    return formatCurrency(Number(this.valorParcela ?? this.total ?? 0), 'pt', 'R$');
  }
}
