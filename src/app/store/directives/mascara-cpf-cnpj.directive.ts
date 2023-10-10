import {Directive, ElementRef, HostListener, Input} from '@angular/core';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';

@Directive({
  selector: '[mask]',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: MascaraCpfCnpjDirective,
    multi: true
  }]
})
export class MascaraCpfCnpjDirective implements ControlValueAccessor {
  onTouched: any;
  onChange: any;

  @Input('mask') mask: string;

  cpfMask = '999.999.999-99';
  cnpjMask = '99.999.999/9999-99';
  valor = '';
  pad: string;

  constructor(private element: ElementRef) {
  }

  writeValue(obj: any): void {
    if(!obj) return;
    this.valor = obj;
    this.valor = this.valor.replace(/\D/g, '');
    if (this.valor.length < 12) {
      this.inserirMascara(this.cpfMask);
    } else if (this.valor.length > 11) {
      this.inserirMascara(this.cnpjMask);
    }
    this.element.nativeElement.value = this.valor;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  @HostListener('keyup', ['$event'])
  onKeyup($event: any) {

    this.valor = $event.target.value;
    this.pad = '';
    this.valor = this.valor.replace(/\D/g, '');

    if ($event.keyCode === 8) {
      this.onChange(this.valor);
      return;
    }

    if (this.valor.length < 12) {
      this.inserirMascara(this.cpfMask);
    } else if (this.valor.length > 11) {
      this.inserirMascara(this.cnpjMask);
    }

    if (this.valor.length <= this.pad.length) {
      this.onChange(this.valor);
    }

    if (this.valor.indexOf('_') > -1) {
      this.valor = this.valor.substr(0, this.valor.indexOf('_'));
    }

    $event.target.value = this.valor;
    this.onChange(this.valor);
  }

  @HostListener('blur', ['$event'])
  onBlur($event: any) {
    const tamanho = $event.target.value.length;
      if (tamanho < 15) {
        if (tamanho === this.cpfMask.length) {
          return;
        }
      } else if (tamanho > 14) {
        if (tamanho === this.cnpjMask.length) {
          return;
        }
    }

    this.onChange('');
    $event.target.value = '';
  }

  inserirMascara(mascara: string) {
    let valorMaskPos = 0;
    this.pad = mascara.replace(/\D/g, '').replace(/9/g, '_');
    const valorMask = this.valor + this.pad.substring(0, this.pad.length - this.valor.length);

    this.valor = '';
    for (let i = 0; i < mascara.length; i++) {
      // tslint:disable-next-line:radix
      if (isNaN(parseInt(mascara.charAt(i)))) {
        this.valor += mascara.charAt(i);
      } else {
        this.valor += valorMask[valorMaskPos++];
      }
    }
  }

}
