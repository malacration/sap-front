import { Injectable } from '@angular/core';

/**
 * Guarda os filtros do painel no localStorage, com validade.
 *
 * O TTL existe porque filtro de painel envelhece mal: um período salvo há
 * semanas reabre a tela mostrando dados antigos como se fossem os atuais, e o
 * usuário não percebe. Expirando, ele cai no padrão e vê o período corrente.
 */
@Injectable({ providedIn: 'root' })
export class PainelFiltrosStorageService {
  private readonly chave = 'painel-vendas-v2:filtros';

  /** 12 horas: sobrevive ao expediente, não sobrevive à semana. */
  private readonly ttlMs = 12 * 60 * 60 * 1000;

  salvar(filtros: unknown): void {
    try {
      localStorage.setItem(
        this.chave,
        JSON.stringify({ expiraEm: Date.now() + this.ttlMs, filtros }),
      );
    } catch {
      // Modo anônimo, cota cheia ou storage bloqueado. Salvar filtro é
      // conveniência: falhar aqui não pode derrubar o painel.
    }
  }

  carregar<T>(): T | null {
    try {
      const bruto = localStorage.getItem(this.chave);
      if (!bruto) {
        return null;
      }
      const dados = JSON.parse(bruto) as { expiraEm?: number; filtros?: T };
      if (!dados?.expiraEm || Date.now() > dados.expiraEm) {
        // Expirado: limpa para não acumular lixo e devolve nulo, para a tela
        // usar o padrão em vez de um período velho.
        localStorage.removeItem(this.chave);
        return null;
      }
      return dados.filtros ?? null;
    } catch {
      // JSON corrompido (versão antiga do formato, por exemplo). Descarta.
      try {
        localStorage.removeItem(this.chave);
      } catch {
        /* storage indisponível */
      }
      return null;
    }
  }

  limpar(): void {
    try {
      localStorage.removeItem(this.chave);
    } catch {
      /* storage indisponível */
    }
  }
}
