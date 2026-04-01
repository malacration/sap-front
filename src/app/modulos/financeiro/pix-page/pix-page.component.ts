import { Component } from '@angular/core';
import { PixGeradoItem, PixPedidoRequest, PixService } from '../../../sap/service/pix.service';
import { Branch } from '../../../sap/model/branch';

type Etapa = 'selecao' | 'loading' | 'resultado' | 'erro';

@Component({
  selector: 'app-pix-page',
  templateUrl: './pix-page.component.html',
})
export class PixPageComponent {
  etapa: Etapa = 'selecao';
  valorStandalone: number | null = null;
  filialSelecionada: Branch | null = null;
  parceiroCodigo: string | null = null;
  parceiroNome: string | null = null;
  pixData: PixGeradoItem | null = null;
  copiado = false;

  constructor(private pixService: PixService) {}

  onFilialChange(branch: Branch) {
    this.filialSelecionada = branch;
  }

  onParceiroChange(parceiro: any) {
    this.parceiroCodigo = parceiro?.CardCode ?? null;
    this.parceiroNome = parceiro?.CardName ?? null;
  }

  gerar() {
    const request: PixPedidoRequest = {
      cardCode: this.parceiroCodigo,
      valor: this.valorStandalone,
      idFilial: Number(this.filialSelecionada.Bplid),
    };

    this.etapa = 'loading';
    this.copiado = false;

    this.pixService.gerarPixPedido(request).subscribe({
      next: (res) => { this.pixData = res; this.etapa = 'resultado'; },
      error: () => { this.etapa = 'erro'; },
    });
  }

  voltar() {
    this.etapa = 'selecao';
    this.pixData = null;
  }

  copiar() {
    if (this.pixData?.U_QrCodePix) {
      navigator.clipboard.writeText(this.pixData.U_QrCodePix);
      this.copiado = true;
    }
  }

  abrirLinkCliente() {
    if (!this.pixData) return;
    const payload = {
      qrCode: this.pixData.U_QrCodePix,
      valor: this.pixData.ValorTotal ?? this.pixData.Total,
      vencimento: this.pixData.U_pix_due_date ?? this.pixData.DueDate,
      nome: this.parceiroNome,
    };
    const encoded = btoa(JSON.stringify(payload));
    window.open(`${window.location.origin}/pix-link?d=${encoded}`, '_blank');
  }

  get gerarDesabilitado(): boolean {
    return !this.parceiroCodigo ||
      this.valorStandalone == null || this.valorStandalone <= 0 ||
      this.filialSelecionada == null;
  }
}
