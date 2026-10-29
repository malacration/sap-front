import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable, { CellInput, RowInput, UserOptions } from 'jspdf-autotable';
import { OrdemProducao, dataBr, numeroBr } from '../_model/ordem-producao';

const MARGEM = 10
const FONTE = 'helvetica'
const CINZA : [number, number, number] = [225, 225, 225]
// Altura minima (mm) de uma lacuna para escrever data, hora ou lote a caneta.
const LACUNA = 10

/**
 * Quanto a lista de materias-primas pode encolher para a ordem caber numa folha A4: primeiro some
 * com as linhas em branco, depois baixa a altura da linha e a fonte. As lacunas de data/hora
 * (LACUNA) nao encolhem - sao as que o operador escreve a caneta.
 */
interface Densidade {
  brancos : number   // linhas em branco garantidas na lista de materias-primas
  linha : number     // altura (mm) da linha de materia-prima
  fonte : number     // fonte da lista de materias-primas
  extras : number    // linhas de reprocesso e de limpeza (cada)
  apertado : boolean // equipe, contador de batidas e espacos entre blocos tambem encolhem
}
const DENSIDADES : Array<Densidade> = [
  { brancos: 10, linha: 5.5, fonte: 8, extras: 2, apertado: false },
  { brancos: 4, linha: 5.5, fonte: 8, extras: 2, apertado: false },
  { brancos: 0, linha: 5, fonte: 7.5, extras: 2, apertado: false },
  { brancos: 0, linha: 4.4, fonte: 7, extras: 2, apertado: true },
  { brancos: 0, linha: 3.8, fonte: 6.5, extras: 1, apertado: true },
  { brancos: 0, linha: 3.3, fonte: 6, extras: 1, apertado: true },
  { brancos: 0, linha: 2.8, fonte: 5, extras: 1, apertado: true },
]
// Pagina maior na proporcao do A4, que a impressao reduz por igual para caber na folha:
// continua sendo uma folha so. Escala 1 e o A4 normal.
const ESCALAS = [1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3]
const A4 = { largura: 210, altura: 297 }
interface Ajuste { densidade : Densidade, escala : number }

// Data de fabricacao em destaque: linha propria, fonte grande, para o operador achar de longe.
const linhaFabricacao = (ordem : OrdemProducao, colunas : number) : RowInput => [
  { content: 'DATA DE FABRICAÇÃO', colSpan: 2,
    styles: { fontStyle: 'bold', fillColor: CINZA, fontSize: 12, valign: 'middle' } },
  { content: dataBr(ordem.dataFabricacao), colSpan: colunas - 2,
    styles: { fontStyle: 'bold', fontSize: 16, halign: 'center', valign: 'middle', minCellHeight: 11 } },
]

// Celula de rotulo (fundo cinza, negrito) e de lacuna para o operador preencher a mao.
const rotulo = (content : string, extra : any = {}) : CellInput =>
  ({ content, styles: { fontStyle: 'bold', fillColor: CINZA, ...extra } })
const valor = (content : any, extra : any = {}) : CellInput =>
  ({ content: content == null ? '' : String(content), styles: { ...extra } })

/**
 * Formularios impressos da producao, no layout da planilha "ORDEM DE PRODUÇÃO SAP.xlsx" (abas
 * PRODUÇÃO e EMBALAGEM). O que o SAP tem sai preenchido; o resto fica em branco para o operador
 * escrever na maquina (lote, validade, realizado, sobras, equipe, horarios, assinaturas).
 */
@Injectable({
  providedIn: 'root'
})
export class OrdemProducaoPdfService {

  /** Cada ordem de producao ocupa exatamente uma folha A4. */
  ordemProducao(ordens : Array<OrdemProducao>) : jsPDF {
    let doc : jsPDF
    ordens.forEach((ordem, i) => {
      const ajuste = this.ajusteQueCabe(ordem)
      if(i == 0)
        doc = this.novoDocumento(ajuste.escala)
      else
        doc.addPage(this.formato(ajuste.escala), 'portrait')
      this.paginaOrdemProducao(doc, ordem, ajuste.densidade)
    })
    return doc ?? this.novoDocumento()
  }

