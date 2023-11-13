
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { Action } from './action.model';


@Component({
    selector: 'app-action',
    templateUrl: "action.component.html",
})
export class ActionComponent {

    @Input()
    action : Action

    @Output()
    actionOutput = new EventEmitter<any>()

    bClick() : any{
        this.actionOutput.emit(this.action.retorno)
    }

    
}
