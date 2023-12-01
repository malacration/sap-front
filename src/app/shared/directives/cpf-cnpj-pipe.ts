import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cpfCnpj'
})
export class CpfCnpjPipe implements PipeTransform {
  transform(value: string, args?: any): any {
    if (value) {
      value = value.replace(/\D/g, '');

      if (value.length > 14) {
        value = value.substring(0, 14);
      }

      switch (value.length) {
        case 4:
          value = value.replace(/(\d{3})(\d+)/, '$1.$2');
          break;
        case 5:
          value = value.replace(/(\d{3})(\d+)/, '$1.$2');
          break;
        case 6:
          value = value.replace(/(\d{3})(\d+)/, '$1.$2');
          break;
        case 7:
          value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
          break;
        case 8:
          value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
          break;
        case 9:
          value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
          break;
        case 10:
          value = value.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
          break;
        case 11:
          value = value.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
          break;
        case 12:
          value = value.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
          break;
        case 13:
        case 14:
          value = value.replace(
            /(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/,
            '$1.$2.$3/$4-$5'
          );
          break;
        default:
          return value;
      }
    }
    return value;
  }
}