import {
  Directive,
  ElementRef,
  HostListener,
  Renderer2,
  forwardRef
} from '@angular/core';
import { formatCurrency } from '@angular/common';
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor
} from '@angular/forms';

@Directive({
  selector: '[app-currency]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyDirective),
      multi: true
    }
  ]
})
export class CurrencyDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  parseToFloat(rawValue : string){
    return parseFloat(rawValue.replace(',', '.').replace("R$",""));
  }

  @HostListener('keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    const inputEl = event.target as HTMLInputElement;
    const rawValue = inputEl.value;
    const numericValue = this.parseToFloat(rawValue)
    this.onChange(!isNaN(numericValue) ? numericValue : 0.0);
  }

  @HostListener('blur')
  onBlur(): void {
    let value = this.el.nativeElement.value;
    if (!value) {
      this.onChange(0.0);
      return;
    }

    value = this.parseToFloat(value);
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      this.onChange(numericValue);
      let rangeDecimal = "1.2-"+Math.max(numericValue.toString().length,2)
      this.renderer.setProperty(this.el.nativeElement, 'value', formatCurrency(value, 'pt', 'R$',undefined,rangeDecimal));
    } else {
      this.onChange(null);
      this.renderer.setProperty(this.el.nativeElement, 'value', '');
    }
  }

  writeValue(value: any): void {
    if(value != undefined) {
      this.renderer.setProperty(this.el.nativeElement, 'value', value);
    }else{
      this.renderer.setProperty(this.el.nativeElement, 'value',0.0);
    }
  }

  // Metodos do ControlValueAccessor
  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}