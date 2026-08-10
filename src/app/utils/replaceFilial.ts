export class ReplaceFilial {
  static limparFilial(nomeFilial: string): string {
    if (!nomeFilial) return '';

    return nomeFilial
      .replace('SUSTENNUTRI NUTRICAO ANIMAL LTDA', '')
      .replace('SUSTENNUTRI NUTRIÇAO ANIMAL LTDA', '')
      // Mesma ideia da Sustennutri: todas as filiais da fazenda começam com essa
      // razão social fixa - tira o prefixo inteiro e deixa só o que vem depois
      // (ex.: "FAZENDA RIO MADEIRA S/A - FARM - CSC - Matriz" -> "CSC - Matriz").
      // Confirmado no JSON real da Service Layer (BPLName com o traço entre S/A e FARM).
      .replace('FAZENDA RIO MADEIRA S/A - FARM', '')
      .replace('- ', '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
