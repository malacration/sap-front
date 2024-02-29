
import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { Action } from './action.model';


@Component({
    selector: 'app-action',
    templateUrl: "action.component.html",
    styleUrls: ['action.component.scss']
})
export class ActionComponent implements OnInit {

    color = "primary"

    @Input()
    action : Action

    @Output()
    actionOutput = new EventEmitter<any>()

    bClick() : any{
        this.actionOutput.emit(this.action.retorno)
    }

    ngOnInit(): void {
        if(this.action.color)
            this.color = this.action.color
      }

    
}
