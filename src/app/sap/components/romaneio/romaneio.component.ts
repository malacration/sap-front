import { Component, Output } from '@angular/core';
import { RomaneioPesagem } from '../../model/romaneio-pesagem.model';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';

@Component({
  selector: 'app-romaneio',
  templateUrl: './romaneio.component.html',
  styleUrls: ['./romaneio.component.scss']
})
export class RomaneioComponent {

  public romaneiosPesagem : Array<RomaneioPesagem>

  carregando = true


  currentPage = 0

  constructor(private romaneioPesagemService : RomaneioPesagemService){
    this.romaneioPesagemService.get().subscribe(it => {
      this.carregando = false
      this.romaneiosPesagem = it;
    })
  }


}
