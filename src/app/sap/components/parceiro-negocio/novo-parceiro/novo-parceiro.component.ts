import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BusinessPartnerService } from '../../../../modulos/sap-shared/_services/business-partners.service';
import { FormaPagamento, FormaPagamentoService } from '../../../service/forma-pagamento.service';
import { CityService } from '../../../service/addresses/city.service';
import { StateService } from '../../../service/addresses/state.service';
import { CepService, EnderecoCep } from '../../../service/addresses/cep.service';
import { State } from '../../../model/adressess/state';
import { City } from '../../../model/adressess/city';
import { Localidade } from '../../../model/localidade/localidade';
import { SalesPerson } from '../../../model/sales-person/sales-person';
import { AlertService } from '../../../../shared/service/alert.service';

/**
 * Tipos de logradouro oferecidos. O SAP exige o tipo (CRD1.AddrType) e o campo e texto livre - a base
 * tem LINHA, RODOVIA, RUA... mas tambem "RODIVIA", "AVENINA". Lista fechada, sem acento como na base.
 */
export const TIPOS_LOGRADOURO = ['RUA', 'AVENIDA', 'TRAVESSA', 'ALAMEDA', 'PRACA', 'RODOVIA', 'ESTRADA',
  'LINHA', 'VICINAL', 'RAMAL', 'DISTRITO', 'VILA']

/** "Avenida Pinheiro Machado" -> { tipo: 'AVENIDA', rua: 'Pinheiro Machado' }; tipo nulo se nao reconhecer. */
export function separaLogradouro(logradouro : string) : { tipo : string, rua : string } {
  const texto = (logradouro || '').trim()
  const espaco = texto.indexOf(' ')
  if(espaco <= 0)
    return { tipo: null, rua: texto }
  const primeira = texto.substring(0, espaco).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  return TIPOS_LOGRADOURO.includes(primeira)
    ? { tipo: primeira, rua: texto.substring(espaco + 1).trim() }
    : { tipo: null, rua: texto }
}

/** Um endereco do formulario. Entrega e cobranca usam o mesmo bloco. */
export class EnderecoForm {
  tipoLogradouro : string = null
  cep = ''
  rua = ''
  numero = ''
  complemento = ''
  bairro = ''
  estado : string = null
  codigoMunicipio : string = null
  cidades : Array<City> = []
  carregandoCidades = false
  buscandoCep = false
  avisoCep : string = null
  /** digitos do CEP antes da ultima tecla: a consulta dispara quando o campo COMPLETA 8 digitos */
  cepAnterior = ''
  /** resposta de um CEP anterior que chegar atrasada nao pode sobrescrever o atual */
  consultaCep = 0
  /** idem para a lista de municipios: RO -> AC -> RO nao pode aceitar a primeira resposta de RO */
  consultaCidades = 0

  get cepValido() : boolean {
    return this.cep.replace(/\D/g, '').length == 8
  }

  get municipio() : City {
    return this.cidades.find(it => String(it.AbsId) == String(this.codigoMunicipio)) ?? null
  }

  get completo() : boolean {
    return !!(this.cepValido && this.tipoLogradouro && this.rua.trim() && this.numero.trim() && this.bairro.trim() && this.estado && this.municipio)
  }

  payload() : any {
    return {
      rua: this.rua.trim().toUpperCase(),
      numero: this.numero.trim(),
      complemento: this.complemento.trim() ? this.complemento.trim().toUpperCase() : null,
      bairro: this.bairro.trim().toUpperCase(),
      cidade: this.municipio?.Name ?? '',
      codigoMunicipio: this.codigoMunicipio,
      estado: this.estado,
      //so os digitos no formato 00000-000: a validacao conta digitos, entao o texto digitado pode ter lixo
      cep: this.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
      pais: 'BR',
      tipoEndereco: this.tipoLogradouro ?? '',
    }
  }
}

