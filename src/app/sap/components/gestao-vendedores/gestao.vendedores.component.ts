import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';

@Component({
  selector: 'app-gestao-vendedores',
  templateUrl: './gestao.vendedores.component.html',
  styleUrls: ['./gestao.vendedores.component.scss'],
})
export class GestaoVendedoresComponent implements OnInit {

  salesPerson

  constructor(private salesPersonService : SalesPersonService){
  }
  
  ngOnInit(): void {
    
  }


  selectSp($event){
    this.salesPerson = $event
    this.salesPersonService.get(this.salesPerson.SlpCode).subscribe(it =>{
        this.salesPerson = it
    })
  }
}