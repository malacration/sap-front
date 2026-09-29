import { Component, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../shared/service/alert.service';
import {
  PreviaSanitizacao, ReclassificacaoSanitizacao, ResultadoSanitizacao, SanitizacaoContratoService
} from '../../service/sanitizacao-contrato.service';

@Component({
  selector: 'app-sanitizacao-contrato',
  templateUrl: './sanitizacao-contrato.component.html',
})
export class SanitizacaoContratoComponent implements OnDestroy {
  previa: PreviaSanitizacao = null;
  carregando = false;
  aplicando = false;
  confirmando = false;
  processados = 0;
  totalProcessar = 0;
  filtro = '';
  erro = '';
  exigeNovaPrevia = false;
  private destruido = false;
  selecionados = new Set<number>();
  resultados: Record<number, ResultadoSanitizacao> = {};

  constructor(private service: SanitizacaoContratoService, private alert: AlertService) {}
  ngOnDestroy(): void { this.destruido = true; }

  get ocupado(): boolean { return this.carregando || this.aplicando || this.confirmando; }
  get itensVisiveis(): ReclassificacaoSanitizacao[] {
    const filtro = this.filtro.trim().toLocaleLowerCase();
    return (this.previa?.itens || []).filter(it =>
      `${it.contrato} ${it.transId} ${it.cliente} ${it.nomeCliente} ${it.nota.docNum} ${it.nota.docEntry}`.toLocaleLowerCase().includes(filtro));
  }
  get elegiveis(): number { return this.previa?.itens.filter(it => it.podeAplicar).length || 0; }

  async verificar(): Promise<void> {
    if (this.ocupado) return;
    this.carregando = true;
    this.erro = '';
    this.previa = null;
    this.selecionados.clear();
    this.resultados = {};
    this.processados = 0;
    this.totalProcessar = 0;
    this.exigeNovaPrevia = false;
    try { this.previa = await firstValueFrom(this.service.previa()); }
    catch (e) { this.erro = this.mensagemErro(e, 'Não foi possível gerar a prévia.'); }
    finally { this.carregando = false; }
  }

  selecionar(item: ReclassificacaoSanitizacao, marcado: boolean): void {
    if (this.ocupado || this.exigeNovaPrevia || !item.podeAplicar || this.resultados[item.transId]) return;
    if (marcado) this.selecionados.add(item.transId);
    else this.selecionados.delete(item.transId);
  }

  selecionarVisiveis(): void {
    this.itensVisiveis.forEach(it => this.selecionar(it, true));
  }

  async aplicar(): Promise<void> {
    if (this.ocupado || this.exigeNovaPrevia || !this.previa || !this.selecionados.size) return;
    const previa = this.previa;
    const itens = previa.itens.filter(it => this.selecionados.has(it.transId) && it.podeAplicar && !this.resultados[it.transId]);
    if (!itens.length) return;
    const apropriacoes = itens.reduce((n, it) => n + it.apropriacoes.filter(a => !a.cancelada).length, 0);
    this.confirmando = true;
    try {
      const resposta = await this.alert.confirm(
        `Confirma estornar ${itens.length} reclassificação(ões), cancelar suas reconciliações manuais e ` +
        `${apropriacoes} nota(s) de apropriação? O SAP lança o estorno e os cancelamentos na data dos ` +
        `documentos originais. Confira os documentos afetados nos detalhes da prévia.`);
      if (!resposta.isConfirmed || this.destruido) return;
      this.aplicando = true;
      this.erro = '';
      this.processados = 0;
      this.totalProcessar = itens.length;
      for (const item of itens) {
        if (this.destruido) break;
        try {
          const resultado = await firstValueFrom(this.service.aplicar(previa.id, item.transId));
          this.resultados[item.transId] = resultado;
          this.selecionados.delete(item.transId);
          this.processados++;
          // Uma falha pode afetar vínculos compartilhados com os próximos itens.
          if (resultado.status !== 'APLICADO') {
            this.erro = 'Processamento interrompido. Confira o resultado e gere uma nova prévia antes de continuar.';
            this.selecionados.clear();
            this.exigeNovaPrevia = true;
            break;
          }
        } catch (e) {
          this.resultados[item.transId] = { transId: item.transId, status: 'CONFERIR', cancelamentos: [],
            mensagem: this.mensagemErro(e, 'Resposta não recebida. Confira no SAP antes de repetir.') };
          this.erro = 'Processamento interrompido. A requisição pode ter sido recebida pelo SAP; gere nova prévia após conferir.';
          this.selecionados.clear();
          this.exigeNovaPrevia = true;
          break;
        }
      }
    } finally {
      this.aplicando = false;
      this.confirmando = false;
    }
  }

  private mensagemErro(e: any, fallback: string): string {
    return e?.error?.mensagem || e?.error?.message || fallback;
  }
}
