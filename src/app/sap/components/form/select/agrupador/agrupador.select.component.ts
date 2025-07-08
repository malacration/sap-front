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
  selector: 'app-group-by-select',
  templateUrl: './agrupador.select.component.html',
})
export class GroupBySelectComponent implements OnInit {
  @Input()
  selected: string = null;

  opcoes: Option[] = [
    new Option('Sem', 'Sem Agrupador'),
    new Option('cliente', 'Cliente'),
    new Option('vendedor', 'Vendedor'),
    new Option('item', 'Item'),
  ];

  loading = false;

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event) {
    this.selectedOut.emit($event);
  }

  ngOnInit(): void {}
}
