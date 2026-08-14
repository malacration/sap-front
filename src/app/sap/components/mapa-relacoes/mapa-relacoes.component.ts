import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MapaRelacoesService } from '../../../modulos/sap-shared/_services/mapa-relacoes.service';
import { AlertService } from '../../../shared/service/alert.service';
import { idDocumentoBuscado, mockMapaRelacoesResponse, MapaRelacoesResponse, TIPOS_BUSCA } from '../../model/mapa-relacoes';

@Component({
  selector: 'app-mapa-relacoes',
  templateUrl: './mapa-relacoes.component.html',
})
export class MapaRelacoesComponent implements OnInit, OnChanges {

  @Input() tipoInicial : string = null
  @Input() docEntryInicial : number = null
  @Input() mostrarFormulario = true
  @Input() mostrarControleZoom = true

  loading = false
  tiposBusca = TIPOS_BUSCA
  tipo : string = 'nota-fiscal'
  docEntry : number = null

  resultado : MapaRelacoesResponse = null
  //documento que o usuario efetivamente buscou (destacado em azul no grafo, ver
  //mapa-relacoes-grafo.component) - nao e necessariamente a raiz da arvore
  buscadoId : string = null
  private inicializado = false

  constructor(private service : MapaRelacoesService,
              private alert : AlertService,
              private route : ActivatedRoute){
  }

  ngOnInit(): void {
    this.inicializado = true
    if(this.tipoInicial && this.docEntryInicial){
      this.buscarPorInputs()
      return
    }

    this.route.queryParamMap.subscribe(params => {
      const tipo = params.get('tipo')
      const docEntry = params.get('docEntry')
      if(tipo && docEntry){
        this.tipo = tipo
        this.docEntry = Number(docEntry)
        this.buscar()
      }
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(!this.inicializado)
      return
    if((changes['tipoInicial'] || changes['docEntryInicial']) && this.tipoInicial && this.docEntryInicial)
      this.buscarPorInputs()
  }

  private buscarPorInputs(){
    this.tipo = this.tipoInicial
    this.docEntry = Number(this.docEntryInicial)
    this.buscar()
  }

  buscar(){
    if(!this.tipo || !this.docEntry){
      this.alert.info('Selecione o tipo e informe o número do documento')
      return
    }
    //docEntry -1 em qualquer tipo abre um grafo mock (sem chamar o back), pra testar a
    //tela com pelo menos um exemplo de cada tipo de documento
    if(this.docEntry === -1){
      this.resultado = mockMapaRelacoesResponse()
      this.buscadoId = null
      return
    }
    this.loading = true
    this.resultado = null
    this.buscadoId = idDocumentoBuscado(this.tipo, this.docEntry)
    this.service.buscar(this.tipo, this.docEntry).subscribe({
      next : (it) => {
        this.loading = false
        this.resultado = it
      },
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  private mensagemErro(e : any) : string {
    return e?.error?.message || e?.error?.error?.message?.value || e?.message || 'Nao foi possivel montar o mapa de relacoes'
  }
}
