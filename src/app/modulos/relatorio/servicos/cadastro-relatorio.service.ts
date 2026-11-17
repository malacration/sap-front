import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Page } from '../../../sap/model/page.model';

/**
 * Busca de cadastros do sap-reports, de USO EXCLUSIVO dos filtros de parâmetro de relatório.
 * Telas de venda e cadastro continuam nas buscas do sap-service. Fornecido só pelo RelatorioModule.
 */
@Injectable()
export class CadastroRelatorioService {
  constructor(private config: ConfigService, private http: HttpClient) {}

  buscar(tipo: string, termo: string): Observable<Page<{ codigo: string | number; nome: string }>> {
    return this.http.get<Page<{ codigo: string | number; nome: string }>>(
      `${this.config.getHostRelatorios()}/relatorios/cadastros/${tipo}`, { params: { q: termo ?? '' } });
  }
}
