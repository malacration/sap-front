import * as Handlebars from 'handlebars';
import { CobrancaService } from './cobranca.service';

describe('CobrancaService', () => {

  function service(): CobrancaService {
    const configFake = { getHost: () => 'http://sap-service.local' } as any;
    return new CobrancaService(configFake, null as any);
  }

  describe('getDefinition - Observação Pagamento', () => {
    it('usa {{value}} como template, nao o valor cru, pra passar pelo escape do Handlebars', () => {
      // A tabela renderiza toda celula via [innerHTML] | appSafeHtml, que faz
      // bypassSecurityTrustHtml sem sanitizar - sem template, ORCT.Comments cru vira HTML/JS
      // executavel na tela de quem abrir a cobranca. So o 3o argumento de Column liga o
      // escape (Handlebars.compile HTML-escapa {{value}}, so {{{value}}} nao escaparia).
      const coluna = service()
        .getDefinition()
        .find((c) => c.label === 'Observação Pagamento');

      expect(coluna.html).toBe('{{value}}');
    });

    it('neutraliza HTML/JS injetado na observacao do recebimento', () => {
      const coluna = service()
        .getDefinition()
        .find((c) => c.label === 'Observação Pagamento');

      const malicioso = '<img src=x onerror="alert(1)">';
      const renderizado = Handlebars.compile(coluna.html)({ value: malicioso });

      expect(renderizado).not.toContain('<img');
      expect(renderizado).not.toContain('onerror=');
      expect(renderizado).toContain('&lt;img');
    });
  });
});
