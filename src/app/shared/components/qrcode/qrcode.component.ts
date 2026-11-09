import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-qrcode',
    templateUrl: './qrcode.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class QrcodeComponent {
  @Input()
  value: string = '';

  @Input()
  size = 160;

  @Input()
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M';

  @Input()
  elementType: 'url' | 'canvas' | 'svg' = 'canvas';
}
