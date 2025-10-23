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
