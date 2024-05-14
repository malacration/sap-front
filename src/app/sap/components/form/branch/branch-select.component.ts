import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Option } from '../../../model/form/option';
import { BranchService } from '../../../service/branch.service';
import { Branch } from '../../../model/branch';


@Component({
  selector: 'app-branch-select',
  templateUrl: './branch-select.component.html'
})
export class BranchSelectComponent implements OnInit {

  constructor(private service : BranchService){
      
  }

  @Input()
  selected : string = null

  opcoes : Array<Option>

  loading = false

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event){
    this.selectedOut.emit($event)
  }

  ngOnInit(): void {
    this.loading = true;
    this.service.get().subscribe( data =>{
      console.log(data)
      this.opcoes = data.map(it => new Option(it.bplid,it.bplname))
      this.loading = false;
      console.log(this.opcoes)
    })
  }  
}