/**
 * Cadastro de cliente novo (botao Novo parceiro). Monta o mesmo Cliente que o POST da integracao
 * do forca de vendas recebe, mas vai para /business-partners/novo: la o CPF/CNPJ duplicado e
 * barrado e as formas marcadas aqui viram as formas de pagamento do cliente (CRD2). Sem nenhuma,
 * a tela de venda nao oferece forma de pagamento para ele.
 *
 * O SAP guarda dois enderecos (entrega bo_ShipTo e cobranca bo_BillTo). Com "cobranca no mesmo
 * endereco" marcado, o backend copia a entrega para a cobranca; desmarcado, vai o segundo bloco.
 */
@Component({
  selector: 'app-novo-parceiro',
  templateUrl: './novo-parceiro.component.html',
})
export class NovoParceiroComponent implements OnInit {

  pessoaFisica = true

  nome = ''
  cpfCnpj = ''
  ierg = ''
  dtnasc = ''
  telefone = ''
  email = ''
  observacao = ''
  vendedor : SalesPerson = null

  estados : Array<State> = []
  readonly tiposLogradouro = TIPOS_LOGRADOURO

  entrega = new EnderecoForm()
  cobranca = new EnderecoForm()
  cobrancaIgualEntrega = true
  localidade : Localidade = null
  avisoLocalidade : string = null

  formas : Array<FormaPagamento> = []
  formasMarcadas = new Set<string>()
  carregandoFormas = false
  erroFormas = false

  salvando = false
  tentouSalvar = false

  constructor(
    private bpService : BusinessPartnerService,
    private formaPagamentoService : FormaPagamentoService,
    private cityService : CityService,
    private stateService : StateService,
    private cepService : CepService,
    private alert : AlertService,
    private router : Router){
  }

  ngOnInit(): void {
    this.stateService.get().subscribe(estados => this.estados = estados)
    this.carregandoFormas = true
    this.formaPagamentoService.liberadas().subscribe({
      next: formas => {
        this.formas = formas
        this.carregandoFormas = false
      },
      error: () => {
        this.erroFormas = true
        this.carregandoFormas = false
      }
    })
  }

  get documentoDigitos() : string {
    return (this.cpfCnpj || '').replace(/\D/g, '')
  }

  get documentoValido() : boolean {
    return this.documentoDigitos.length == (this.pessoaFisica ? 11 : 14)
  }

  /** O que falta para salvar; vazio = pode salvar. A tela mostra a lista depois da primeira tentativa. */
  get pendencias() : Array<string> {
    const faltando = []
    if(!this.nome.trim())
      faltando.push(this.pessoaFisica ? 'Nome' : 'Razão social')
    if(!this.documentoValido)
      faltando.push(this.pessoaFisica ? 'CPF com 11 dígitos' : 'CNPJ com 14 dígitos')
    if(!this.entrega.completo)
      faltando.push('Endereço de entrega completo (CEP com 8 dígitos e tipo de logradouro)')
    if(!this.cobrancaIgualEntrega && !this.cobranca.completo)
      faltando.push('Endereço de cobrança completo (CEP com 8 dígitos e tipo de logradouro)')
    if(this.formasMarcadas.size == 0)
      faltando.push('Ao menos uma forma de pagamento')
    return faltando
  }

  mudaTipoPessoa(pessoaFisica : boolean){
    if(this.pessoaFisica == pessoaFisica)
      return
    this.pessoaFisica = pessoaFisica
    //RG x inscricao estadual e nascimento x abertura: o valor de um tipo nao serve no outro
    this.cpfCnpj = ''
    this.ierg = ''
    this.dtnasc = ''
  }

