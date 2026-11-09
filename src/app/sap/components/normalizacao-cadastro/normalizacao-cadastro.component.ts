import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AlertService } from '../../../shared/service/alert.service';
import { CadastroParaNormalizar, NormalizacaoCadastroService } from '../../../modulos/sap-shared/_services/normalizacao-cadastro.service';

/**
 * Rotina administrativa: passa para maiusculo o nome de produto, localidade e cliente.
 *
 * A previa e obrigatoria antes de aplicar - o botao de aplicar so libera depois de a pessoa ver
 * o que vai mudar. Sao milhares de cadastros escritos no SAP e nao existe desfazer.
 */
@Component({
    selector: 'app-normalizacao-cadastro',
    templateUrl: './normalizacao-cadastro.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class NormalizacaoCadastroComponent {

  carregando = false
  aplicando = false
  //null = ainda nao rodou a previa; array vazio = rodou e nao achou nada
  resultado : Array<CadastroParaNormalizar> = null
  aplicado = false

  constructor(private service : NormalizacaoCadastroService, private alert : AlertService){
  }

  previa(){
    this.carregando = true
    this.resultado = null
    this.aplicado = false
    this.service.previa().subscribe({
      next : it => {
        this.resultado = it
        this.carregando = false
      },
      error : e => {
        this.carregando = false
        this.alert.error(e?.error?.message || 'Nao foi possivel gerar a previa')
      }
    })
  }

  aplicar(){
    //confirmacao explicita: escreve em milhares de cadastros do SAP e nao existe desfazer
    this.alert.confirm('Confirma atualizar '+this.resultado.length+' cadastro(s) para maiusculo? Nao existe desfazer.')
      .then(res => { if(res.isConfirmed) this.executaAplicacao() })
  }

  private executaAplicacao(){
    this.aplicando = true
    this.service.aplicar().subscribe({
      next : it => {
        this.resultado = it
        this.aplicado = true
        this.aplicando = false
        const falhas = this.falhas()
        if(falhas > 0)
          this.alert.error(falhas+' cadastro(s) nao puderam ser atualizados - veja a coluna Resultado')
        else
          this.alert.info('Cadastros atualizados: '+this.resultado.length)
      },
      error : e => {
        this.aplicando = false
        this.alert.error(e?.error?.message || 'Nao foi possivel aplicar a normalizacao')
      }
    })
  }

  podeAplicar() : boolean {
    return !this.aplicado && !this.carregando && !this.aplicando
      && this.resultado != null && this.resultado.length > 0
  }

  porTipo(tipo : string) : number {
    return (this.resultado || []).filter(it => it.tipo == tipo).length
  }

  falhas() : number {
    return (this.resultado || []).filter(it => it.aplicado === false).length
  }
}
