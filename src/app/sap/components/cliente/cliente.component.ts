import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { BusinessPartnerDefinition } from '../../model/business-partner/business-partner-definition';
import { concatMap, delay, from, of } from 'rxjs';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { ActionReturn } from '../../../shared/components/action/action.model';




@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.component.html',
})
export class ClienteComponent implements OnInit {

  keyWord = ""

  resultadoBusca : Array<BusinessPartner> = new Array()
  carregadoBusca = false
  definition = new BusinessPartnerDefinition().getDefinition();
  
  businesPartnerSelected : BusinessPartner = null

  ngOnInit(): void {
  }
    
  @ViewChild('buscaCliente', {static: true}) buscaClienteComponent: ModalComponent;

  buscar(){
    this.buscaClienteComponent.openModal()
    this.carregadoBusca = true
    
    let windson = new BusinessPartner();
    windson.CardName = "Windson"
    windson.CardCode = "666"
    
    let jose = new BusinessPartner();
    jose.CardName = "Jose Bruno"
    jose.CardCode = "666"

    const myArray = [
      windson,
      jose
    ];
    from(myArray).pipe( delay( 500 ) ).subscribe( timedItem => {
          this.resultadoBusca = myArray
          this.carregadoBusca = false
        });
  }

  action(action : ActionReturn){
    console.log(action.data)
    if(action.type == 'selected'){
      this.businesPartnerSelected = action.data
    }
  }

}
