import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, OnDestroy } from '@angular/core';

interface ToastOptions { timeOut?: number; }
interface ToastEntry { toastId: number; element: HTMLElement; timer?: ReturnType<typeof setTimeout>; signature: string; }

/** Notifications independent of the ComponentFactoryResolver API removed in Angular 22. */
@Injectable({ providedIn: 'root' })
export class ToastrService implements OnDestroy {
  private container?: HTMLElement;
  private nextId = 0;
  private readonly entries = new Map<number, ToastEntry>();
  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  success(message = '', title = '', options: ToastOptions = {}) { return this.show('success', message, title, options); }
  info(message = '', title = '', options: ToastOptions = {}) { return this.show('info', message, title, options); }
  warning(message = '', title = '', options: ToastOptions = {}) { return this.show('warning', message, title, options); }
  error(message = '', title = '', options: ToastOptions = {}) { return this.show('danger', message, title, options); }

  private show(kind: string, message: string, title: string, options: ToastOptions) {
    const signature = JSON.stringify([kind, message, title]);
    const duplicate = [...this.entries.values()].find(entry => entry.signature === signature);
    if (duplicate) return { toastId: duplicate.toastId };
    if (!this.container) {
      this.container = this.document.createElement('div');
      this.container.className = 'app-toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;width:340px;max-width:calc(100vw - 32px);pointer-events:none';
      this.document.body.appendChild(this.container);
    }
    const element = this.document.createElement('div');
    element.className = `alert alert-${kind} shadow`;
    element.setAttribute('role', kind === 'danger' ? 'alert' : 'status');
    element.style.cssText = 'pointer-events:auto;white-space:pre-line;overflow-wrap:anywhere';
    const id = ++this.nextId;
    const close = this.document.createElement('button');
    close.type = 'button'; close.className = 'close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Fechar notificação');
    close.onclick = () => this.remove(id);
    element.appendChild(close);
    if (title) {
      const heading = this.document.createElement('strong');
      heading.textContent = title; heading.style.display = 'block'; element.appendChild(heading);
    }
    element.appendChild(this.document.createTextNode(message));
    this.container.appendChild(element);
    const entry: ToastEntry = { toastId: id, element, signature };
    const timeout = options.timeOut ?? 3000;
    if (timeout > 0) entry.timer = setTimeout(() => this.remove(id), timeout);
    this.entries.set(id, entry);
    return { toastId: id };
  }

  remove(id: number): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    clearTimeout(entry.timer); entry.element.remove(); this.entries.delete(id);
    if (!this.entries.size) { this.container?.remove(); this.container = undefined; }
    return true;
  }
  clear(id?: number): void {
    if (id !== undefined) this.remove(id);
    else [...this.entries.keys()].forEach(key => this.remove(key));
  }
  ngOnDestroy(): void { this.clear(); }
}
