import { Component, ViewChild } from '@angular/core';
import { AuthService } from '../../../../shared/service/auth.service';
import { ToastrService } from 'ngx-toastr';
import { RelatorioService } from '../../../../sap/service/relatorio.service';
import { RelatorioAutoriaComponent } from '../autoria/relatorio-autoria.component';
import { RelatorioTokensComponent } from '../tokens/relatorio-tokens.component';
import { TabDirective } from 'ngx-bootstrap/tabs';
import { RelatorioConsumoComponent } from '../consumo/relatorio-consumo.component';

@Component({
  selector: 'app-relatorio',
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.scss'],
})
export class RelatorioComponent {
  readonly isAdmin: boolean;
  baixandoSkill = false;

  @ViewChild(RelatorioAutoriaComponent) autoria?: RelatorioAutoriaComponent;

  @ViewChild('painelTokens') painelTokens?: RelatorioTokensComponent;
  @ViewChild('abaAutoria') abaAutoria?: TabDirective;
  @ViewChild(RelatorioConsumoComponent) consumo?: RelatorioConsumoComponent;

  relatorioEdicaoId?: number;

  constructor(
    authService: AuthService,
    private readonly service: RelatorioService,
    private readonly toastr: ToastrService,
  ) {
    this.isAdmin = authService.hasRole('admin');
  }

  /** Mesmo padrao das demais telas: manual estatico em assets/docs. */
  abrirManual(): void {
    const url = new URL('assets/docs/relatorios/index.html', document.baseURI).href;
    window.open(url, '_blank');
  }

  abrirTokens(): void {
    this.painelTokens?.abrir();
  }

  /** Marca que a proxima ativacao da aba de autoria veio do botao "Editar". */
  private vindoDeEditar = false;

  editarRelatorio(id: number): void {
    this.relatorioEdicaoId = id;
    // Chamada direta, e nao via @Input: editar o MESMO relatorio duas vezes nao
    // muda o valor, e a deteccao de mudanca nao disparava.
    this.autoria?.abrirEdicao(id);
    this.vindoDeEditar = true;
    if (this.abaAutoria) {
      this.abaAutoria.active = true;
    }
  }

  abrirExecucao(): void {
    this.consumo?.carregarLista();
  }

  /**
   * Entrar na aba pelo titulo = criar novo (regra combinada com o usuario).
   *
   * Mas so descarta se o que estiver aberto for uma EDICAO. Um relatorio novo
   * ainda nao salvo fica como esta: ir a aba Executar conferir algo e voltar nao
   * pode apagar o que se estava escrevendo.
   */
  abrirAutoria(): void {
    if (this.vindoDeEditar) {
      this.vindoDeEditar = false;
      return;
    }
    if (this.autoria?.emEdicao) {
      this.relatorioEdicaoId = undefined;
      this.autoria.novo();
    }
  }

  onNovoIniciado(): void {
    this.relatorioEdicaoId = undefined;
  }

  baixarSkill(): void {
    this.baixandoSkill = true;
    this.service.baixarSkill().subscribe({
      next: (resposta) => {
        const nome = this.service.nomeArquivo(resposta, 'sap-reports-skill.zip');
        this.salvar(resposta.body, nome);
        this.baixandoSkill = false;
      },
      error: () => {
        this.toastr.error('Não foi possível baixar as instruções para IA.');
        this.baixandoSkill = false;
      },
    });
  }

  private salvar(conteudo: Blob | null, nome: string): void {
    if (!conteudo) {
      return;
    }
    const url = URL.createObjectURL(conteudo);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    // Revoga no proximo tick: revogar antes do clique processar cancela o download.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
