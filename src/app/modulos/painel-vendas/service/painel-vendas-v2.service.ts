import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import {
  PainelVendasV2Evolucao,
  PainelVendasV2Filtro,
  PainelVendasV2Kpis,
} from '../modelos/painel-vendas-v2.model';

@Injectable({ providedIn: 'root' })
export class PainelVendasV2Service {
  private readonly baseUrl: string;

  constructor(private config: ConfigService, private http: HttpClient) {
    this.baseUrl = this.config.getHost() + '/painel-vendas/v2';
  }

  getKpis(filtro: PainelVendasV2Filtro): Observable<PainelVendasV2Kpis> {
    return this.http.get<PainelVendasV2Kpis>(this.baseUrl + '/kpis', {
      params: this.criarParametros(filtro),
    });
  }

  getEvolucao(filtro: PainelVendasV2Filtro): Observable<PainelVendasV2Evolucao[]> {
    const params = this.criarParametros(filtro).set('granularidade', filtro.granularidade);
    return this.http.get<PainelVendasV2Evolucao[]>(this.baseUrl + '/evolucao', { params });
  }

  private criarParametros(filtro: PainelVendasV2Filtro): HttpParams {
    let params = new HttpParams()
      .set('dataInicio', filtro.dataInicio)
      .set('dataFim', filtro.dataFim);

    (filtro.filiais ?? []).forEach((filial) => {
      params = params.append('filiais', filial.toString());
    });

    if (filtro.slpCode != null) {
      params = params.set('slpCode', filtro.slpCode.toString());
    }

    return params;
  }
}
