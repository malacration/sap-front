import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

type LteColor =
  | 'primary' | 'secondary' | 'success' | 'info'
  | 'warning' | 'danger' | 'light' | 'dark';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  // faz o componente ocupar toda a largura do container
  @HostBinding('style.display') hostDisplay = 'block';
  @HostBinding('style.width.%') hostWidth = 100;

  /** Tamanho total (denominador) */
  @Input() total: number | string = 100;

  /** Progresso atual (numerador) */
  @Input() current: number | string = 0;

  /** Cor AdminLTE/Bootstrap */
  @Input() color: LteColor = 'primary';

  /** Altura da barra (ex.: '1rem', '8px') */
  @Input() height: string = '1.6rem';

  /** Mostrar texto percentual */
  @Input() showText = true;

  /** Listrado por padrão (necessário para animação visual) */
  @Input() striped = true;

  /** Animado por padrão */
  @Input() animated = true;

  /** Mostrar "current/total" abaixo */
  @Input() showCounter = false;

  /** Percentual (0–100, clamp) */
  get percent(): number {
    const t = this.toNumber(this.total);
    const c = this.toNumber(this.current);
    if (t <= 0) return c > 0 ? 100 : 0;

    const raw = (c / t) * 100;
    const clamped = Math.max(0, Math.min(100, raw));
    return Math.round(clamped * 10) / 10;
  }

  get progressBarClasses(): string[] {
    const classes = ['progress-bar', `bg-${this.color}`];
    if (this.striped) classes.push('progress-bar-striped');
    if (this.animated) classes.push('progress-bar-animated');
    return classes;
  }

  private toNumber(v: number | string): number {
    if (typeof v === 'number') return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
}
