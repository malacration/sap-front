import { Component, Input } from '@angular/core';
import { Referencia } from '../../../model/business-partner/business-partner';

@Component({
  selector: 'app-referencia-comercial',
  templateUrl: './referencia.component.html',
})
export class ReferenciaComponent {

  @Input()
  referencia : Referencia

  ngOnInit(): void {

  }

}
