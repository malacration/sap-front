
import { Component, Output, EventEmitter, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Action } from './action.model';


@Component({
    selector: 'app-action',
    templateUrl: "action.component.html",
    styleUrls: ['action.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
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
