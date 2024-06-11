import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-currency-input',
  templateUrl: './currency-input.component.html',
  styleUrls: ['./currency-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputComponent),
      multi: true
    }
  ]
})
export class CurrencyInputComponent implements ControlValueAccessor {
  @Input() placeholder: string = '';
  private _value: string = '';
  private hasFocus: boolean = false;
  private firstFocus: boolean = true;

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = val;
    this.onChange(this.parseValue(val));
    this.onTouched();
  }

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    if (value !== undefined) {
      this._value = this.formatValue(value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  handleInput(event: any): void {
    if(this.firstFocus){
      this._value = ''
      this.firstFocus = false
    }
    let input = event.target.value;

    // Remove caracteres que não sejam dígitos
    input = input.replace(/[^0-9]/g, '');

    if (input.length > 0) {
      // Adiciona as casas decimais
      input = (parseInt(input, 10) / 100).toFixed(2).replace('.', ',');
    } else {
      input = '0,00';
    }

    // Atualiza o valor
    this._value = input;
    this.onChange(this.parseValue(input));
  }

  handleBlur(): void {
    this._value = this.formatValue(this.parseValue(this._value));
    this.hasFocus = false;
  }

  handleFocus(): void {
    if (!this.hasFocus) {
      this.firstFocus = true
      this.hasFocus = true;
    }
  }

  private formatValue(value: number): string {
    if (!value) return '0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private parseValue(value: string): number {
    return parseFloat(value.replace(',', '.'));
  }
}