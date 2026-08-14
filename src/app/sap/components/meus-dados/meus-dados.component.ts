import { Component, OnInit } from '@angular/core';
import { UsuarioAtualService } from '../../../modulos/sap-shared/_services/usuario-atual.service';
import { AlertService } from '../../../shared/service/alert.service';
import { UsuarioAtual } from '../../model/usuario-atual';

@Component({
  selector: 'app-meus-dados',
  templateUrl: './meus-dados.component.html',
})
export class MeusDadosComponent implements OnInit {

  loading = false
  usuario : UsuarioAtual = null

  constructor(private service : UsuarioAtualService, private alert : AlertService){
  }

  ngOnInit(): void {
    this.loading = true
    this.service.get().subscribe({
      next : (it) => { this.usuario = it; this.loading = false },
      error : (e) => {
        this.loading = false
        this.alert.error(e?.error?.message || 'Não foi possível carregar seus dados')
      }
    })
  }
}
