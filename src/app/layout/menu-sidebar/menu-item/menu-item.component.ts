import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {NavigationEnd, Route, Router, RouterLinkActive} from '@angular/router';
import {filter} from 'rxjs/operators';
import {openCloseAnimation, rotateAnimation} from './menu-item.animations';
import { MenuItem } from '../menu-item.model';

@Component({
    selector: 'app-menu-item',
    templateUrl: './menu-item.component.html',
    styleUrls: ['./menu-item.component.scss'],
    animations: [openCloseAnimation, rotateAnimation]
})
export class MenuItemComponent implements OnInit {
    @Input() menuItem: MenuItem = null;

    //  isMenuExtended: boolean = true;
    //public isMainActive: boolean = false;
    public url : string = ""

    constructor(private router: Router) {}

    ngOnInit(): void {
        this.url = this.router.url
        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                this.url = event.url
            });
    }

    public get isExpandable() : boolean {
        return this.menuItem != undefined && this.menuItem.children != undefined && this.menuItem.children.length > 0
    }

    public get isMainActive() : boolean{
        return this.isPath()
    }

    _isOpen = false
    public get isOpen() : boolean {
        console.log("isopen",this._isOpen)
        this._isOpen = !this._isOpen
        return this._isOpen
    }

    public get isMenuExtended() : boolean {
        return this.isOneOfChildrenActive || this.isMainActive
    }
    
    public get isOneOfChildrenActive() : boolean{
        let resultado = this.menuItem.children.find((item) => {
            return this.isPath(item.path)
        })
        return resultado != undefined && resultado != null;
    }

    public get itenActive() : boolean {
        return this.isPath()
    }
    
    public handleMainMenuAction(path : Array<String>) {
        let nPath = path.map(it => it.replace("/**",""))
        this.router.navigate(nPath)
    }

    public isPath(path : Array<String> = this.menuItem.path) : boolean{
        return this.isRouteMatch(path)
    }

    getPath(path : Array<String>) : string{
        return path.join('/').replace("/**","")
    }

    private isRouteMatch(paths : Array<String> = this.menuItem.path): boolean {
        const path = this.getPath(paths)
        const regex = this.generateRegexFromPath(path)
        return regex.test(this.url);
    }

    openClass() : string{
        if((this.isMainActive || this.isOneOfChildrenActive) && this.isExpandable)
            return 'menu-open menu-is-opening'
        else
            return ""
    }

    generateRegexFromPath(path: string): RegExp {
        let regexString = path.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
        regexString = regexString.replace(/\\:([a-zA-Z0-9-_]+)/g, '([^\\/]+)');
        regexString = regexString.replace(/(:[\w]*)/g, "[^\\/]*");
        if (regexString.endsWith('/**')) {
            regexString = regexString.replace('/**', '/.*');
        }
        regexString = `^${regexString}$`;
        return new RegExp(regexString);
    }    
}