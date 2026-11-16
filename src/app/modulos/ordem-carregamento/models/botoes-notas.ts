/** Linha de /carregamento/notas-status (sap-odbc): status da NF-e e situacao dos boletos. */
export interface StatusNota {
  Status?: string | null;
  EhBoleto?: boolean;
  BoletosAtivos?: number;
  ParcelasSemBoleto?: number;
}

/**
 * Botoes da aba Notas Emitidas. A BankPlus so gera boleto de NF-e com chave de acesso, entao
 * "Gerar" exige nota de boleto autorizada com parcela que nunca teve boleto; "Baixar" exige boleto
 * ativo. O sap-odbc pode mandar numero como texto.
 */
export function botoesNotas(status: StatusNota[]): { danfes: boolean; gerarBoletos: boolean; baixarBoletos: boolean } {
  const autorizadas = status.filter(s => s.Status === 'Autorizado');
  return {
    danfes: autorizadas.length > 0,
    gerarBoletos: autorizadas.some(s => s.EhBoleto && Number(s.ParcelasSemBoleto) > 0),
    baixarBoletos: status.some(s => Number(s.BoletosAtivos) > 0),
  };
}
