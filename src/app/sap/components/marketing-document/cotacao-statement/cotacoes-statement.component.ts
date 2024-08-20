import { Component, OnInit } from '@angular/core';
import { CotacaoService } from '../../../service/document/cotacao.service';



@Component({
  selector: 'app-marketing-document-cotacao',
  templateUrl: './cotacoes-statement.component.html',
  styleUrls: ['./cotacoes-statement.component.scss']
})
export class CotacoesStatementComponent {
  


  constructor(public cotacaoService : CotacaoService){
    
  }

}
