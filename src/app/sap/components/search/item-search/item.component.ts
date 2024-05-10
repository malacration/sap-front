import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ItemService } from '../../../service/item.service';
import { Item } from '../../../model/item';
import { SearchService } from '../../../service/search.service';
import { Observable } from 'rxjs';
import { Page } from '../../../model/page.model';
import { SearchComponent } from '../../../../shared/components/search/search.component';




@Component({
  selector: 'app-item-search',
  templateUrl: './item-search.component.html',
})
export class ItemSearchComponent implements OnInit {


  @ViewChild('search', {static: true}) search: SearchComponent<Item>;


  definition = new Item().getDefinition()  
  @Input()
  branchId
  service : ItemServiceBanch
  @Output() 
  contentSelected = new EventEmitter();

  constructor(private itemService : ItemService){

  }

  ngOnInit(): void {
    this.service = new ItemServiceBanch(this.itemService,this.branchId)
  }

  contentSelectedFun($event){
    this.contentSelected.emit($event)
    this.search.clear()
  }
}

class ItemServiceBanch implements SearchService<Item> {
  
  constructor(private service : ItemService, private branchId){
  }

  search($event: any): Observable<Page<Item>> {
    return this.service.search($event,this.branchId)
  }
}
