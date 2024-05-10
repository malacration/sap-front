import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { RomaneioFazendaInsumo } from '../../model/romaneio-fazenda-insumo.model';
import { RomaneioPesagem } from '../../model/romaneio-pesagem.model';
import { RomaneioFazendaInsumoService } from '../../service/romaneio-fazenda-insumo.service';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';
import { AlertSerice } from '../../service/alert.service';
import { CowntDown } from '../../../core/cowntdown.module';

@Component({
  selector: 'app-romaneio-fazenda-insumo',
  templateUrl: './romaneio-fazenda-insumo.component.html',
  styleUrls: ['./romaneio-fazenda-insumo.component.scss']
})
export class RomaneioFazendaInsumoComponent {
  
  romaneioPesagem : RomaneioPesagem
  idRomaneioPesagem :string
  draft : RomaneioFazendaInsumo
  tipo: string;
  aguardaCodeReturn : boolean = false
  count = new CowntDown()
  
  constructor(private route: ActivatedRoute,
    private romaneioPesagemService : RomaneioPesagemService,
    private romaneioService : RomaneioFazendaInsumoService,
    private alertService : AlertSerice){
  }
  

  // ngOnInit(): void {
  //   this.route.paramMap.subscribe((params: ParamMap) => {
  //     this.idRomaneioPesagem = params.get('id')
  //     this.romaneioPesagemService.getByid(this.idRomaneioPesagem).subscribe(it => {
  //       this.romaneioPesagem = it[0]
  //     })

  //     this.romaneioService.draft(this.idRomaneioPesagem).subscribe(it => {
  //       this.draft = it
  //     })
      

  //   })
  // }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
        this.idRomaneioPesagem = params.get('id');
        this.romaneioPesagemService.getByid(this.idRomaneioPesagem).subscribe(it => {
            this.romaneioPesagem = it[0];
        });

        this.romaneioService.draft(this.idRomaneioPesagem).subscribe(it => {
            this.draft = it;
        });

        this.tipo = params.get('tipo');
        console.log('ButtonType:', this.tipo);
    });
  }


  criarRomaneio(){
    this.romaneioService.save(this.idRomaneioPesagem,this.tipo).subscribe(it =>{
      this.alertService.info("Romaneio cadastrado com sucesso").then(
        it => {
          this.count.timer(1)
          this.aguardaCodeReturn = true
        }
      )
    })
  }


}
