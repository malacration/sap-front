import { OrdemCarregamento } from "./ordem-carregamento";

export class OrdemCarregamentoDto {
  ordemCarregamento : OrdemCarregamento;
  pedidos : Array<number>

  constructor(ordem : OrdemCarregamento, pedidos : Array<number>){
    this.ordemCarregamento = ordem
    this.pedidos = pedidos
  }
}