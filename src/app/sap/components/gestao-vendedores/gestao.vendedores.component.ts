import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';
import { AlertSerice } from '../../service/alert.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-gestao-vendedores',
  templateUrl: './gestao.vendedores.component.html',
  styleUrls: ['./gestao.vendedores.component.scss'],
})
export class GestaoVendedoresComponent implements OnInit {

  originSalesPerson: any;
  destinationSalesPerson: any;
  idGestaoVendedores :string
  loading = false;
  

  constructor(private salesPersonService: SalesPersonService,
    private alertService : AlertSerice,
    private router : Router

  ) { }

  ngOnInit(): void { }

  selectOriginSalesPerson($event) {
    this.originSalesPerson = $event;
  }

  selectDestinationSalesPerson($event) {
    this.destinationSalesPerson = $event;
  }

  isFormValid(): boolean {
    return this.originSalesPerson && this.originSalesPerson.SalesEmployeeCode 
        && this.destinationSalesPerson && this.destinationSalesPerson.SalesEmployeeCode;
  }


  sendOrder() {
    if (this.originSalesPerson && this.originSalesPerson.SalesEmployeeCode && 
        this.destinationSalesPerson && this.destinationSalesPerson.SalesEmployeeCode) {
      this.loading = true;
  
      this.salesPersonService.replaceSalesPerson(this.originSalesPerson.SalesEmployeeCode, this.destinationSalesPerson.SalesEmployeeCode)
        .subscribe(
          (response) => {
            this.concluirEnvio();
          },
          (error) => {
            console.error('Erro ao realizar a troca:', error);
            this.loading = false;
          }
        );
    } else {
      console.error('originSalesPerson ou destinationSalesPerson não estão definidos corretamente.');
    }
  }
  
  concluirEnvio(){
    this.alertService.info("Seu pedido foi Enviado").then(() => {
      this.loading = false
      this.limparFormulario()
    })
  }

  limparFormulario(){
    this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true }).then(() => {
      this.router.navigate(['gestao-vendedores']);
    });
  }
}
