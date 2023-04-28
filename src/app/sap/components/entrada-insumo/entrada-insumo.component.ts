import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { RomaneioEntradaInsumo } from '../../model/romaneio-entrada-insumo.model';
import { RomaneioPesagem } from '../../model/romaneio-pesagem.model';
import { RomaneioEntradaInsumoService } from '../../service/romaneio-entrada-insumo.service';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';

@Component({
  selector: 'app-entrada-insumo',
  templateUrl: './entrada-insumo.component.html',
  styleUrls: ['./entrada-insumo.component.scss']
})
export class EntradaInsumoComponent {
  
  romaneioPesagem : RomaneioPesagem
  idRomaneioPesagem :string
  draft : RomaneioEntradaInsumo
  
  constructor(private route: ActivatedRoute,
    private romaneioPesagemService : RomaneioPesagemService,
    private romaneioService : RomaneioEntradaInsumoService){
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.idRomaneioPesagem = params.get('id')
      this.romaneioPesagemService.getByid(this.idRomaneioPesagem).subscribe(it => {
        this.romaneioPesagem = it[0]
      })

      this.romaneioService.draft(this.idRomaneioPesagem).subscribe(it => {
        this.draft = it
      })

    })
  }

  criarRomaneio(){
    this.romaneioService.save(this.idRomaneioPesagem).subscribe(it =>{
      alert("Romaneio cadastrado com sucesso")
      console.log(it)
    })
  }

  

}
