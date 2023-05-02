import { Component, OnInit, Output } from '@angular/core';
import { RomaneioPesagem } from '../../model/romaneio-pesagem.model';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';

@Component({
  selector: 'app-romaneio',
  templateUrl: './romaneio.component.html',
  styleUrls: ['./romaneio.component.scss']
})
export class RomaneioComponent implements OnInit {

  public romaneiosPesagem : Array<RomaneioPesagem>

  carregando = true
  total = 0;
  size = 20;

  constructor(private romaneioPesagemService : RomaneioPesagemService){
      
  }

  ngOnInit(): void {
    this.loadPage(1);
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
