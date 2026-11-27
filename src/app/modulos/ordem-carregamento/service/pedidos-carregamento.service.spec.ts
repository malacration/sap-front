import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PainelExpedicaoPedidosService } from './pedidos-carregamento.service';
import { ConfigService } from '../../../core/services/config.service';

describe('PainelExpedicaoPedidosService', () => {
  it('envia as filiais como parametros repetidos', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ConfigService, useValue: { getHost: () => 'http://x' } },
      ],
    });
    const svc = TestBed.inject(PainelExpedicaoPedidosService);
    svc.getTotais('2026-01-01', '2026-01-31', [2, 5]).subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/painel/pedidos/totais'));
    expect(req.request.params.getAll('filial')).toEqual(['2', '5']);
  });
});
