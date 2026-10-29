// Linha de fatura de reserva (simples faturamento, OINV isIns = 'Y') no carregamento: vem do
// backend com BaseType 13. Cada retirada vira uma entrega parcial; pedido continua inteiro.
export const FATURA_RESERVA = 13;

export function isFaturaReserva(item: any): boolean {
  return Number(item?.BaseType) === FATURA_RESERVA;
}

// DocNum/DocEntry de pedido e de nota sao sequencias diferentes: o numero sozinho colide.
export function chaveDocumento(item: any): string {
  return `${isFaturaReserva(item) ? 'F' : 'P'}${item?.DocNum}`;
}

export function chaveEntrada(item: any): string {
  return `${isFaturaReserva(item) ? 'F' : 'P'}${item?.DocEntry}`;
}

// O que ja esta selecionado nao volta para os disponiveis: pedido entra inteiro, NF por linha
// (a outra linha da mesma NF continua disponivel).
export function chaveSelecao(item: any): string {
  return isFaturaReserva(item) ? `F${item?.DocEntry}-${item?.BaseLine}` : `P${item?.DocEntry}`;
}

export interface RetiradaFatura {
  docEntry: number;
  lineNum: number;
  quantidade: number;
}
