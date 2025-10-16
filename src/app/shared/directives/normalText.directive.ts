import {
  Directive,
  ElementRef,
  Renderer2,
  HostListener,
  forwardRef
} from '@angular/core';
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor
} from '@angular/forms';

@Directive({
  selector: '[normalText]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NormalTextDirective),
      multi: true
    }
  ]
})
export class NormalTextDirective implements ControlValueAccessor {
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('input', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    const inputEl = event.target as HTMLInputElement;
    const rawValue = inputEl.value;
    const newVal = Number.isFinite(Number(rawValue)) ? Number(rawValue) : rawValue;
    this.onChange(newVal);
  }

  writeValue(value: any): void {
    this.renderer.setProperty(this.el.nativeElement, 'value', value)
  }

  // Metodos do ControlValueAccessor
  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
