import { PdfService } from './pdf.service';

/** Gera de verdade (html2canvas + jsPDF no Chrome headless); o save e interceptado pelo nome do arquivo. */
describe('PdfService.baixarPdfPaginado', () => {

  function conteudoLongo(): HTMLElement {
    const el = document.createElement('div');
    el.innerHTML = '<h1>MINUTA</h1>' + '<p>linha de texto da minuta</p>'.repeat(150);
    document.body.appendChild(el);
    return el;
  }

  it('gera sem erro em uma pagina e em varias, e remove a copia fora da tela', async () => {
    const el = conteudoLongo();
    const filhosAntes = document.body.children.length;

    await new PdfService().baixarPdfPaginado(el, 'uma.pdf', true);
    await new PdfService().baixarPdfPaginado(el, 'varias.pdf');

    expect(document.body.children.length).toBe(filhosAntes);
    el.remove();
  }, 60000);

  it('nome de arquivo sem caracteres proibidos', () => {
    expect(PdfService.nomeArquivo('Minuta 1 - A/B: "C"')).toBe('Minuta 1 - A B C');
  });
});
