import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TravaOtpService, TravaOtpResponse } from '../../service/trava-otp.service';
import { TravaRegraService, Regra } from '../../service/trava-regra.service';

/**
 * Pagina que gera o codigo de liberacao (OTP) das travas da TransactionNotification.
 *
 * O calculo e feito no backend (sap-service /trava/otp), que guarda o segredo e
 * restringe por papel. Aqui so exibimos o codigo e o tempo restante. O codigo da
 * janela anterior tambem e aceito pela funcao HANA, entao ha folga de ~1 janela
 * alem do contador mostrado.
 */
@Component({
  selector: 'app-liberacao-trava',
  templateUrl: './liberacao-trava.component.html',
})
export class LiberacaoTravaComponent implements OnInit, OnDestroy {

  regra = 'DESCONTO';
  regras: Regra[] = [];
  mostrarAjuda = false;

  codigo: string | null = null;
  regraGerada: string | null = null;
  segundosRestantes = 0;
  carregando = false;
  erro: string | null = null;
  copiado = false;

  private timer: any = null;
  private gerarSub: Subscription | null = null;

  constructor(
    private travaOtpService: TravaOtpService,
    private travaRegraService: TravaRegraService,
  ) {}

  ngOnInit(): void {
    this.travaRegraService.getRegras().subscribe(regras => {
      this.regras = regras;
      if (regras.length && !regras.some(r => r.codigo === this.regra)) {
        this.regra = regras[0].codigo;
      }
    });
  }

  gerar(): void {
    // Evita chamadas concorrentes: clique repetido ou o timer disparando a
    // regeneracao enquanto uma requisicao ainda esta em andamento.
    if (this.carregando) {
      return;
    }
    const regra = (this.regra || '').trim().toUpperCase();
    if (!regra) {
      this.erro = 'Informe a regra.';
      return;
    }
    this.carregando = true;
    this.erro = null;
    this.gerarSub?.unsubscribe();
    this.gerarSub = this.travaOtpService.gerar(regra).subscribe({
      next: (resp: TravaOtpResponse) => {
        this.codigo = resp.codigo;
        this.regraGerada = resp.regra;
        this.segundosRestantes = resp.expiraEmSegundos;
        this.carregando = false;
        this.iniciarContagem();
      },
      error: (e) => {
        this.carregando = false;
        this.codigo = null;
        this.regraGerada = null;
        this.pararContagem();
        this.erro = e?.status === 403
          ? 'Voce nao tem permissao para gerar codigo de liberacao.'
          : 'Erro ao gerar o codigo. Tente novamente.';
      }
    });
  }

  copiar(): void {
    if (!this.codigo) {
      return;
    }
    const ok = () => {
      this.copiado = true;
      setTimeout(() => (this.copiado = false), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.codigo).then(ok).catch(() => this.copiarFallback(ok));
    } else {
      this.copiarFallback(ok);
    }
  }

  private copiarFallback(ok: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = this.codigo ?? '';
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      ok();
    } catch {
      // sem clipboard disponível; ignora
    }
    document.body.removeChild(ta);
  }

  private iniciarContagem(): void {
    this.pararContagem();
    this.timer = setInterval(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) {
        // janela trocou: regenera automaticamente para manter o codigo vigente
        this.gerar();
      }
    }, 1000);
  }

  private pararContagem(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.pararContagem();
    this.gerarSub?.unsubscribe();
  }
}
