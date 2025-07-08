
import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { Column } from '../table/column.model';
import { Page } from '../../../sap/model/page.model';
import { Actiable, Action, ActionReturn } from '../action/action.model';

class FullPedido{
    windson = "<"
    
}

@Component({
    selector: 'app-dual-list',
    templateUrl: "dual-list.component.html",
    styleUrls: ["dual-list.component.scss"]
})
export class DualListComponent implements OnInit {

    definition = [
        new Column("windson","windson","<li>{{value}}</li><hr> <li>Produto 2</li>"),
        new Column("woman","woman")
    ]



    resultadoBusca : Page<any> = new Page()

    itensSelecionados : Page<any>  = new Page()

    ngOnInit(): void {
        const p = new Page<any>()
        p.content = [
            {
            windson: "jedeson gadelha",
            woman : "chico",
        }]

        p.content.forEach(item => {
            item.getActions = () => {
                if(item?.selected)
                    return [new Action("Remover", new ActionReturn("remover", item), "fas fa-trash")]
                else
                    return [new Action("selecionar", new ActionReturn("selecionar", item), "fas fa-trash")]
                }
            ;
        });

        this.resultadoBusca = p
    }

    injectAction(){

    }

    loading = false

    

    changePageFunction($event){

    }

    action(actionReturn : ActionReturn){
        if(actionReturn.type == "selecionar"){
            console.log(actionReturn)
            let item =actionReturn.data
            item.selected = true
            this.itensSelecionados.content.push(item)
            this.resultadoBusca.content.splice(this.resultadoBusca.content.findIndex(it => item === it))
            alert("selecionado")
        }
        else if(actionReturn.type == "remover"){
            alert("removendo")
        }
    }
}
