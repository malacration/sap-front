import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { defineLocale } from 'ngx-bootstrap/chronos';
import { BsDatepickerConfig, BsLocaleService } from 'ngx-bootstrap/datepicker';
import { ptBrLocale } from 'ngx-bootstrap/locale';

// O LOCALE_ID do Angular nao chega ao ngx-bootstrap, que tem locale proprio.
defineLocale('pt-br', ptBrLocale);

/**
 * Campo de data padrao do projeto: bsDatepicker em pt-BR.
 *
 * Fala **string ISO** com o formulario (`YYYY-MM-DD`, ou `YYYY-MM-DDTHH:mm:00`
 * com `hora`), o mesmo que o `<input type="date">` nativo que ele substitui -
 * assim as telas trocam so a tag, sem mexer na logica.
 */
@Component({
  selector: 'app-campo-data',
  templateUrl: './campo-data.component.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CampoDataComponent), multi: true },
  ],
})
export class CampoDataComponent implements ControlValueAccessor {
  @Input() inputId?: string;
  @Input() placeholder?: string;
  @Input() invalido = false;

  /** Data e hora (parametro `datetime` dos relatorios). */
  @Input()
  set hora(valor: boolean) {
    this.comHora = !!valor;
    this.config = this.montarConfig();
    if (this.valor) this.ultimo = this.paraIso(this.valor);
  }

  get hora(): boolean {
    return this.comHora;
  }

  valor: Date | null = null;
  desabilitado = false;
  config: Partial<BsDatepickerConfig>;

  private comHora = false;
  /** Ultimo valor visto pelo formulario - o bsDatepicker reemite o que recebe. */
  private ultimo: string | null = null;
  private onChange: (valor: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(localeService: BsLocaleService) {
    localeService.use('pt-br');
    this.config = this.montarConfig();
  }

  get textoPlaceholder(): string {
    return this.placeholder ?? (this.comHora ? 'DD/MM/AAAA HH:mm' : 'DD/MM/AAAA');
  }

  writeValue(valor: unknown): void {
    this.valor = this.paraData(valor);
    this.ultimo = this.valor ? this.paraIso(this.valor) : null;
  }

  registerOnChange(fn: (valor: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado = desabilitado;
  }

  aoMudar(data: Date | null | undefined): void {
    const iso = data instanceof Date && !Number.isNaN(data.getTime()) ? this.paraIso(data) : null;
    this.valor = iso ? data! : null;
    if (iso === this.ultimo) return;
    this.ultimo = iso;
    this.onChange(iso);
  }

  limpar(): void {
    this.aoMudar(null);
    this.onTouched();
  }

  tocado(): void {
    this.onTouched();
  }

  private montarConfig(): Partial<BsDatepickerConfig> {
    return {
      dateInputFormat: this.comHora ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY',
      containerClass: 'theme-green',
      showWeekNumbers: false,
      adaptivePosition: true,
      withTimepicker: this.comHora,
      keepDatepickerOpened: this.comHora,
    };
  }

  /** `YYYY-MM-DD` e lido em horario LOCAL: `new Date('YYYY-MM-DD')` e UTC e voltaria um dia no Brasil. */
  private paraData(valor: unknown): Date | null {
    if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
    if (typeof valor !== 'string' || !valor) return null;
    const partes = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(valor);
    if (!partes) return null;
    const [, a, m, d, h, min, s] = partes;
    const data = this.comHora
      ? new Date(+a, +m - 1, +d, +(h || 0), +(min || 0), +(s || 0))
      : new Date(+a, +m - 1, +d);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  private paraIso(data: Date): string {
    const dia = `${data.getFullYear()}-${this.dois(data.getMonth() + 1)}-${this.dois(data.getDate())}`;
    return this.comHora ? `${dia}T${this.dois(data.getHours())}:${this.dois(data.getMinutes())}:00` : dia;
  }

  private dois(valor: number): string {
    return valor < 10 ? `0${valor}` : String(valor);
  }
}
