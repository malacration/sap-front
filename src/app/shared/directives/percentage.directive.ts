import {
  Directive,
  ElementRef,
  HostListener,
  Renderer2,
  forwardRef
} from '@angular/core';
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor
} from '@angular/forms';

@Directive({
  selector: '[app-percentage]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PercentageDirective),
      multi: true
    }
  ]
})
export class PercentageDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  /**
   * Ao digitar, NÃO reescrevemos o valor do input.
   * Só tentamos converter para número e chamamos onChange (FormControl).
   */
  @HostListener('input', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    const inputEl = event.target as HTMLInputElement;
    const rawValue = inputEl.value;

    // Converte vírgula em ponto só para parse (mas não altera o input visível)
    const numericValue = parseFloat(rawValue.replace(',', '.'));

    // Se válido, emite o valor / 100 para o FormControl. Ex: "12,5" => 0.125
    this.onChange(!isNaN(numericValue) ? numericValue / 100 : null);
  }

  /**
   * Ao perder o foco, formatamos DE FATO o campo: convertemos vírgula em ponto,
   * calculamos fração e exibimos "valor%".
   */
  @HostListener('blur')
  onBlur(): void {
    let value = this.el.nativeElement.value;

    if (!value) {
      // Se vazio, emitir null e limpar
      this.onChange(null);
      return;
    }

    // Converte vírgula em ponto
    value = value.replace(',', '.');

    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      const fractionValue = numericValue / 100;
      // Emite o valor final como fração
      this.onChange(fractionValue);

      // Exemplo de formatação final: "12.5%"
      this.renderer.setProperty(this.el.nativeElement, 'value', numericValue + '%');
    } else {
      // Se não conseguiu parsear, limpa
      this.onChange(0);
      this.renderer.setProperty(this.el.nativeElement, 'value', '0%');
    }
  }

  /**
   * Quando o FormControl define um valor programaticamente (writeValue),
   * formatamos no input.
   */
  writeValue(value: any): void {
    if (value != null && !isNaN(value)) {
      // Ex.: se "value" é 0.123, exibimos "12.3%"
      this.renderer.setProperty(
        this.el.nativeElement,
        'value',
        (value * 100) + '%'
      );
    } else if(value != undefined) {
      this.renderer.setProperty(this.el.nativeElement, 'value', value);
    }else{
      this.renderer.setProperty(this.el.nativeElement, 'value',0);
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