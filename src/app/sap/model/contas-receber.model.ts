export class ContaReceber {
  TransId: number;
  Ref1: string;
  RefDate: string;
  DueDate: string;
  Debit: number;
  Credit: number;
  LineMemo: string;
  BPLName: string;
  TransType: number;
  documento:string;

  // formatar data dd/MM/yyyy
  get refDateFormat(): string {
    return this.formatDate(this.RefDate);
  }

  get dueDateFormat(): string {
    return this.formatDate(this.DueDate);
  }

  // valor consolidado (só exibe se > 0)
  get total(): number {
    if (this.Debit && this.Debit > 0) {
      return this.Debit;
    } else if (this.Credit && this.Credit > 0) {
      return this.Credit * -1;  // crédito vira negativo
    }
    return 0;
  }

  // valor formatado em moeda brasileira
  get totalCurrency(): string {
    const valor = this.total ?? 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private formatDate(value: string): string {
    if (!value) return '';
    // Ex: 20240311 → 11/03/2024
    const year = value.substring(0, 4);
    const month = value.substring(4, 6);
    const day = value.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
}
