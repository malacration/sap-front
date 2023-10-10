import {Directive, Input, HostBinding} from '@angular/core';


@Directive({selector: '[collapse]'})
export class CollapsedDirective {

    // shown
    @HostBinding('class.blue')
    private isExpanded = true;

    // hidden
    @HostBinding('class.collapsed-box')
    private isCollapsed = false;

    // animation state
    @HostBinding('class.red')
    private isCollapsing = false;

    @Input()
    private set collapse(value: boolean) {
        this.isExpanded = value;
        this.toggle();
    }

    private get collapse(): boolean {
        return this.isExpanded;
    }

    constructor() {
    }

    toggle() {
        if (this.isExpanded) {
            this.hide();
        } else {
            this.show();
        }
    }

    hide() {
        this.isCollapsing = true;

        this.isExpanded = false;
        this.isCollapsed = true;
        setTimeout(() => {
            this.isCollapsing = false;
        }, 4);
    }

    show() {
        this.isCollapsing = true;

        this.isExpanded = true;
        this.isCollapsed = false;
        setTimeout(() => {
            this.isCollapsing = false;
        }, 4);
    }
}

