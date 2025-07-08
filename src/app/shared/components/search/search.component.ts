import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Column } from '../../../shared/components/table/column.model';
import { Page } from '../../../sap/model/page.model';
import { SearchService } from '../../../sap/service/search.service';
import { ModalSelectComponent } from '../modal/select/modal.select.component';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
})
export class SearchComponent<T> {
  @ViewChild('modal', { static: true }) modalSelect: ModalSelectComponent;

  keyword;
  loading = false;
  resultadoBusca: Page<T> = new Page();

  @Input()
  service: SearchService<T>;

  @Input()
  definition: Array<Column> = new Array();

  @Input()
  name: string;

  @Output()
  contentSelected = new EventEmitter();

  changePageService($event) {
    this.loading = true;
    this.service.search($event).subscribe((it) => {
      this.resultadoBusca.content.push(...it.content);
      this.resultadoBusca.nextLink = it.nextLink;
      this.loading = false;
    });
  }

  searchService($event) {
    this.keyword = $event;
    this.resultadoBusca.content.splice(0, this.resultadoBusca.content.length);
    this.changePageService($event);
  }

  contentSelectedFun($event) {
    this.contentSelected.emit($event);
  }

  clear() {
    this.modalSelect.clear();
  }
}
