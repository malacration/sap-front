import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Option } from '../../../model/form/option';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { BusinessPartner } from '../../../model/business-partner/business-partner';


@Component({
  selector: 'app-localidade-select',
  templateUrl: './localidade-select.component.html'
})
export class LocalidadeSelectComponent implements OnInit {

  constructor(private service : BusinessPartnerService){
      
  }

  @Input()
  selected : string = null

  localidades: Array<BusinessPartner> = [];
  opcoes: Array<Option> = [];

  loading = false

  @Output()
  selectedOut = new EventEmitter<BusinessPartner>();

  onChange($event){
    this.selectedOut.emit($event)
  }

  ngOnInit(): void {
    this.loading = true;
    this.service.getSearchLocalidades().subscribe(data => {
      this.localidades = data;
      this.opcoes = data.map(it => new Option(it, `${it.U_Localidade} - ${it.Name}`));
      this.loading = false;
    })
  }  
}
