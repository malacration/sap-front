import { ConfigService } from '../../../../core/services/config.service';
import { RelatorioTokensComponent } from './relatorio-tokens.component';

describe('Tokens para IA', () => {
  function criar(host: string) {
    const toastr = jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']);
    const component = new RelatorioTokensComponent(
      {} as any, {} as any, toastr, { getHostRelatorios: () => host } as ConfigService,
    );
    component.recemCriado = { id: '1', nome: 'GPT', token: 'rpt_abc123', expiraEm: '2026-12-31T23:59:00', aviso: 'guarde agora' };
    return { component, toastr };
  }

  it('monta o JSON com o endereco da API que o front usa', () => {
    const { component } = criar('https://portal.exemplo/api/sap-reports/api/v1');
    const json = JSON.parse(component.credenciaisJson);
    expect(json).toEqual({
      api: 'https://portal.exemplo/api/sap-reports/api/v1',
      token: 'rpt_abc123',
      header: 'Authorization: Bearer <token>',
      expiraEm: '2026-12-31T23:59:00',
    });
  });

  it('torna absoluto um endereco relativo', () => {
    const { component } = criar('/api/sap-reports/api/v1');
    expect(component.apiUrl).toBe(`${window.location.origin}/api/sap-reports/api/v1`);
  });

  it('marca separadamente o que foi copiado', async () => {
    const { component, toastr } = criar('/api/v1');
    const escrever = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText: escrever } as any);

    component.copiar();
    await Promise.resolve();
    expect(escrever).toHaveBeenCalledWith('rpt_abc123');
    expect(component.copiado).toBeTrue();
    expect(component.copiadoJson).toBeFalse();

    component.copiarJson();
    await Promise.resolve();
    expect(escrever.calls.mostRecent().args[0]).toContain('"api"');
    expect(component.copiadoJson).toBeTrue();
    expect(toastr.success).toHaveBeenCalledTimes(2);
  });
});
