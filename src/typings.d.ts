/* SystemJS module definition */
declare const nodeModule: NodeModule;
interface NodeModule {
  id: string;
}
interface Window {
  process: any;
  require: any;
}

declare module 'jspdf/dist/jspdf.umd' {
  import jsPDFType from 'jspdf';
  export const jsPDF: typeof jsPDFType;
  export default jsPDFType;
}

// O Chart.js (2.9.4) já vem dentro do admin-lte, então não há dependência nova no
// package.json. Declarado aqui — em vez de entrar como script global no angular.json —
// para o webpack empacotar só no chunk que importa, e porque o CLAUDE.md deste projeto
// pede pra não puxar o JS do AdminLTE direto na página. Mesmo padrão do jspdf.umd acima.
// Sem tipos oficiais: a lib é distribuída como UMD e a 2.x não traz .d.ts.
declare module 'admin-lte/plugins/chart.js/Chart.min.js' {
  const chartJs: any;
  export default chartJs;
}
