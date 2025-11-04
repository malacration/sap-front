import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Option } from '../../../../model/form/option';

@Component({
  selector: 'app-incoterms-select',
  templateUrl: './incoterms.select.component.html',
})
export class IncotermsSelectComponent implements OnInit {
  @Input()
  selected: string = null;

  opcoes: Option[] = [
    new Option('%', 'Todos'),
    new Option('0', '0 - Por conta do emitente'),
    new Option('1', '1 - Por conta do destinatario'),
    new Option('9', '9 - Sem Frete')
  ];

  loading = false;

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event) {
    this.selectedOut.emit($event);
  }

  ngOnInit(): void {}
}
