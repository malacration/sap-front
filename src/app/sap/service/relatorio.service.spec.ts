import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '../../core/services/config.service';
import { LogoService } from '../../core/services/logo.service';
import { RelatorioService } from './relatorio.service';

describe('RelatorioService: logo na geracao', () => {
  const LOGO = 'data:image/png;base64,iVBORw0KGgo=';
  let http: HttpTestingController;
  let service: RelatorioService;

  function preparar(logo: string | null) {
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
  }

  /** from(promise) só emite depois do microtask; um tick de macrotask cobre a cadeia. */
  const tick = () => new Promise((resolve) => setTimeout(resolve));

  afterEach(() => http.verify());

  it('anexa a logo do sistema ao render e ao preview', async () => {
    preparar(LOGO);
    service.renderizar(7, 'pdf', { params: { a: 1 } }).subscribe();
    await tick();
    const render = http.expectOne((r) => r.url.endsWith('/relatorios/7/render'));
    expect(render.request.body).toEqual({ params: { a: 1 }, logo: LOGO });
    render.flush(new Blob());

    service.preview(7, 'html', { params: {} }, 2).subscribe();
    await tick();
    const preview = http.expectOne((r) => r.url.endsWith('/admin/relatorios/7/preview'));
    expect(preview.request.body.logo).toBe(LOGO);
    preview.flush(new Blob());
  });

  it('sem logo disponivel envia null e nao quebra a geracao', async () => {
    preparar(null);
    service.renderizar(7, 'csv', { params: {} }).subscribe();
    await tick();
    const req = http.expectOne((r) => r.url.endsWith('/relatorios/7/render'));
    expect(req.request.body.logo).toBeNull();
    req.flush(new Blob());
  });
});
