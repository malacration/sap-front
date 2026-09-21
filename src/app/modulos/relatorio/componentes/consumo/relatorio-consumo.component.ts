import { FormularioParametrosComponent } from '../formulario-parametros/formulario-parametros.component';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import {
  FormatoRelatorio,
  Parametro,
  RelatorioDetalhe,
  RelatorioResumo,
} from '../../modelos/relatorio.model';
import { RelatorioService } from '../../../../sap/service/relatorio.service';

/**
 * O que a listagem precisa, comum aos dois formatos: o publico
 * (`RelatorioResumo`) e o administrativo (`RelatorioAdmin`, que inclui
 * rascunhos e por isso tem `versaoPublicada` nula).
 */
type RelatorioListado = {
  id: number;
  nome: string;
  descricao?: string | null;
  formatos: string[];
  versaoPublicada?: number | null;
};

@Component({
  selector: 'app-relatorio-consumo',
  templateUrl: './relatorio-consumo.component.html',
  styleUrls: ['./relatorio-consumo.component.scss'],
})
export class RelatorioConsumoComponent implements OnInit, OnDestroy {
  @Input() isAdmin = false;
  @Output() editarRelatorio = new EventEmitter<number>();

  relatorios: RelatorioListado[] = [];

  @ViewChild('formParams') formParams?: FormularioParametrosComponent;
  relatorio?: RelatorioDetalhe;
  pagina = 1;
  carregandoLista = false;
  carregandoDetalhe = false;
  /**
   * Item marcado na lista. E definido NO CLIQUE, e nao quando o detalhe chega:
   * antes o destaque so aparecia no fim do request, e o usuario clicava de novo.
   */
  selecionadoId?: number;
  gerando?: FormatoRelatorio;
  erroLista = '';
  erroDetalhe = '';
  erroGeracao = '';
  htmlSeguro?: SafeResourceUrl;



  private htmlObjectUrl?: string;
  private readonly destruir = new Subject<void>();
  private readonly selecaoAlterada = new Subject<void>();
  private selecao = 0;

  constructor(
    private fb: FormBuilder,
    private service: RelatorioService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregarLista();
  }

  ngOnDestroy(): void {
    this.selecao++;
    this.destruir.next();
    this.destruir.complete();
    this.selecaoAlterada.complete();
    this.limparHtml();
  }

  /**
   * Admin ve tambem os RASCUNHOS.
   *
   * Sem isso o rascunho recem-criado fica inalcancavel: a aba Criar nao tem mais
   * lista (por decisao de UX) e a listagem publica so mostra o que foi
   * publicado. O relatorio existia e nao aparecia em lugar nenhum.
   */
  carregarLista(): void {
    this.carregandoLista = true;
    this.erroLista = '';
    // Tipo explicito: a uniao de dois Observable<T> diferentes torna o
    // subscribe nao-chamavel. Os dois formatos compartilham o que a lista usa.
    const origem: Observable<RelatorioListado[]> = this.isAdmin
      ? (this.service.listarTodos() as unknown as Observable<RelatorioListado[]>)
      : (this.service.listar() as unknown as Observable<RelatorioListado[]>);
    origem.pipe(takeUntil(this.destruir)).subscribe({
      next: (relatorios) => {
        this.relatorios = relatorios || [];
        this.carregandoLista = false;
      },
      error: async (error) => {
        const detalhe = await this.service.lerErro(error);
        this.erroLista = detalhe?.mensagem || 'Não foi possível carregar os relatórios.';
        this.carregandoLista = false;
        this.toastr.error(this.erroLista);
      },
    });
  }

  selecionar(resumo: RelatorioListado): void {
    // Mesmo item ja aberto ou carregando: clicar de novo nao refaz o request.
    if (resumo.id === this.selecionadoId && (this.carregandoDetalhe || this.relatorio?.id === resumo.id)) {
      return;
    }
    this.selecao++;
    this.selecaoAlterada.next();
    this.gerando = undefined;
    if (this.isAdmin && resumo.versaoPublicada == null) {
      this.editar(resumo.id);
      return;
    }
    const selecao = this.selecao;
    this.selecionadoId = resumo.id;
    this.carregandoDetalhe = true;
    this.erroDetalhe = '';
    this.erroGeracao = '';
    this.relatorio = undefined;
    this.limparHtml();
    this.service.obter(resumo.id).pipe(
      takeUntil(this.selecaoAlterada), takeUntil(this.destruir),
    ).subscribe({
      next: (relatorio) => {
        this.relatorio = relatorio;
        this.carregandoDetalhe = false;
      },
      error: async (error) => {
        const detalhe = await this.service.lerErro(error);
        if (selecao !== this.selecao) return;
        this.erroDetalhe = detalhe?.mensagem || 'Não foi possível abrir o relatório.';
        this.carregandoDetalhe = false;
        this.toastr.error(this.erroDetalhe);
      },
    });
  }

