import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface PixLinkData {
  qrCode: string;
  valor: number;
  vencimento: string;
  nome?: string;
}

@Component({
  selector: 'app-pix-link',
  templateUrl: './pix-link.component.html',
  styleUrls: ['./pix-link.component.scss'],
})
export class PixLinkComponent implements OnInit, OnDestroy {
  data: PixLinkData | null = null;
  copiado = false;
  invalido = false;

  countdown = '';
  expirado = false;
  private timer: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('d');
    if (!raw) { this.invalido = true; return; }
    try {
      this.data = JSON.parse(atob(raw));
      this.iniciarContagem();
    } catch {
      this.invalido = true;
    }
  }

  private iniciarContagem(): void {
    const atualizar = () => {
      const vencimento = new Date(this.data.vencimento).getTime();
      const agora = Date.now();
      const diff = vencimento - agora;

      if (diff <= 0) {
        this.expirado = true;
        this.countdown = '00:00';
        clearInterval(this.timer);
        return;
      }

      const horas = Math.floor(diff / 3600000);
      const minutos = Math.floor((diff % 3600000) / 60000);
      const segundos = Math.floor((diff % 60000) / 1000);

      if (horas > 0) {
        this.countdown = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;
      } else {
        this.countdown = `${this.pad(minutos)}:${this.pad(segundos)}`;
      }
    };

    atualizar();
    this.timer = setInterval(atualizar, 1000);
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  get podeCompartilhar(): boolean {
    return !!navigator.share;
  }

  copiar() {
    if (!this.data?.qrCode) return;
    navigator.clipboard.writeText(this.data.qrCode);
    this.copiado = true;
    setTimeout(() => this.copiado = false, 3000);
  }

  abrirNoBanco() {
    if (!this.data?.qrCode) return;
    navigator.share({
      title: 'Pagamento via PIX',
      text: this.data.qrCode,
    });
  }
}
