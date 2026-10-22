import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '../../../../shared/service/alert.service';
import { Option, OptionGroup } from '../../../../sap/model/form/option';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import {
  DepositoNecessidade,
  DetalheNecessidade,
  GrupoLinhaProduto,
  NecessidadeProducao,
  NecessidadeProducaoDetalhe,
  NecessidadeProducaoDetalheFiltro,
  NecessidadeProducaoLinha,
} from '../../modelos/necessidade-producao.model';
import { NecessidadeProducaoService } from '../../service/necessidade-producao.service';
import { queryParamsDetalhe, ROTA_DETALHE, tituloDetalhe } from '../necessidade-producao-detalhe/necessidade-producao-detalhe.component';

/**
 * Necessidade de producao: o que tem em estoque, o que ja foi pedido e o que esta vendido sem
 * previsao, por produto. Substitui a aba DADOS da planilha PEDIDOS COMERCIAL.
 *
 * A faixa de produtos define os depositos possiveis, e deles saem as filiais. Depois os dois filtros
 * sao independentes: depositos somam o Estoque, filiais somam a venda (Pedido e Sem previsao). Assim
 * da para ver a venda de uma filial contra o estoque da fabrica mais o da filial. Nada marcado = todos.
 */
@Component({
  selector: 'app-necessidade-producao',
  templateUrl: './necessidade-producao.component.html',
  styleUrls: ['./necessidade-producao.component.scss'],
})
export class NecessidadeProducaoComponent implements OnInit {
  itemDe = 'PAC0000000';
  itemAte = 'PAC9999999';
  ocultarSemMovimento = true;

  depositos: DepositoNecessidade[] = [];
  // Texto, como o Option.value do app-select: numero aqui faria a caixa marcada aparecer desmarcada.
  filiaisSelecionadas: string[] = [];
  depositosSelecionados: string[] = [];

  // Campos, nao getters: o app-select recolhe os grupos a cada atribuicao de [grupos], e um getter
  // devolveria um array novo a cada ciclo de deteccao.
  opcoesFiliais: Option[] = [];
  gruposDepositos: OptionGroup[] = [];

  resultado: NecessidadeProducao | null = null;
  carregandoDepositos = false;
  carregando = false;
  erro: string | null = null;

  @ViewChild('modalDetalhe') modalDetalhe?: ModalComponent;
  /** Celula aberta no modal. */
  celula: { linha: NecessidadeProducaoLinha; filtro: NecessidadeProducaoDetalheFiltro } | null = null;
  detalhe: NecessidadeProducaoDetalhe | null = null;
  carregandoDetalhe = false;
  erroDetalhe: string | null = null;

  constructor(
    private service: NecessidadeProducaoService,
    private alert: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarDepositos();
  }

  /** Nova faixa de produtos: refaz os depositos possiveis e limpa o que nao existe mais. */
  carregarDepositos(): void {
    if (!this.faixaValida()) return;
    this.carregandoDepositos = true;
    this.erro = null;
    this.service.getDepositos(this.itemDe, this.itemAte).subscribe({
      next: (depositos) => {
        this.depositos = depositos ?? [];
        this.montarOpcoes();
        this.carregandoDepositos = false;
      },
      error: (e) => {
        this.carregandoDepositos = false;
        this.erro = this.mensagem(e, 'Não foi possível carregar os depósitos.');
      },
    });
  }

  aoSelecionarFiliais(valores: string[]): void {
    this.filiaisSelecionadas = valores ?? [];
  }

  aoSelecionarDepositos(valores: string[]): void {
    this.depositosSelecionados = valores ?? [];
  }

  gerar(): void {
    if (!this.faixaValida()) return;
    this.carregando = true;
    this.erro = null;
    this.service
      .get({
        itemDe: this.itemDe,
        itemAte: this.itemAte,
        filiais: this.filiaisSelecionadas.map((it) => Number(it)),
        depositos: this.depositosSelecionados,
      })
      .subscribe({
        next: (resultado) => {
          this.resultado = resultado;
          this.carregando = false;
        },
        error: (e) => {
          this.carregando = false;
          this.erro = this.mensagem(e, 'Não foi possível gerar o relatório.');
        },
      });
  }

  /**
   * Clique na celula Pedido ou Sem previsao: lista os documentos no modal. As filiais sao as que o
   * backend somou no relatorio, nao o que esta marcado agora nos filtros.
   */
  abrirDetalhe(linha: NecessidadeProducaoLinha, detalhe: DetalheNecessidade): void {
    if (!this.resultado) return;
    const filtro: NecessidadeProducaoDetalheFiltro = {
      itemCode: linha.itemCode,
      detalhe,
      filiais: this.resultado.filiais,
    };
    this.celula = { linha, filtro };
    this.detalhe = null;
    this.erroDetalhe = null;
    this.carregandoDetalhe = true;
    this.modalDetalhe?.openModal();
    this.service.getDetalhe(filtro).subscribe({
      next: (resposta) => {
        // Clique em outra celula antes de esta responder: descarta.
        if (this.celula?.filtro !== filtro) return;
        this.detalhe = resposta;
        this.carregandoDetalhe = false;
      },
      error: (e) => {
        if (this.celula?.filtro !== filtro) return;
        this.carregandoDetalhe = false;
        this.erroDetalhe = this.mensagem(e, 'Não foi possível carregar os documentos.');
      },
    });
  }

  abrirDetalheNovaAba(): void {
    if (!this.celula) return;
    const tree = this.router.createUrlTree([ROTA_DETALHE], {
      queryParams: queryParamsDetalhe(this.celula.filtro, this.celula.linha.itemName),
    });
    window.open(this.router.serializeUrl(tree), '_blank', 'noopener');
  }

