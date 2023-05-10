import { Component, OnInit, Output } from '@angular/core';
import { RomaneioPesagem } from '../../model/romaneio-pesagem.model';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';
import * as moment from 'moment';



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

  constructor(private romaneioPesagemService : RomaneioPesagemService){
      
  }

  ngOnInit(): void {
    moment(Date()).format('YYYY-MM-DD');
    this.loadPage(1);
  }


  castDate(entrada) : string{
    return moment(entrada).format('DD/MM/YYYY'); 
  }


  loadPage($event){
    this.carregando = true;
    this.romaneioPesagemService.get($event).subscribe(it => {
      this.carregando = false
      this.romaneiosPesagem = it.content;
      this.total = it.totalElements;
      this.size = it.size
    })
  }


}
