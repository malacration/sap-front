import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

type RouterLinkLike = string | any[];

@Component({
  selector: 'app-sap-link-button',
  templateUrl: './sap-link-button.component.html',
  styleUrls: ['./sap-link-button.component.scss']
})
export class SapLinkButtonComponent {
  @Input() label: string | number = '';
  @Input() copyValue: string | number = null;
  @Input() sapRouterLink: RouterLinkLike = [];
  @Input() queryParams: any = null;
  @Input() disabled = false;
  @Input() buttonClass = 'btn-outline-info';
  @Input() title = 'Abrir em nova aba';
  copiado = false;

  constructor(private router: Router) {}

  abrir() {
    if (this.disabled) return;

    const commands = Array.isArray(this.sapRouterLink) ? this.sapRouterLink : [this.sapRouterLink];
    const tree = this.router.createUrlTree(commands, { queryParams: this.queryParams || undefined });
    const url = this.router.serializeUrl(tree);
    window.open(url, '_blank', 'noopener');
  }

  copiar(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const valor = this.valorParaCopiar;
    if (!valor || this.disabled) return;

    this.copiarTexto(valor).then(() => {
      this.copiado = true;
      setTimeout(() => this.copiado = false, 1500);
    });
  }

  get valorParaCopiar(): string {
    const value = this.copyValue ?? this.label;
    return value === null || value === undefined ? '' : String(value);
  }

  private copiarTexto(valor: string): Promise<void> {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(valor);
    }

    const textarea = document.createElement('textarea');
    textarea.value = valor;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}
