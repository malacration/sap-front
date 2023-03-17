import { Component } from '@angular/core';
import { RomaneioPesagem } from '../../model/romaneio-pesagem.model';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';

@Component({
  selector: 'app-romaneio',
  templateUrl: './romaneio.component.html',
  styleUrls: ['./romaneio.component.scss']
})
export class RomaneioComponent {

  public romaneiosPesagem : Array<RomaneioPesagem>

  constructor(private romaneioPesagemService : RomaneioPesagemService){
    this.romaneioPesagemService.get().subscribe(it => {
      this.romaneiosPesagem = it;
    })
    
  }


}