  /** ibge: municipio a selecionar depois que a lista do estado carregar (vem da busca de CEP). */
  mudaEstado(endereco : EnderecoForm, estado : string, ibge : string = null){
    if(estado && estado == endereco.estado && endereco.cidades.length > 0){
      this.selecionaMunicipioIbge(endereco, ibge)
      return
    }
    endereco.estado = estado
    endereco.codigoMunicipio = null
    endereco.cidades = []
    //limpar o estado tambem invalida a lista em voo, senao ela repovoa os municipios da UF removida
    const consulta = ++endereco.consultaCidades
    endereco.carregandoCidades = false
    if(!estado)
      return
    endereco.carregandoCidades = true
    this.cityService.get(estado).subscribe({
      next: cidades => {
        //resposta de um estado trocado no meio da busca nao pode preencher o select do atual
        if(consulta != endereco.consultaCidades) return
        endereco.cidades = cidades
        endereco.carregandoCidades = false
        this.selecionaMunicipioIbge(endereco, ibge)
      },
      error: () => {
        if(consulta != endereco.consultaCidades) return
        endereco.carregandoCidades = false
      }
    })
  }

  /** Troca de estado feita pelo vendedor: uma consulta de CEP em andamento nao pode desfazer a escolha. */
  mudaEstadoManual(endereco : EnderecoForm, estado : string){
    endereco.consultaCep++
    endereco.buscandoCep = false
    this.mudaEstado(endereco, estado)
  }

  private selecionaMunicipioIbge(endereco : EnderecoForm, ibge : string){
    if(!ibge)
      return
    //o municipio do CEP anterior nao pode sobrar se o novo IBGE nao estiver na lista
    endereco.codigoMunicipio = null
    const municipio = endereco.cidades.find(it => it.IbgeCode == ibge)
    if(municipio)
      endereco.codigoMunicipio = municipio.AbsId
    else
      endereco.avisoCep = 'Município do CEP não encontrado no cadastro do SAP: selecione manualmente.'
  }

  /**
   * Consulta quando o campo completa 8 digitos - inclusive redigitando o mesmo CEP. So nao repete
   * quando o valor nao mudou de verdade (ex.: so a mascara, 76801000 -> 76801-000).
   */
  cepAlterado(endereco : EnderecoForm, cep : string){
    endereco.cep = cep
    const digitos = (cep || '').replace(/\D/g, '')
    const anterior = endereco.cepAnterior
    endereco.cepAnterior = digitos
    if(digitos == anterior)
      return
    //CEP editado: a resposta de uma consulta em andamento ja nao vale mais
    endereco.consultaCep++
    endereco.buscandoCep = false
    if(digitos.length == 8)
      this.buscaCep(endereco, digitos)
  }

  /** Botao da lupa: refaz a consulta do CEP que esta no campo. */
  buscaCepManual(endereco : EnderecoForm){
    const digitos = (endereco.cep || '').replace(/\D/g, '')
    if(digitos.length != 8){
      endereco.avisoCep = 'Informe o CEP com 8 dígitos.'
      return
    }
    this.buscaCep(endereco, digitos)
  }

  /**
   * Preenche rua, bairro, estado e municipio a partir do CEP. Numero e complemento sao sempre
   * do vendedor. Sem resposta, nada muda e o preenchimento segue manual.
   */
  buscaCep(endereco : EnderecoForm, cep : string){
    endereco.avisoCep = null
    endereco.buscandoCep = true
    const consulta = ++endereco.consultaCep
    this.cepService.consulta(cep).subscribe(resultado => {
      if(consulta != endereco.consultaCep) return
      endereco.buscandoCep = false
      if(!resultado){
        endereco.avisoCep = 'CEP não encontrado: preencha o endereço manualmente.'
        return
      }
      this.aplicaCep(endereco, resultado)
    })
  }

  private aplicaCep(endereco : EnderecoForm, resultado : EnderecoCep){
    if(resultado.logradouro){
      const { tipo, rua } = separaLogradouro(resultado.logradouro)
      endereco.rua = rua
      if(tipo)
        endereco.tipoLogradouro = tipo
    }
    if(resultado.bairro)
      endereco.bairro = resultado.bairro
    //CEP geral de cidade pequena vem so com cidade e UF
    if(!resultado.logradouro || !resultado.bairro)
      endereco.avisoCep = 'CEP geral da cidade: confira rua e bairro.'
    this.mudaEstado(endereco, resultado.uf, resultado.ibge)
  }

