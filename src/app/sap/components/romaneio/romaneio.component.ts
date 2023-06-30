import { Component, OnInit } from '@angular/core';
import { RomaneioPesagem } from '../../model/romaneio-pesagem.model';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';
import * as moment from 'moment';
import { BusinessPlace } from '../../model/business-place';
import { Filter } from '../../model/filter.model';



@Component({
  selector: 'app-romaneio',
  templateUrl: './romaneio.component.html',
  styleUrls: ['./romaneio.component.scss']
})
export class RomaneioComponent implements OnInit {
  
  date : Date = new Date();
  public romaneiosPesagem : Array<RomaneioPesagem>

  carregando = true
  total = 0;
  size = 20;

  currentPage = 0;
  filtros : Map<string,Filter> = new Map();

  constructor(private romaneioPesagemService : RomaneioPesagemService){
      
  }

  ngOnInit(): void {
    moment(Date()).format('YYYY-MM-DD');
    this.loadPage(this.currentPage);
  }

  businesPlaceFilter(event : BusinessPlace) {
    this.filtros.set('bp',new Filter("bp",event.DefaultVendorID));
    this.loadPage(this.currentPage);
  }

  numberNfFilter(event : number) {
    if(!event)
      this.filtros.delete('nfNum')
    else
      this.filtros.set('nfNum',new Filter("nfNum",event));
    this.loadPage(this.currentPage);
  }

  castDate(entrada) : string{
    return moment(entrada).format('DD/MM/YYYY'); 
  }


  loadPage($event){
    this.currentPage = $event;
    this.carregando = true;
    this.romaneioPesagemService.get(this.currentPage,this.filtros).subscribe(it => {
      this.carregando = false
      this.romaneiosPesagem = it.content;
      this.total = it.totalElements;
      this.size = it.size
    })
  }


}
