import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Page } from '../../../sap/model/page.model';
import { CadastroRelatorio } from '../modelos/cadastro-relatorio.model';

/**
 * Busca de cadastros do sap-reports, de USO EXCLUSIVO dos filtros de parâmetro de relatório.
 * Telas de venda e cadastro continuam nas buscas do sap-service. Fornecido só pelo componente parametro-cadastro.
 */
@Injectable()
export class CadastroRelatorioService {
  constructor(private config: ConfigService, private http: HttpClient) {}

  /** `termo` também chega com o `nextLink` da página anterior ("Carregar Mais"), relativo a /relatorios/. */
  buscar(tipo: string, termo: string): Observable<Page<CadastroRelatorio>> {
    const base = `${this.config.getHostRelatorios()}/relatorios/`;
    // Só aceita link do próprio tipo; qualquer outro texto é termo de busca.
    const requisicao = termo?.startsWith(`cadastros/${tipo}?`)
      ? this.http.get<Page<CadastroRelatorio>>(base + termo)
      : this.http.get<Page<CadastroRelatorio>>(`${base}cadastros/${tipo}`, { params: { q: termo ?? '' } });
    return requisicao
      .pipe(map(page => {
        page.content = page.content.map(it => Object.assign(new CadastroRelatorio(), it));
        return page;
      }));
  }
}
