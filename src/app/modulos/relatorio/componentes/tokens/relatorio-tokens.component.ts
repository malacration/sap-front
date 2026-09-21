import { Component, TemplateRef, ViewChild } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { ToastrService } from 'ngx-toastr';
import { ConfigService } from '../../../../core/services/config.service';
import { RelatorioService } from '../../../../sap/service/relatorio.service';
import { TokenCriado, TokenResumo } from '../../modelos/token.model';

/**
 * Gerência dos tokens de serviço usados por agentes de IA.
 *
 * O valor do token aparece UMA vez, na criação — o servidor guarda só o hash.
 * Por isso a tela trata o momento da exibição com destaque: se o usuário fechar
 * sem copiar, não há como recuperar, só gerar outro.
 */
@Component({
  selector: 'app-relatorio-tokens',
  templateUrl: './relatorio-tokens.component.html',
  styleUrls: ['./relatorio-tokens.component.scss'],
})
export class RelatorioTokensComponent {
  @ViewChild('modalTokens', { static: true }) modalTokens!: TemplateRef<unknown>;

  tokens: TokenResumo[] = [];
  carregando = false;
  criando = false;

  nome = '';
  diasValidade = 30;

  /** Preenchido só logo após criar. É a única vez que o valor existe na tela. */
  recemCriado: TokenCriado | null = null;
  copiado = false;
  copiadoJson = false;

  private modal?: BsModalRef;

  constructor(
    private readonly service: RelatorioService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly config: ConfigService,
  ) {}

  /** Endereco da API que ESTE front usa - e o que o agente de IA precisa chamar. */
  get apiUrl(): string {
    const url = this.config.getHostRelatorios();
    return /^https?:\/\//i.test(url) ? url : new URL(url, window.location.origin).href;
  }

  /** Token + endereco num bloco so: e isso que a pessoa entrega ao agente. */
  get credenciaisJson(): string {
    if (!this.recemCriado) {
      return '';
    }
    return JSON.stringify(
      {
        api: this.apiUrl,
        token: this.recemCriado.token,
        header: 'Authorization: Bearer <token>',
        expiraEm: this.recemCriado.expiraEm,
      },
      null,
      2,
    );
  }

  abrir(): void {
    this.recemCriado = null;
    this.copiado = false;
    this.copiadoJson = false;
    this.modal = this.modalService.show(this.modalTokens, { class: 'modal-lg' });
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.service.listarTokens().subscribe({
      next: (tokens) => {
        this.tokens = tokens;
        this.carregando = false;
      },
      error: () => {
        this.toastr.error('Não foi possível carregar os tokens.');
        this.carregando = false;
      },
    });
  }

  criar(): void {
    if (!this.nome.trim()) {
      this.toastr.warning('Dê um nome ao token — é por ele que você saberá o que revogar depois.');
      return;
    }
    this.criando = true;
    this.service.criarToken(this.nome.trim(), this.diasValidade).subscribe({
      next: (criado) => {
        this.recemCriado = criado;
        this.copiado = false;
        this.copiadoJson = false;
        this.nome = '';
        this.criando = false;
        this.carregar();
      },
      error: (erro) => {
        this.toastr.error(erro?.error?.mensagem || 'Não foi possível gerar o token.');
        this.criando = false;
      },
    });
  }

  copiar(campo?: HTMLInputElement, valor: string = this.recemCriado?.token || '', json = false): void {
    if (!valor) {
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(valor).then(() => this.marcarCopiado(json), () => this.copiarPeloCampo(campo, json));
      return;
    }
    // Sem a API de area de transferencia (http, navegador antigo): seleciona e
    // usa o comando do proprio documento, em vez de mandar o usuario copiar a mao.
    this.copiarPeloCampo(campo, json);
  }

  private copiarPeloCampo(campo?: HTMLInputElement, json = false): void {
    if (campo) {
      campo.focus();
      campo.select();
      if (document.execCommand('copy')) {
        this.marcarCopiado(json);
        return;
      }
    }
    this.toastr.warning('Não foi possível copiar. O texto está selecionado: use Ctrl+C.');
  }

  copiarJson(campo?: HTMLTextAreaElement): void {
    this.copiar(campo as unknown as HTMLInputElement, this.credenciaisJson, true);
  }

  private marcarCopiado(json: boolean): void {
    if (json) {
      this.copiadoJson = true;
    } else {
      this.copiado = true;
    }
    this.toastr.success(json ? 'Token e endereço copiados.' : 'Token copiado.');
  }

  revogar(token: TokenResumo): void {
    if (!confirm(`Revogar o token "${token.nome}"? Quem estiver usando perde o acesso na hora.`)) {
      return;
    }
    this.service.revogarToken(token.id).subscribe({
      next: () => {
        this.toastr.success('Token revogado.');
        this.carregar();
      },
      error: () => this.toastr.error('Não foi possível revogar o token.'),
    });
  }

  /** Destaca o que está perto de vencer, para não descobrir pela falha. */
  diasRestantes(token: TokenResumo): number {
    const ms = new Date(token.expiraEm).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  situacao(token: TokenResumo): { texto: string; classe: string } {
    if (token.revogadoEm) {
      return { texto: 'Revogado', classe: 'badge-secondary' };
    }
    if (token.expirado) {
      return { texto: 'Expirado', classe: 'badge-danger' };
    }
    const dias = this.diasRestantes(token);
    if (dias <= 7) {
      return { texto: `Expira em ${dias}d`, classe: 'badge-warning' };
    }
    return { texto: 'Ativo', classe: 'badge-success' };
  }

  fechar(): void {
    this.modal?.hide();
  }
}
