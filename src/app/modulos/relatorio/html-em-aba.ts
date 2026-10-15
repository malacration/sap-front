/**
 * Abre a aba ja no clique, com um aviso de carregamento.
 *
 * Precisa ser sincrono: `window.open` chamado depois da resposta HTTP ja nao
 * conta como gesto do usuario, e o navegador bloqueia como popup.
 */
export function abrirAbaPendente(): Window | null {
  const aba = window.open('', '_blank');
  if (!aba) {
    return null;
  }
  aba.opener = null;
  aba.document.write(
    '<!doctype html><title>Gerando relatório…</title>' +
    '<p style="font-family:sans-serif;padding:2rem;color:#555">Gerando relatório…</p>',
  );
  aba.document.close();
  return aba;
}

/**
 * Mostra o relatorio numa aba propria, com Content-Security-Policy embutida.
 *
 * O template vem de upload. Aberto direto, o documento teria a origem deste
 * front e um script que escapasse da validacao poderia ler o token de login
 * no localStorage. A CSP no topo do documento bloqueia QUALQUER script -
 * inline, `on*=` e externos - e qualquer carga de fora, mantendo a mesma
 * garantia do iframe sandbox, mas com impressao paginada normal.
 *
 * Vai antes de todo o conteudo do relatorio: CSP em meta so vale para o que
 * vem depois dela, e outra meta adicionada pelo template so pode apertar a
 * politica, nunca afrouxar.
 */
export async function mostrarHtmlEmAba(aba: Window, conteudo: Blob | null): Promise<void> {
  const html = await (conteudo ?? new Blob()).text();
  const politica =
    "default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; " +
    "base-uri 'none'; form-action 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";
  const documento =
    `<!doctype html><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${politica}">` +
    html;
  const url = URL.createObjectURL(new Blob([documento], { type: 'text/html' }));
  aba.location.replace(url);
  // A aba precisa de tempo para carregar antes de a URL ser revogada.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Dispara o download de um arquivo ja em memoria. */
export function salvarArquivo(conteudo: Blob | null, nome: string): void {
  const url = URL.createObjectURL(conteudo || new Blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  // Revoga no proximo tick: revogar antes do clique processar cancela o download.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
