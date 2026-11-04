import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Referencia } from '../../../model/business-partner/business-partner';

@Component({
    selector: 'app-referencia-comercial',
    templateUrl: './referencia.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ReferenciaComponent {

  @Input()
  referencia : Referencia

  ngOnInit(): void {

  }

}