  editar(id: number): void {
    this.editarRelatorio.emit(id);
  }

  gerar(formato: FormatoRelatorio): void {
    if (!this.relatorio || !this.relatorio.formatos.includes(formato)) {
      return;
    }
    if (!this.formParams || !this.formParams.valido) {
      this.formParams?.marcarTodos();
      this.toastr.warning('Preencha os parâmetros obrigatórios.');
      return;
    }

    const selecao = this.selecao;
    const id = this.relatorio.id;
    const aba = formato === 'html' ? this.abrirAbaPendente() : null;
    this.gerando = formato;
    this.erroGeracao = '';
    this.service.renderizar(id, formato, {
      params: this.formParams!.valores(),
    }).pipe(takeUntil(this.selecaoAlterada), takeUntil(this.destruir)).subscribe({
      next: (response) => {
        if (formato === 'html') {
          if (aba && !aba.closed) {
            this.mostrarEmAba(aba, response);
          } else {
            // Popup bloqueado: cai na visualizacao embutida de antes.
            this.exibirHtml(response);
          }
        } else {
          this.baixar(response, `${id}.${formato}`);
          this.toastr.success('Relatório gerado com sucesso.');
        }
        this.gerando = undefined;
      },
      error: async (error: HttpErrorResponse) => {
        aba?.close();
        const detalhe = await this.service.lerErro(error);
        if (selecao !== this.selecao) return;
        if (error.status === 422 && detalhe?.erro === 'resultado_truncado') {
          this.erroGeracao = `${detalhe.mensagem} Restrinja o período ou os filtros e tente novamente.`;
        } else if (error.status === 422) {
          this.erroGeracao = detalhe?.mensagem || 'O resultado excedeu o limite. Restrinja o período ou os filtros.';
        } else {
          this.erroGeracao = detalhe?.mensagem || 'Não foi possível gerar o relatório.';
        }
        this.gerando = undefined;
        this.toastr.error(this.erroGeracao);
      },
    });
  }





  identificarRelatorio(_: number, relatorio: RelatorioListado): number {
    return relatorio.id;
  }









  /**
   * Abre a aba ja no clique, com um aviso de carregamento.
   *
   * Precisa ser sincrono: `window.open` chamado depois da resposta HTTP ja nao
   * conta como gesto do usuario, e o navegador bloqueia como popup.
   */
  private abrirAbaPendente(): Window | null {
    const aba = window.open('', '_blank');
    if (!aba) {
      return null;
    }
    aba.opener = null;
    aba.document.write(
      '<!doctype html><title>Gerando relatório…</title>' +
      '<p style="font-family:sans-serif;padding:2rem;color:#555">Gerando relatório…</p>',
    );
    aba.document.close();
    return aba;
  }

  /**
   * Mostra o relatorio numa aba propria, com Content-Security-Policy embutida.
   *
   * O template vem de upload. Aberto direto, o documento teria a origem deste
   * front e um script que escapasse da validacao poderia ler o token de login
   * no localStorage. A CSP no topo do documento bloqueia QUALQUER script -
   * inline, `on*=` e externos - e qualquer carga de fora, mantendo a mesma
   * garantia do iframe sandbox, mas com impressao paginada normal.
   *
   * Vai antes de todo o conteudo do relatorio: CSP em meta so vale para o que
   * vem depois dela, e outra meta adicionada pelo template so pode apertar a
   * politica, nunca afrouxar.
   */
  private async mostrarEmAba(aba: Window, response: HttpResponse<Blob>): Promise<void> {
    const html = await (response.body ?? new Blob()).text();
    const politica =
      "default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; " +
      "base-uri 'none'; form-action 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";
    const documento =
      `<!doctype html><meta charset="utf-8">` +
      `<meta http-equiv="Content-Security-Policy" content="${politica}">` +
      html;
    const url = URL.createObjectURL(new Blob([documento], { type: 'text/html' }));
    aba.location.replace(url);
    // A aba precisa de tempo para carregar antes de a URL ser revogada.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private exibirHtml(response: HttpResponse<Blob>): void {
    this.limparHtml();
    const blob = new Blob([response.body || ''], { type: 'text/html' });
    this.htmlObjectUrl = URL.createObjectURL(blob);
    this.htmlSeguro = this.sanitizer.bypassSecurityTrustResourceUrl(this.htmlObjectUrl);
    this.toastr.success('Relatório HTML gerado com sucesso.');
  }

  private baixar(response: HttpResponse<Blob>, fallback: string): void {
    const blob = response.body || new Blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.service.nomeArquivo(response, fallback);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private limparHtml(): void {
    if (this.htmlObjectUrl) {
      URL.revokeObjectURL(this.htmlObjectUrl);
    }
    this.htmlObjectUrl = undefined;
    this.htmlSeguro = undefined;
  }
}