  // Desenha num documento de rascunho e fica com o primeiro ajuste que nao abre segunda folha.
  // A ordem das tentativas e pela altura que a linha de materia-prima tera NA FOLHA IMPRESSA
  // (linha / escala): o operador escreve lote e realizado nela, entao vale mais uma pagina um pouco
  // reduzida com linha legivel do que um A4 com linha de 3 mm.
  private ajusteQueCabe(ordem : OrdemProducao) : Ajuste {
    const tentativas : Array<Ajuste> = DENSIDADES
      .flatMap(densidade => ESCALAS.map(escala => ({ densidade, escala })))
      .sort((a, b) => (b.densidade.linha / b.escala) - (a.densidade.linha / a.escala)
        || DENSIDADES.indexOf(a.densidade) - DENSIDADES.indexOf(b.densidade)
        || a.escala - b.escala)
    return tentativas.find(ajuste => {
      const rascunho = this.novoDocumento(ajuste.escala)
      this.paginaOrdemProducao(rascunho, ordem, ajuste.densidade)
      return rascunho.getNumberOfPages() == 1
    }) ?? tentativas[tentativas.length - 1]
  }

  /** Ordem de embalagem (etiqueta): um bloco por ordem, quantos couberem na pagina. */
  ordemEmbalagem(ordens : Array<OrdemProducao>) : jsPDF {
    const doc = this.novoDocumento()
    const altura = doc.internal.pageSize.getHeight()
    const rodape = 22
    let y = this.titulo(doc, 'ORDEM DE PRODUÇÃO - EMBALAGEM / ETIQUETA')
    ordens.forEach(ordem => {
      // Bloco tem ~60mm; sem espaco, assina a pagina atual e continua na proxima.
      if(y + 60 > altura - rodape) {
        this.assinaturas(doc, altura - rodape + 6, ['Operador Responsável', 'Controle de Qualidade'])
        doc.addPage()
        y = this.titulo(doc, 'ORDEM DE PRODUÇÃO - EMBALAGEM / ETIQUETA')
      }
      y = this.blocoEmbalagem(doc, ordem, y) + 5
    })
    this.assinaturas(doc, altura - rodape + 6, ['Operador Responsável', 'Controle de Qualidade'])
    return doc
  }

  /** Abre o PDF em nova aba; se o navegador bloquear o popup, baixa o arquivo. */
  abrir(doc : jsPDF, nomeArquivo : string) {
    const novaAba = window.open(doc.output('bloburl').toString(), '_blank')
    if(!novaAba)
      doc.save(`${nomeArquivo}.pdf`)
  }

  private paginaOrdemProducao(doc : jsPDF, ordem : OrdemProducao, densidade : Densidade) {
    const espaco = densidade.apertado ? 1 : 2
    let y = this.titulo(doc, 'ORDEM DE PRODUÇÃO')

    y = this.tabela(doc, y, {
      body: [
        linhaFabricacao(ordem, 6),
        [rotulo('Produto:'), { content: ordem.produtoComCodigo, colSpan: 3, styles: { fontStyle: 'bold' } },
          rotulo('Lote:'), valor(ordem.U_lote_producao, { fontStyle: 'bold' })],
        [rotulo('Validade:'), valor(ordem.validade), rotulo('Fórmula:'), valor(ordem.Produto?.Formula),
          rotulo('SysFeed:'), valor(ordem.U_sysfeed_numero)],
      ],
      bodyStyles: { minCellHeight: 9 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 32 }, 2: { cellWidth: 20 }, 4: { cellWidth: 18 }, 5: { cellWidth: 36 } },
    })

    y = this.tabela(doc, y + espaco, {
      head: [['Peso do saco', 'Nº batidas', 'Peso da batida (kg)', 'Previsto (sacos)', 'Realizado', 'Sobras (kg)', 'O.P. SAP', 'Lote P.A. SysFeed']],
      body: [[valor(ordem.pesoSaco ? `${numeroBr(ordem.pesoSaco)} kg` : ''), valor(numeroBr(ordem.bateladas)), valor(numeroBr(ordem.pesoBatida)),
        valor(numeroBr(ordem.sacosPrevistos)), valor(''), valor(''),
        valor(ordem.DocumentNumber, { fontStyle: 'bold' }), valor('')]],
      bodyStyles: { minCellHeight: 8, halign: 'center' },
    })

    // Contador de batidas: o operador risca uma casa por batida feita.
    const casas = Math.max(40, Math.ceil((ordem.bateladas || 0) / 20) * 20)
    const linhasBatida : RowInput[] = []
    for(let inicio = 1; inicio <= casas; inicio += 20)
      linhasBatida.push(Array.from({ length: 20 }, (_, i) => valor(String(inicio + i).padStart(2, '0'))))
    y = this.tabela(doc, y + espaco, {
      head: [[{ content: `Controle de batidas - ${ordem.produtoComCodigo}`, colSpan: 20 }]],
      body: linhasBatida,
      bodyStyles: { minCellHeight: densidade.apertado ? 5 : 6, fontSize: 6, valign: 'top', halign: 'left', textColor: [120, 120, 120] },
    })

