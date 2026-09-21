import { Injectable } from '@angular/core';

/**
 * Logo do sistema (`logo.png`) como data: URI.
 *
 * O `logo.png` e injetado no deploy (variavel `logo` do container do front). O
 * sap-reports nunca busca recurso externo ao gerar PDF, entao a imagem precisa ir
 * embutida no pedido: e assim que o relatorio sai com a mesma marca da tela.
 *
 * Lido uma vez e guardado em memoria. Falha nao e erro: o relatorio sai sem logo.
 */
@Injectable({ providedIn: 'root' })
export class LogoService {
  private static readonly ARQUIVO = 'logo.png';
  /** ~512 KB: o mesmo teto que o backend aceita. */
  private static readonly MAX_BYTES = 512 * 1024;

  private promessa?: Promise<string | null>;

  dataUri(): Promise<string | null> {
    if (!this.promessa) {
      this.promessa = this.carregar().catch(() => null);
    }
    return this.promessa;
  }

  private async carregar(): Promise<string | null> {
    const resposta = await fetch(LogoService.ARQUIVO, { cache: 'force-cache' });
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    if (!blob.size || blob.size > LogoService.MAX_BYTES) return null;
    if (!/^image\/(png|jpeg|gif|webp)$/i.test(blob.type)) return null;
    return await new Promise<string | null>((resolve) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(typeof leitor.result === 'string' ? leitor.result : null);
      leitor.onerror = () => resolve(null);
      leitor.readAsDataURL(blob);
    });
  }
}
