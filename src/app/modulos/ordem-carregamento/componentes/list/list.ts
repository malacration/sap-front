import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { Column } from "../../../../shared/components/table/column.model";
import { OrdemCarregamento } from "../../models/ordem-carregamento";
import { Page } from "../../../../sap/model/page.model";
import { ActionReturn } from "../../../../shared/components/action/action.model";

@Component({
  selector: 'ordem-carregamento-list',
  templateUrl: './list.html',
  styleUrls: ['./list.scss']
})
export class ListComponent implements OnInit, OnDestroy {

    @Input()
    pageContent: Page<OrdemCarregamento> = new Page<OrdemCarregamento>();

    @Input()
    pageChangeFn: ((page: number) => void) | null = null;

    @Output()
    actionOutput: EventEmitter<ActionReturn> = new EventEmitter<ActionReturn>();

    definition: Column[] = [
        new Column('ID', 'DocEntry'),
        new Column('Nome', 'U_nameOrdem'),
        new Column('Peso Total (Kg)', 'Weight1'),
        new Column('Qtd. Pedidos', 'DocEntryQuantity'),
        new Column('Status', 'U_Status'),
        new Column('Criado em', 'dataCriacao')
    ];

    constructor(){}

    action(event: ActionReturn): void {
        this.actionOutput.emit(event);
    }

    pageChange(page: number): void{
        if(this.pageChangeFn){
            this.pageChangeFn(page);
        }
    }

    ngOnInit(): void {

    }

    ngOnDestroy(): void {

    }
}
