
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { Action } from '../table/column.model';


@Component({
    selector: 'app-action',
    templateUrl: "action.component.html",
})
export class ActionComponent {

    @Input()
    action : Action
    
}
