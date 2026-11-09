import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-tab',
    templateUrl: './tab.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TabComponent {
  @Input() tabTitle: string = '';
  @Input() active: boolean = false;
}