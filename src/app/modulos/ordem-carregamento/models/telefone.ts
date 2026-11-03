// Telefone cru do cadastro (so digitos, com ou sem DDD) no formato de leitura. Qualquer outro formato fica como veio.
export function formatarTelefone(valor?: string | null): string {
  const bruto = `${valor ?? ''}`.trim();
  if (!bruto) return '';
  const d = bruto.replace(/\D/g, '');
  const sem55 = d.length > 11 && d.startsWith('55') ? d.slice(2) : d;
  if (sem55.length === 11) return `(${sem55.slice(0, 2)}) ${sem55.slice(2, 7)}-${sem55.slice(7)}`;
  if (sem55.length === 10) return `(${sem55.slice(0, 2)}) ${sem55.slice(2, 6)}-${sem55.slice(6)}`;
  if (sem55.length === 9) return `${sem55.slice(0, 5)}-${sem55.slice(5)}`;
  if (sem55.length === 8) return `${sem55.slice(0, 4)}-${sem55.slice(4)}`;
  return bruto;
}
