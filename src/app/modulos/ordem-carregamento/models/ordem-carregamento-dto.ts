import { OrdemCarregamento } from "./ordem-carregamento";

export class OrdemCarregamentoDto {
  ordemCarregamento : OrdemCarregamento;
  pedidos : Array<number>
  pedidosRemover : Array<number> = []

  constructor(ordem : OrdemCarregamento, pedidos : Array<number>, pedidosRemover : Array<number> = []){
    this.ordemCarregamento = ordem
    this.pedidos = pedidos
    this.pedidosRemover = pedidosRemover
  }
}