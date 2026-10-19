import { Injectable } from '@angular/core';
import { NotaFiscalLote } from '../../model/fiscal/nota-fiscal-lote';

/**
 * Guarda o lote montado a mao na tela de Notas e XML em lote, so nesta aba (sessionStorage):
 * sobrevive a F5 e a ir para outra tela e voltar; fechar a aba descarta. Nada vai para o servidor,
 * e o download valida cada nota de novo - dado velho aqui so desatualiza o que o painel mostra.
 *
 * O usuario vai junto porque, fora do Keycloak, sair da conta nao recarrega a pagina: sem isso o
 * proximo a entrar na mesma aba herdaria o lote. Mesmo cuidado de PainelFiltrosStorageService:
 * todo acesso dentro de try, porque storage bloqueado ou cheio nao pode derrubar a tela.
 */
@Injectable({ providedIn: 'root' })
export class NotaFiscalLoteStorageService {

  static readonly CHAVE = 'nota-fiscal-lote:lote';
  // Subir so quando o formato mudar de um jeito que a versao anterior nao leia. v2 trouxe o tipo
  // (NF ou adiantamento); a v1 so tinha NF e e lida como NF.
  private static readonly VERSAO = 2;

  salvar(notas: NotaFiscalLote[], usuario: string): void {
    try {
      const storage = window.sessionStorage;
      if (notas.length === 0) {
        storage.removeItem(NotaFiscalLoteStorageService.CHAVE);
        return;
      }
      storage.setItem(NotaFiscalLoteStorageService.CHAVE, JSON.stringify({
        v: NotaFiscalLoteStorageService.VERSAO,
        usuario,
        notas: notas.map((nota) => NotaFiscalLote.paraArmazenar(nota)),
      }));
    } catch {
      // Cota cheia ou storage bloqueado: o lote segue so em memoria.
    }
  }

  carregar(usuario: string): NotaFiscalLote[] {
    try {
      const bruto = window.sessionStorage.getItem(NotaFiscalLoteStorageService.CHAVE);
      if (!bruto) {
        return [];
      }
      const dados = JSON.parse(bruto);
      if (![1, NotaFiscalLoteStorageService.VERSAO].includes(dados?.v) || dados.usuario !== usuario || !Array.isArray(dados.notas)) {
        this.limpar();
        return [];
      }
      const porChave = new Map<string, NotaFiscalLote>();
      dados.notas
        .filter((nota: any) => Number.isInteger(nota?.docEntry) && nota.docEntry > 0)
        .filter((nota: any) => nota.tipo == null || nota.tipo === 'NF' || nota.tipo === 'AD')
        .map((nota: any) => NotaFiscalLote.from({ ...nota, tipo: nota.tipo ?? 'NF', categoria: nota.categoria ?? nota.tipo ?? 'NF' }))
        .forEach((nota: NotaFiscalLote) => porChave.set(nota.chave, nota));
      return Array.from(porChave.values());
    } catch {
      // JSON corrompido: descarta.
      this.limpar();
      return [];
    }
  }

  limpar(): void {
    try {
      window.sessionStorage.removeItem(NotaFiscalLoteStorageService.CHAVE);
    } catch {
      // storage indisponivel
    }
  }
}