    const materias : RowInput[] = ordem.materiasPrimas.map(linha => [
      valor(linha.ItemName || linha.ItemNo),
      valor(''),
      valor(numeroBr(ordem.kgPorBatida(linha), 3), { halign: 'right' }),
      valor(numeroBr(linha.PlannedQuantity, 3), { halign: 'right' }),
      valor(''),
    ])
    // Linhas em branco para insumo que entrar fora da formula.
    while(materias.length < densidade.brancos)
      materias.push([valor(''), valor(''), valor(''), valor(''), valor('')])
    const extras = (nome : string) : RowInput[] => Array.from({ length: densidade.extras },
      () => [rotulo(nome), valor(''), valor(''), valor(''), valor('')])
    const totalBatida = ordem.materiasPrimas.reduce((soma, it) => soma + (ordem.kgPorBatida(it) || 0), 0)
    const totalPrevisto = ordem.materiasPrimas.reduce((soma, it) => soma + (it.PlannedQuantity || 0), 0)
    y = this.tabela(doc, y + espaco, {
      head: [['Matéria-prima', 'Lote', 'kg / batida', 'Previsto (kg)', 'Realizado (kg)']],
      body: [
        ...materias,
        ...extras('Reprocesso'),
        ...extras('Limpeza'),
        [rotulo('PRODUZIDO REAL'), valor(''),
          valor(ordem.bateladas ? numeroBr(totalBatida, 3) : '', { halign: 'right', fontStyle: 'bold' }),
          valor(numeroBr(totalPrevisto, 3), { halign: 'right', fontStyle: 'bold' }), valor('')],
      ],
      bodyStyles: { minCellHeight: densidade.linha },
      columnStyles: { 1: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28 } },
    }, densidade.fonte)

    y = this.tabela(doc, y + espaco, {
      head: [[{ content: 'Equipe de produção', colSpan: 4 }]],
      body: [
        [rotulo('Função'), rotulo('Nome'), rotulo('Função'), rotulo('Nome')],
        [valor('Operador (A)'), valor(''), valor('Costura'), valor('')],
        [valor('Inserção'), valor(''), valor('Bloco'), valor('')],
        [valor('Ensaque'), valor(''), valor('Bloco'), valor('')],
        [valor('Ensaque'), valor(''), valor('Bloco'), valor('')],
        [valor('Dosagem'), valor(''), rotulo('Máquina de costura Nº:'), valor('')],
        [rotulo('OBS:'), { content: '', colSpan: 3 }],
      ],
      bodyStyles: { minCellHeight: densidade.apertado ? 4.6 : 5.5 },
      columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 40 } },
    }, densidade.apertado ? 7.5 : 8)

    y = this.tabela(doc, y + espaco, {
      head: [[{ content: 'Operação', colSpan: 4 }]],
      body: [
        [rotulo('Data inicial:'), valor(''), rotulo('Hora inicial:'), valor('')],
        [rotulo('Data final:'), valor(''), rotulo('Hora final:'), valor('')],
      ],
      bodyStyles: { minCellHeight: LACUNA },
      columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 28 } },
    })

    y = this.assinaturas(doc, y + (densidade.apertado ? 8 : 10), ['Operador', 'Controle de Qualidade'])

    // Etiqueta de ensaque: copia do que vai no saco.
    this.tabela(doc, y + espaco + 1, {
      head: [[{ content: 'ENSAQUE', colSpan: 4 }]],
      body: [
        [rotulo('Cód SAP:'), valor(ordem.ItemNo), rotulo('OP:'), valor(ordem.DocumentNumber)],
        [rotulo('Lote:'), valor(ordem.U_lote_producao), rotulo('Validade:'), valor(ordem.validade)],
      ],
      bodyStyles: { minCellHeight: LACUNA },
      columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 28 } },
    })
  }

  private blocoEmbalagem(doc : jsPDF, ordem : OrdemProducao, y : number) : number {
    return this.tabela(doc, y, {
      // OP, previsto e deposito vao na faixa do produto: a linha da data de fabricacao ocupa o lugar
      // deles e o bloco continua com a mesma altura (4 ordens por folha).
      head: [[{ content: [
        `Produto: ${ordem.produtoComCodigo}`,
        `O.P. SAP: ${ordem.DocumentNumber ?? ''}`,
        // PAC e planejado em sacos; PDC, em kg.
        `Previsto: ${numeroBr(ordem.PlannedQuantity, 3)} ${ordem.ensacado ? 'sacos' : 'kg'}`,
        ordem.Warehouse ? `Depósito: ${ordem.Warehouse}` : '',
      ].filter(Boolean).join('   |   '), colSpan: 8 }]],
      body: [
        linhaFabricacao(ordem, 8),
        [rotulo('Nº bateladas:'), valor(numeroBr(ordem.bateladas)), rotulo('Peso batida:'), valor(ordem.pesoBatida ? `${numeroBr(ordem.pesoBatida)} kg` : ''),
          rotulo('Peso saco:'), valor(ordem.pesoSaco ? `${numeroBr(ordem.pesoSaco)} kg` : ''), rotulo('Cor etiqueta:'), valor('')],
        // Sacaria ocupa 3 colunas: o nome do cadastro ja traz o tamanho (ex.: "SACARIA POWER 60x90").
        [rotulo('Validade:'), valor(ordem.validade), rotulo('Lote:'), valor(ordem.U_lote_producao, { fontStyle: 'bold' }),
          rotulo('Sacaria:'), { content: ordem.sacaria?.ItemName ?? '', colSpan: 3 }],
        [rotulo('Sacos previstos:'), valor(numeroBr(ordem.sacosPrevistos)), rotulo('Sacos realizados:'), valor(''),
          rotulo('Sacos sobra:'), valor(''), rotulo('Lote sacaria:'), valor('')],
        [rotulo('Observações:'), { content: '', colSpan: 7, styles: { minCellHeight: 11 } }],
      ],
      bodyStyles: { minCellHeight: 9 },
      // Validade e lote (colunas 1 e 3) largas: na ordem sem cadastro sao escritas a mao.
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 28 }, 2: { cellWidth: 27 }, 3: { cellWidth: 24 }, 4: { cellWidth: 22 }, 5: { cellWidth: 19 }, 6: { cellWidth: 23 } },
    })
  }

  private novoDocumento(escala = 1) : jsPDF {
    return new jsPDF({ orientation: 'portrait', unit: 'mm', format: this.formato(escala) })
  }

  private formato(escala : number) : [number, number] {
    return [A4.largura * escala, A4.altura * escala]
  }

  private titulo(doc : jsPDF, texto : string) : number {
    const largura = doc.internal.pageSize.getWidth()
    doc.setFont(FONTE, 'bold')
    doc.setFontSize(13)
    doc.setTextColor(0, 0, 0)
    doc.text(texto, largura / 2, MARGEM + 5, { align: 'center' })
    doc.setFont(FONTE, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(110, 110, 110)
    doc.text(`Impresso em ${new Date().toLocaleString('pt-BR')}`, largura - MARGEM, MARGEM + 10, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    return MARGEM + 12
  }

  private assinaturas(doc : jsPDF, y : number, nomes : Array<string>) : number {
    const largura = doc.internal.pageSize.getWidth() - 2 * MARGEM
    const coluna = largura / nomes.length
    doc.setFont(FONTE, 'normal')
    doc.setFontSize(8)
    doc.setDrawColor(0, 0, 0)
    nomes.forEach((nome, i) => {
      const x = MARGEM + i * coluna
      doc.line(x + 8, y, x + coluna - 8, y)
      doc.text(nome, x + coluna / 2, y + 4, { align: 'center' })
    })
    return y + 5
  }

  /** Grade com bordas pretas finas; devolve o Y logo abaixo dela. */
  private tabela(doc : jsPDF, startY : number, opcoes : UserOptions, fonte = 8) : number {
    autoTable(doc, {
      startY,
      theme: 'grid',
      // Lacuna cortada ao meio entre duas paginas nao serve pra escrever.
      rowPageBreak: 'avoid',
      margin: { left: MARGEM, right: MARGEM, top: MARGEM, bottom: MARGEM },
      styles: {
        font: FONTE,
        fontSize: fonte,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        // Fonte reduzida (lista longa) leva o respiro junto, senao a linha nao encolhe.
        cellPadding: fonte < 7.5 ? 0.6 : 1.2,
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: { fillColor: [190, 190, 190], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      ...opcoes,
      bodyStyles: { ...(opcoes.bodyStyles ?? {}) },
    })
    return (doc as any).lastAutoTable.finalY
  }
}
