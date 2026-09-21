import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

export interface MarcadorEditor {
  linha: number;
  mensagem: string;
}

@Component({
  selector: 'app-editor-codigo',
  template: '<div #editorHost class="editor-host"></div>',
  styleUrls: ['./editor-codigo.component.scss'],
})
export class EditorCodigoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  @Input() valor = '';
  @Input() modo: 'yaml' | 'sql' | 'htmlmixed' | 'handlebars' = 'yaml';
  @Input() somenteLeitura = false;
  @Input() marcadores: MarcadorEditor[] = [];
  @Output() valorChange = new EventEmitter<string>();
  @Output() perdeuFoco = new EventEmitter<void>();

  private editor?: any;
  private alteracaoInterna = false;
  private linhasMarcadas: any[] = [];

  ngAfterViewInit(): void {
    const codeMirror = (window as any).CodeMirror;
    if (!codeMirror) {
      throw new Error('CodeMirror não foi carregado. Verifique a configuração de scripts no angular.json.');
    }

    this.editor = codeMirror(this.editorHost.nativeElement, {
      value: this.valor || '',
      mode: this.modoCodeMirror(),
      lineNumbers: true,
      gutters: ['CodeMirror-linenumbers', 'relatorio-errors'],
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      readOnly: this.somenteLeitura,
      lineWrapping: false,
      viewportMargin: 20,
      extraKeys: {
        Tab: (editor: any) => {
          if (editor.somethingSelected()) {
            editor.indentSelection('add');
          } else {
            editor.replaceSelection('  ', 'end', '+input');
          }
        },
      },
    });

    this.editor.on('change', (editor: any) => {
      if (!this.alteracaoInterna) {
        this.valorChange.emit(editor.getValue());
      }
    });
    this.editor.on('blur', () => this.perdeuFoco.emit());
    this.atualizarMarcadores();

    // O CodeMirror calcula o recuo do texto a partir da largura das gutters.
    // Aguarda o host participar do layout para que essa medicao nao seja zero.
    requestAnimationFrame(() => this.editor?.refresh());

    this.observarVisibilidade();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) {
      return;
    }

    if (changes['valor'] && this.editor.getValue() !== (this.valor || '')) {
      const cursor = this.editor.getCursor();
      this.alteracaoInterna = true;
      this.editor.setValue(this.valor || '');
      this.alteracaoInterna = false;
      this.editor.setCursor({
        line: Math.min(cursor.line, Math.max(this.editor.lineCount() - 1, 0)),
        ch: cursor.ch,
      });
    }
    if (changes['modo']) {
      this.editor.setOption('mode', this.modoCodeMirror());
    }
    if (changes['somenteLeitura']) {
      this.editor.setOption('readOnly', this.somenteLeitura);
    }
    if (changes['marcadores'] || changes['valor']) {
      this.atualizarMarcadores();
    }
    if (changes['modo'] || changes['valor']) {
      // O mesmo CodeMirror atende arquivos diferentes; após a troca ele precisa
      // recalcular gutter, medidas e realce do novo modo.
      requestAnimationFrame(() => this.editor?.refresh());
    }
  }

  /**
   * Reposiciona o editor quando ele passa a ter tamanho.
   *
   * O editor nasce dentro de abas (`Criar / Editar` e, dentro dela, `Arquivos e
   * validacao`), e o ngx-bootstrap mantem aba inativa no DOM apenas OCULTA. O
   * CodeMirror inicializa medindo largura ZERO: a gutter fica sem espaco, os
   * numeros de linha somem e o texto encosta por baixo dela.
   *
   * `requestAnimationFrame` sozinho nao resolve, porque ele dispara enquanto o
   * elemento ainda esta escondido. O ResizeObserver cobre o caso real - quando o
   * usuario TROCA para a aba - e de quebra resolve redimensionamento de janela e
   * painel que expande.
   */
  private observarVisibilidade(): void {
    if (typeof ResizeObserver === 'undefined') {
      return; // navegador antigo: perde o ajuste, nao quebra a tela
    }
    let larguraAnterior = 0;
    this.observador = new ResizeObserver((entradas) => {
      const largura = entradas[0]?.contentRect.width ?? 0;
      // So refaz na transicao de oculto (0) para visivel: refresh a cada pixel
      // de resize seria desperdicio.
      if (largura > 0 && larguraAnterior === 0) {
        this.editor?.refresh();
      }
      larguraAnterior = largura;
    });
    this.observador.observe(this.editorHost.nativeElement);
  }

  private observador?: ResizeObserver;

  ngOnDestroy(): void {
    this.observador?.disconnect();
    if (this.editor) {
      this.editor.toTextArea?.();
      this.editor.getWrapperElement()?.remove();
    }
    this.editor = undefined;
  }

  irParaLinha(linha: number): void {
    if (!this.editor || linha < 1) {
      return;
    }
    const indice = Math.min(linha - 1, Math.max(this.editor.lineCount() - 1, 0));
    this.editor.focus();
    this.editor.setCursor({ line: indice, ch: 0 });
    this.editor.scrollIntoView({ line: indice, ch: 0 }, 80);
  }

  atualizarTamanho(): void {
    this.editor?.refresh();
  }

  /**
   * Nome do modo para o CodeMirror.
   *
   * `handlebars` NAO e um modo comum: ele e multiplexado - embute um modo base
   * (aqui HTML) e trata as expressoes {{ }} por fora. Por isso devolve objeto
   * com `base`, e por isso o addon `multiplex.js` precisa estar carregado antes
   * de `handlebars.js` no angular.json. Usar `htmlmixed` puro realca o HTML mas
   * deixa as expressoes sem cor - que era o sintoma relatado.
   */
  private modoCodeMirror(): string | { name: string; base: string } {
    if (this.modo === 'sql') {
      return 'text/x-sql';
    }
    if (this.modo === 'handlebars') {
      return { name: 'handlebars', base: 'text/html' };
    }
    return this.modo;
  }

  private atualizarMarcadores(): void {
    if (!this.editor) {
      return;
    }

    this.editor.clearGutter('relatorio-errors');
    this.linhasMarcadas.forEach((linha) => this.editor.removeLineClass(linha, 'background', 'relatorio-line-error'));
    this.linhasMarcadas = [];

    const agrupados = new Map<number, string[]>();
    (this.marcadores || []).forEach((marcador) => {
      if (Number.isInteger(marcador.linha) && marcador.linha > 0) {
        const mensagens = agrupados.get(marcador.linha) || [];
        mensagens.push(marcador.mensagem);
        agrupados.set(marcador.linha, mensagens);
      }
    });

    agrupados.forEach((mensagens, linha) => {
      if (linha > this.editor.lineCount()) {
        return;
      }
      const indice = linha - 1;
      const icone = document.createElement('span');
      icone.className = 'relatorio-error-marker';
      icone.title = mensagens.join('\n');
      icone.textContent = '●';
      icone.addEventListener('click', () => this.irParaLinha(linha));
      this.editor.setGutterMarker(indice, 'relatorio-errors', icone);
      const handle = this.editor.addLineClass(indice, 'background', 'relatorio-line-error');
      this.linhasMarcadas.push(handle);
    });
  }
}
