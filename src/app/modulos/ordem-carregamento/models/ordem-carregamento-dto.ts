import { OrdemCarregamento } from "./ordem-carregamento";
import { RetiradaFatura } from "./fatura-reserva";

export class OrdemCarregamentoDto {
  ordemCarregamento : OrdemCarregamento;
  pedidos : Array<number>
  pedidosRemover : Array<number> = []
  faturasReserva : Array<RetiradaFatura> = []

  constructor(ordem : OrdemCarregamento, pedidos : Array<number>, pedidosRemover : Array<number> = [], faturasReserva : Array<RetiradaFatura> = []){
    this.ordemCarregamento = ordem
    this.pedidos = pedidos
    this.pedidosRemover = pedidosRemover
    this.faturasReserva = faturasReserva
  }
}