  get tituloModal(): string {
    return this.celula ? `${tituloDetalhe(this.celula.filtro.detalhe)} · ${this.celula.linha.itemName}` : 'Documentos';
  }

  /** Menor "a fabricar" primeiro: o produto que mais falta para atender o que ja foi pedido. */
  get linhas(): NecessidadeProducaoLinha[] {
    const linhas = this.resultado?.linhas ?? [];
    const visiveis = this.ocultarSemMovimento
      ? linhas.filter((it) => it.estoque != 0 || it.pedido != 0 || it.semPrevisao != 0)
      : linhas;
    return [...visiveis].sort((a, b) => a.aFabricar - b.aFabricar || a.itemCode.localeCompare(b.itemCode));
  }

  /**
   * Produtos agrupados pela linha (U_linha_sustennutri), na ordem dos valores validos do SAP; sem
   * linha vai por ultimo. Dentro do grupo segue o menor a fabricar primeiro.
   */
  get grupos(): GrupoLinhaProduto[] {
    const porLinha = new Map<string, { nome: string; ordem: number; linhas: NecessidadeProducaoLinha[] }>();
    this.linhas.forEach((it) => {
      const chave = it.linha ?? '';
      const grupo = porLinha.get(chave) ?? {
        nome: it.linhaNome || (it.linha ? it.linha.toUpperCase() : 'Sem linha'),
        ordem: it.linha ? it.linhaOrdem ?? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER,
        linhas: [],
      };
      grupo.linhas.push(it);
      porLinha.set(chave, grupo);
    });
    return [...porLinha.entries()]
      .sort(([, a], [, b]) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
      .map(([chave, grupo]) => ({
        chave,
        nome: grupo.nome,
        linhas: grupo.linhas,
        estoque: this.somar(grupo.linhas, 'estoque'),
        pedido: this.somar(grupo.linhas, 'pedido'),
        aFabricar: this.somar(grupo.linhas, 'aFabricar'),
        semPrevisao: this.somar(grupo.linhas, 'semPrevisao'),
      }));
  }

  total(campo: 'estoque' | 'pedido' | 'aFabricar' | 'semPrevisao'): number {
    return this.somar(this.linhas, campo);
  }

  trackByGrupo(_: number, grupo: GrupoLinhaProduto): string {
    return grupo.chave;
  }

  private somar(linhas: NecessidadeProducaoLinha[], campo: 'estoque' | 'pedido' | 'aFabricar' | 'semPrevisao'): number {
    return linhas.reduce((soma, it) => soma + Number(it[campo] || 0), 0);
  }

  descricaoSemPrevisao(linha: NecessidadeProducaoLinha): string {
    return (
      `Contrato de venda futura: ${this.numero(linha.contratoVendaFutura)}\n` +
      `Simples faturamento: ${this.numero(linha.simplesFaturamento)}`
    );
  }

  get resumoDepositos(): string {
    const usados = this.resultado?.depositos ?? [];
    return usados.length == this.depositos.length ? 'todos' : usados.join(', ');
  }

  get resumoFiliais(): string {
    const usadas = this.resultado?.filiais ?? [];
    return usadas.length == this.opcoesFiliais.length
      ? 'todas'
      : usadas.map((filial) => this.opcoesFiliais.find((it) => it.value == String(filial))?.description ?? filial).join(', ');
  }

  numero(valor: number): string {
    return Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  /**
   * Filiais e depositos vem da mesma lista, mas nao se limitam: marcar uma filial nao esconde
   * deposito nenhum. Uma nova faixa so tira o que deixou de existir.
   */
  private montarOpcoes(): void {
    const porFilial = new Map<number, DepositoNecessidade[]>();
    this.depositos.forEach((it) => porFilial.set(it.filial, [...(porFilial.get(it.filial) ?? []), it]));

    // Filial 0 e deposito sem filial: nao tem venda para somar.
    this.opcoesFiliais = [...porFilial.entries()]
      .filter(([filial]) => filial != 0)
      .map(([filial, depositos]) => new Option(String(filial), this.nomeFilial(filial, depositos[0]?.filialNome)));
    const filiais = new Set(this.opcoesFiliais.map((it) => it.value));
    this.filiaisSelecionadas = this.filiaisSelecionadas.filter((it) => filiais.has(it));

    this.gruposDepositos = [...porFilial.keys()].map(
      (filial) =>
        new OptionGroup(
          this.nomeFilial(filial, porFilial.get(filial)[0]?.filialNome),
          porFilial.get(filial).map(
            (it) => new Option(it.whsCode, `${it.whsCode} - ${it.whsName}` + (it.estoque ? ` (${this.numero(it.estoque)})` : ''))
          )
        )
    );

    const disponiveis = new Set(this.gruposDepositos.flatMap((grupo) => grupo.options.map((it) => it.value)));
    this.depositosSelecionados = this.depositosSelecionados.filter((it) => disponiveis.has(it));
  }

  private nomeFilial(filial: number, nome: string | null | undefined): string {
    return filial ? `${filial} - ${nome ?? ''}` : 'Sem filial';
  }

  private faixaValida(): boolean {
    this.itemDe = (this.itemDe ?? '').trim().toUpperCase();
    this.itemAte = (this.itemAte ?? '').trim().toUpperCase();
    if (!this.itemDe || !this.itemAte) {
      this.alert.info('Informe o produto inicial e o final da faixa.');
      return false;
    }
    return true;
  }

  private mensagem(e: any, padrao: string): string {
    return e?.error?.mensagem || e?.error?.message || padrao;
  }
}
