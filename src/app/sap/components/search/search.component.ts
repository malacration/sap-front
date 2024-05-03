import { Component, Input, OnInit } from '@angular/core';
import { Page } from '../../model/page.model';
import { Column } from '../../../shared/components/table/column.model';
import { SearchService } from '../../service/search.service';



@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
})
export class SearchComponent<T> {

  keyword
  loading = false
  resultadoBusca : Page<T> = new Page()

  @Input()
  service : SearchService<T>
  
  @Input()
  definition : Array<Column> = new Array()

  @Input()
  name : string

  changePage($event){
    this.loading = true
    this.service.search($event).subscribe(it => {
      this.resultadoBusca.content.push(...it.content)
      this.resultadoBusca.nextLink = it.nextLink
      this.loading = false
    })
  }

  search($event){
    this.keyword = $event
    this.resultadoBusca.content.splice(0, this.resultadoBusca.content.length)
    this.changePage($event)
  }
}