import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick as avancar } from '@angular/core/testing';
import { ConfigService } from '../../core/services/config.service';
import { LogoService } from '../../core/services/logo.service';
import { Execucao } from '../../modulos/relatorio/modelos/execucao.model';
import { RelatorioService } from './relatorio.service';

function execucao(status: Execucao['status'], extra: Partial<Execucao> = {}): Execucao {
  return {
    id: 'e1', tipo: 'RENDER', relatorioId: 7, relatorioNome: 'Vendas', versao: 1, formato: 'pdf',
    params: {}, status, criadoEm: '2026-10-14T12:00:00Z', iniciadoEm: null, concluidoEm: null,
    expiraEm: null, erro: null, arquivo: null, ...extra,
  };
}

describe('RelatorioService', () => {
  const LOGO = 'data:image/png;base64,iVBORw0KGgo=';
  let http: HttpTestingController;
  let service: RelatorioService;

  function preparar(logo: string | null = LOGO) {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RelatorioService,
        { provide: ConfigService, useValue: { getHostRelatorios: () => '/api/v1' } },
        { provide: LogoService, useValue: { dataUri: () => Promise.resolve(logo) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(RelatorioService);
    localStorage.removeItem('relatorio-execucoes-entregues');
  }

  /** from(promise) só emite depois do microtask; um tick de macrotask cobre a cadeia. */
  const tick = () => new Promise((resolve) => setTimeout(resolve));

  afterEach(() => http.verify());

  describe('logo na geracao', () => {
    it('anexa a logo do sistema ao pedido de render e de previa', async () => {
      preparar(LOGO);
      const render = service.iniciarRender(7, 'pdf', { params: { a: 1 } }).subscribe();
      await tick();
      const pedido = http.expectOne((r) => r.url.endsWith('/relatorios/7/execucoes'));
      expect(pedido.request.params.get('formato')).toBe('pdf');
      expect(pedido.request.body).toEqual({ params: { a: 1 }, logo: LOGO });
      pedido.flush(execucao('PENDENTE'));
      render.unsubscribe();

      service.iniciarPreview(7, 'html', { params: {} }, 2).subscribe();
      await tick();
      const previa = http.expectOne((r) => r.url.endsWith('/admin/relatorios/7/preview/execucoes'));
      expect(previa.request.params.get('versao')).toBe('2');
      expect(previa.request.body.logo).toBe(LOGO);
      previa.flush(execucao('PENDENTE', { tipo: 'PREVIEW' }));
    });

    it('sem logo disponivel envia null e nao quebra a geracao', async () => {
      preparar(null);
      service.iniciarRender(7, 'csv', { params: {} }).subscribe();
      await tick();
      const req = http.expectOne((r) => r.url.endsWith('/relatorios/7/execucoes'));
      expect(req.request.body.logo).toBeNull();
      req.flush(execucao('PENDENTE'));
    });
  });

  describe('execucao assincrona', () => {
    it('acompanha ate concluir, baixa o arquivo e marca como entregue', fakeAsync(() => {
      preparar();
      let resposta: HttpResponse<Blob> | undefined;
      service.aguardarExecucao(execucao('PENDENTE'), 1000).subscribe((r) => (resposta = r));

      avancar(0);
      http.expectOne('/api/v1/execucoes/e1').flush(execucao('EXECUTANDO'));
      expect(service.estaSendoAcompanhada('e1')).toBeTrue();

      avancar(1000);
      http.expectOne('/api/v1/execucoes/e1').flush(execucao('CONCLUIDO'));
      http.expectOne('/api/v1/execucoes/e1/arquivo').flush(new Blob(['%PDF']));

      expect(resposta?.body).toBeTruthy();
      expect(service.foiEntregue('e1')).toBeTrue();
      expect(service.estaSendoAcompanhada('e1')).toBeFalse();
    }));

    it('falha vira HttpErrorResponse com o status e a mensagem da execucao', fakeAsync(() => {
      preparar();
      let erro: HttpErrorResponse | undefined;
      service.aguardarExecucao(execucao('PENDENTE'), 1000).subscribe({ error: (e) => (erro = e) });

      avancar(0);
      http.expectOne('/api/v1/execucoes/e1').flush(execucao('FALHOU', {
        erro: { status: 422, erro: 'resultado_truncado', mensagem: 'Restrinja o período.' },
      }));

      expect(erro?.status).toBe(422);
      expect(erro?.error).toEqual({ erro: 'resultado_truncado', mensagem: 'Restrinja o período.' });
      expect(service.estaSendoAcompanhada('e1')).toBeFalse();
    }));

    it('cancelar a espera solta a execucao para o painel', fakeAsync(() => {
      preparar();
      const espera = service.aguardarExecucao(execucao('PENDENTE'), 1000).subscribe();
      avancar(0);
      http.expectOne('/api/v1/execucoes/e1').flush(execucao('EXECUTANDO'));

      espera.unsubscribe();

      expect(service.estaSendoAcompanhada('e1')).toBeFalse();
    }));
  });
});
