import { DocumentLines, FutureDeliverySales } from './future-delivery-sales';

// A data de emissao e um dia de calendario, sem hora: nao pode variar com o fuso do navegador.
describe('formattedDocDate', () => {
  const datas = [
    ['meia-noite UTC', '2026-11-09T00:00:00Z', '09/11/2026'],
    ['so a data', '2026-11-09', '09/11/2026'],
  ];

  datas.forEach(([nome, entrada, esperado]) => {
    it(`FutureDeliverySales mostra ${esperado} (${nome})`, () => {
      const doc = Object.assign(new FutureDeliverySales(), { DocDate: entrada });
      expect(doc.formattedDocDate).toBe(esperado);
    });

    it(`DocumentLines mostra ${esperado} (${nome})`, () => {
      const linha = Object.assign(new DocumentLines(), { DocDate: entrada });
      expect(linha.formattedDocDate).toBe(esperado);
    });
  });
});
