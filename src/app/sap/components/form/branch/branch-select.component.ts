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

  branches: Array<Branch> = [];
  opcoes: Array<Option> = [];

  loading = false

  @Output()
  selectedOut = new EventEmitter<Branch>();

  onChange($event){
    const selectedBranch = this.branches.find(branch => branch.bplid === $event);
    this.selectedOut.emit(selectedBranch);
  }

  ngOnInit(): void {
    this.loading = true;
    this.service.get().subscribe(data => {
      this.branches = data;
      this.opcoes = data.map(it => new Option(it.bplid, it.bplname));
      this.loading = false;
    })
  }  
}
