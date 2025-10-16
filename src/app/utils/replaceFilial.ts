export class ReplaceFilial {
  static limparFilial(nomeFilial: string): string {
    if (!nomeFilial) return '';

    return nomeFilial
      .replace('SUSTENNUTRI NUTRICAO ANIMAL LTDA', '')
      .replace('SUSTENNUTRI NUTRIÇAO ANIMAL LTDA', '')
      .replace('- ', '')
      .trim();
  }
}