  //PayMethCod vem tipado como number no modelo, mas o codigo da forma e texto ("AVISTA")
  marcada(forma : FormaPagamento) : boolean {
    return this.formasMarcadas.has(String(forma.PayMethCod))
  }

  alternaForma(forma : FormaPagamento){
    const codigo = String(forma.PayMethCod)
    if(this.formasMarcadas.has(codigo))
      this.formasMarcadas.delete(codigo)
    else
      this.formasMarcadas.add(codigo)
  }

  selecionaVendedor(vendedor : SalesPerson){
    this.vendedor = vendedor ?? null
  }

  /** U_Localidade do endereco e numerico: codigo com letra viraria NaN/null e a localidade se perderia calada. */
  selecionaLocalidade(localidade : Localidade){
    this.avisoLocalidade = null
    if(localidade && !/^\d+$/.test(String(localidade.Code ?? ''))){
      this.localidade = null
      this.avisoLocalidade = `A localidade ${localidade.Code} tem código não numérico e não pode ser vinculada ao endereço.`
      return
    }
    this.localidade = localidade ?? null
  }

  payload() : any {
    const vazioViraNulo = (valor : string) => valor?.trim() ? valor.trim() : null
    return {
      nome: this.nome.trim().toUpperCase(),
      cpfCnpj: this.documentoDigitos,
      ierg: vazioViraNulo(this.ierg),
      dtnasc: vazioViraNulo(this.dtnasc),
      telefone: vazioViraNulo(this.telefone),
      email: vazioViraNulo(this.email),
      obscadastral: vazioViraNulo(this.observacao),
      idVendedor: this.vendedor?.SalesEmployeeCode != null ? String(this.vendedor.SalesEmployeeCode) : null,
      localidade: this.localidade?.Code != null ? Number(this.localidade.Code) : null,
      formasPagamento: Array.from(this.formasMarcadas),
      endereco: this.entrega.payload(),
      enderecoCobranca: this.cobrancaIgualEntrega ? null : this.cobranca.payload(),
    }
  }

  salvar(){
    this.tentouSalvar = true
    if(this.pendencias.length > 0 || this.salvando)
      return
    //a tela nao sabe se o login e de vendedor - quem decide e o backend. Por isso o aviso cobre os
    //dois casos: vendedor fica com o cliente; quem nao e vendedor deixa o cliente sem vendedor (-1)
    if(!this.vendedor){
      this.alert.confirm(NovoParceiroComponent.AVISO_SEM_VENDEDOR).then(resposta => {
        if(resposta?.isConfirmed)
          this.enviar()
      })
      return
    }
    this.enviar()
  }

  static readonly AVISO_SEM_VENDEDOR = 'Nenhum vendedor selecionado. Se o seu login for de vendedor, o cliente fica com você. '
    + 'Se não for, o cliente será cadastrado SEM vendedor (-1) e não vai aparecer na busca dos vendedores. Continuar?'

  private enviar(){
    if(this.salvando)
      return
    this.salvando = true
    this.bpService.criarNovo(this.payload()).subscribe({
      next: parceiro => {
        this.salvando = false
        const semVendedor = parceiro.SalesPersonCode == null || Number(parceiro.SalesPersonCode) == -1
        const mensagem = semVendedor
          ? `Parceiro ${parceiro.CardCode} cadastrado sem vendedor (-1).`
          : `Parceiro ${parceiro.CardCode} cadastrado para o vendedor ${parceiro.SalesEmployeeName || parceiro.SalesPersonCode}.`
        this.alert.info(mensagem).then(() =>
          this.router.navigate(['/clientes/parceiro-negocio', parceiro.CardCode]))
      },
      //a mensagem do backend (ex.: CPF/CNPJ ja cadastrado) sai pelo tratamento global de erro HTTP
      error: () => this.salvando = false
    })
  }

  cancelar(){
    this.router.navigate(['/clientes/parceiro-negocio'])
  }
}
