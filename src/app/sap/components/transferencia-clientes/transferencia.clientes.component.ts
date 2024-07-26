import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';
import { AlertSerice } from '../../service/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-transferencia-clientes',
  templateUrl: './transferencia.clientes.component.html',
  styleUrls: ['./transferencia.clientes.component.scss']
})
export class TransferenciaClientesComponent implements OnInit {
  originSalesPerson: any;
  destinationSalesPerson: any;
  loading = false;
  searchOrigin = '';
  searchDestination = '';
  baseOriginList: any[] = [];
  originList: any[] = [];
  baseDestinationList: any[] = [];
  destinationList: any[] = [];
  transferredItems: any[] = [];
  totalOriginItems = 0;
  size = 20;
  currentPage = 0;
  initialTotalOriginItems = 0;
  isButtonDisabled = false;

  constructor(
    private salesPersonService: SalesPersonService,
    private alertService: AlertSerice,
    private router: Router
  ) {}

  ngOnInit(): void {}

  selectOriginSalesPerson($event: any): void {
    this.originSalesPerson = $event;
    this.loadClientesVendedor(0);
  }

  selectDestinationSalesPerson($event: any): void {
    if (this.originSalesPerson == null) {
      this.alertService.error('Você deve selecionar um vendedor de origem primeiro.');
      this.limparFormulario();
      return;
    }

    if ($event.SalesEmployeeCode === -1) {
      this.alertService.error('O vendedor de destino não pode ser "- Nenhum vendedor -".');
      this.limparFormulario();
      return;
    }
    this.destinationSalesPerson = $event;
  }

  isFormValid(): boolean {
    return !!this.originSalesPerson?.SalesEmployeeCode &&
      !!this.destinationSalesPerson?.SalesEmployeeCode;
  }

  loadClientesVendedor(page: number): void {
    this.currentPage = page;
    this.loading = true;
    this.salesPersonService.getBusinessPartners(this.originSalesPerson.SalesEmployeeCode, this.currentPage).subscribe(
      (it) => {
        this.loading = false;
        if (this.baseDestinationList.length === 0) {
          this.totalOriginItems = it.totalElements;
        }
        const loadedItems = it.content.map((bp) => ({ CardCode: bp.CardCode, CardName: bp.CardName, selected: false }));
        this.baseOriginList = loadedItems.filter(
          (item) => !this.transferredItems.some((transferredItem) => transferredItem.CardCode === item.CardCode));
        this.originList = this.filterList(this.baseOriginList, this.searchOrigin);
      }
    );
  }

  getTotalOriginCount(): number {
    return this.totalOriginItems;
  }

  getTotalDestinationCount(): number {
    return this.baseDestinationList.length;
  }

  filterList(list: any[], search: string): any[] {
    if (!search) {
      return list;
    } else {
      return list.filter((item) =>
        item.CardName.toLowerCase().includes(search.toLowerCase())
      );
    }
  }

  getDestinationList() {
    return this.filterList(this.baseDestinationList, this.searchDestination);
  }

  getOriginList() {
    return this.filterList(this.baseOriginList, this.searchOrigin);
  }

  moveToDestination(item: any): void {
    this.baseOriginList = this.baseOriginList.filter((i) => i.CardCode !== item.CardCode);
    this.baseDestinationList.push(item);
    this.transferredItems.push(item);
    this.size = 0;
    this.totalOriginItems--; // Decrementa o contador ao mover para o destino
  }

  moveToOrigin(item: any): void {
    this.baseDestinationList = this.baseDestinationList.filter((i) => i.CardCode !== item.CardCode);
    this.baseOriginList.push(item);
    this.transferredItems = this.transferredItems.filter((i) => i.CardCode !== item.CardCode);
    this.totalOriginItems++;
  }

  loadAllClients(): void {
    this.loading = true;
    this.isButtonDisabled = true;
    const totalPages = Math.ceil(this.totalOriginItems / this.size);
    let loadedPages = 0;
    let allItems = [];

    for (let page = 0; page < totalPages; page++) {
      this.salesPersonService.getBusinessPartners(this.originSalesPerson.SalesEmployeeCode, page).subscribe(
        (it) => {
          loadedPages++;
          const loadedItems = it.content.map((bp) => ({ CardCode: bp.CardCode, CardName: bp.CardName, selected: false }));
          allItems = allItems.concat(loadedItems.filter((item) => !this.transferredItems.some((transferredItem) => transferredItem.CardCode === item.CardCode)));

          if (this.baseDestinationList.length === 0) {
            this.totalOriginItems = it.totalElements;
          }

          if (loadedPages === totalPages) {
            this.loading = false;
            this.isButtonDisabled = false;
            this.moveAllItemsToDestination(allItems);
          }
        },
        (error) => {
          this.loading = false;
          this.isButtonDisabled = false;
          console.error('Erro ao carregar todos os clientes:', error);
        }
      );
    }
  }

  moveAllItemsToDestination(allItems: any[]): void {
    this.transferredItems = this.transferredItems.concat(allItems);
    this.baseDestinationList = this.baseDestinationList.concat(allItems);
    this.baseOriginList = [];
    this.totalOriginItems = 0;
  }

  selectPageItensOnly(): void {
    this.isButtonDisabled = true;
    const itemsToMove = this.baseOriginList.splice(0, this.size);
    this.transferredItems = this.transferredItems.concat(itemsToMove);
    this.baseDestinationList = this.baseDestinationList.concat(itemsToMove);
    this.totalOriginItems -= itemsToMove.length;
    this.isButtonDisabled = false;
  }

  unselectALL(): void {
    this.isButtonDisabled = true;
    const itemsToReturn = this.baseDestinationList;
    this.baseOriginList = this.baseOriginList.concat(itemsToReturn);
    this.transferredItems = [];
    this.baseDestinationList = [];
    this.totalOriginItems += itemsToReturn.length;
    this.isButtonDisabled = false;
  }

  sendOrder(): void {
    if (!this.isFormValid()) {
      this.alertService.error('Vendedor de Origem ou Vendedor de Destino não estão definidos corretamente.');
      return;
    }

    this.loading = true;

    const selectedClientIds = this.baseDestinationList.map(item => item.CardCode);

    this.salesPersonService.replaceSalesPerson(
      this.originSalesPerson.SalesEmployeeCode,
      this.destinationSalesPerson.SalesEmployeeCode,
      selectedClientIds
    ).subscribe(
      () => {
        this.concluirEnvio();
        this.loading = false;
      },
      (error) => {
        console.error('Erro ao realizar transferência:', error);
        this.loading = false;
      }
    );
  }

  concluirEnvio(): void {
    this.alertService.info('Transferência de clientes para o vendedor de destino foi realizada com sucesso.').then(() => {
      this.loading = false;
      this.limparFormulario();
    });
  }

  limparFormulario(): void {
    this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true }).then(() => {
      this.router.navigate(['transferencia-clientes']);
    });
  }
}
