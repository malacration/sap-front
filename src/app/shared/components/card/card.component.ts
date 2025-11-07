import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  private _collapsed = false;

  @Input() title: string | null = null;
  @Input() cardClass = 'card-primary';
  @Input() collapsible = false;

  @Input()
  set collapsed(value: boolean | string | null | undefined) {
    this._collapsed = this.toBoolean(value);
  }

  get collapsed(): boolean {
    return this._collapsed;
  }

  @Output() collapsedChange = new EventEmitter<boolean>();

  toggleCollapse(): void {
    if (!this.collapsible) {
      return;
    }

    this._collapsed = !this._collapsed;
    this.collapsedChange.emit(this._collapsed);
  }

  private toBoolean(value: boolean | string | null | undefined): boolean {
    if (value === '' || value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value !== 'false';
    }

    return value;
  }

  hasHeader(){
    return this.title || this.collapsible
  }

  hasTools(){
    return this.collapsible
  }
}
