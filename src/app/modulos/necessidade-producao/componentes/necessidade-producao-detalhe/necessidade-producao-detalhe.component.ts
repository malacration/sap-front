import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import {
  DetalheNecessidade,
  NecessidadeProducaoDetalhe,
  NecessidadeProducaoDetalheFiltro,
} from '../../modelos/necessidade-producao.model';
import { NecessidadeProducaoService } from '../../service/necessidade-producao.service';

export const ROTA_DETALHE = '/producao/necessidade-producao/detalhe';

/** Query string da tela de detalhe: tudo que identifica a celula, para a aba nova abrir sozinha. */
export function queryParamsDetalhe(filtro: NecessidadeProducaoDetalheFiltro, itemName?: string): Record<string, any> {
  return {
    itemCode: filtro.itemCode,
    detalhe: filtro.detalhe,
    filiais: filtro.filiais,
    nome: itemName || undefined,
  };
}

export function filtroDetalhe(params: ParamMap): NecessidadeProducaoDetalheFiltro | null {
  const itemCode = params.get('itemCode');
  const detalhe = params.get('detalhe');
  if (!itemCode || (detalhe != 'PEDIDO' && detalhe != 'SEM_PREVISAO')) return null;
  return {
    itemCode,
    detalhe: detalhe as DetalheNecessidade,
    filiais: params.getAll('filiais').map((it) => Number(it)).filter((it) => !isNaN(it)),
  };
}

export function tituloDetalhe(detalhe: DetalheNecessidade): string {
  return detalhe == 'PEDIDO' ? 'Pedidos em aberto' : 'Vendido sem previsão';
}

/** Documentos de uma celula da necessidade de producao em tela cheia, aberta em nova aba. */
@Component({
  selector: 'app-necessidade-producao-detalhe',
  templateUrl: './necessidade-producao-detalhe.component.html',
})
export class NecessidadeProducaoDetalheComponent implements OnInit {
  filtro: NecessidadeProducaoDetalheFiltro | null = null;
  nome: string | null = null;
  detalhe: NecessidadeProducaoDetalhe | null = null;
  carregando = false;
  erro: string | null = null;

  constructor(private route: ActivatedRoute, private service: NecessidadeProducaoService) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.filtro = filtroDetalhe(params);
      this.nome = params.get('nome');
      this.carregar();
    });
  }

  get titulo(): string {
    return this.filtro ? tituloDetalhe(this.filtro.detalhe) : 'Detalhe';
  }

  carregar(): void {
    this.detalhe = null;
    if (!this.filtro) {
      this.erro = 'Link incompleto: falta o produto ou a coluna do relatório.';
      return;
    }
    this.carregando = true;
    this.erro = null;
    this.service.getDetalhe(this.filtro).subscribe({
      next: (detalhe) => {
        this.detalhe = detalhe;
        this.carregando = false;
      },
      error: (e) => {
        this.carregando = false;
        this.erro = e?.error?.mensagem || e?.error?.message || 'Não foi possível carregar os documentos.';
      },
    });
  }
}
