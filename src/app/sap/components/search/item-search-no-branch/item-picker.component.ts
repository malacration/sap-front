import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ItemService } from '../../../service/item.service';
import { Item } from '../../../model/item';
import { SearchService } from '../../../service/search.service';
import { Observable } from 'rxjs';
import { Page } from '../../../model/page.model';
import { SearchComponent } from '../../../../shared/components/search/search.component';
import { Column } from '../../../../shared/components/table/column.model';

@Component({
  selector: 'app-item-picker',
  templateUrl: './item-picker.component.html',
})
export class ItemPickerComponent implements OnInit {
  @ViewChild('search', { static: true }) search: SearchComponent<Item>;

  getDefinition() {
    return [
      new Column('Codigo do Item', 'ItemCode'),
      new Column('Nome', 'ItemDescription'),
      new Column('Preço', 'unitPriceBrl'),
    ];
  }

  @Input()
  title;

  service: ItemServiceBanch;
  @Output()
  contentSelected = new EventEmitter();

  constructor(private itemService: ItemService) {}

  ngOnInit(): void {
    this.service = new ItemServiceBanch(this.itemService);
  }

  contentSelectedFun($event) {
    this.contentSelected.emit($event);
  }
}

class ItemServiceBanch implements SearchService<Item> {
  constructor(private service: ItemService) {}

  search($event: any): Observable<Page<Item>> {
    return this.service.searchItem($event);
  }
}
