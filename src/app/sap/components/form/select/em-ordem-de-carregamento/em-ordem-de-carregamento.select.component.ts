import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Option } from '../../../../model/form/option';

@Component({
  selector: 'app-em-ordem-de-carregamento-select',
  templateUrl: './em-ordem-de-carregamento.select.component.html',
})
export class EmOrdemDeCarregamentoSelectComponent implements OnInit {
  @Input()
  selected: string | null = null;

  // Se quiser manter exatamente como está hoje:
  opcoes: Option[] = [
    new Option('Todos', 'Todos'),
    new Option('Sim', 'Sim'),
    new Option('Não', 'Não'),
  ];

  loading = false;

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange(value: string) {
    this.selectedOut.emit(value);
  }

  ngOnInit(): void {}
}
