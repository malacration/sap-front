import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterLinkActive} from '@angular/router';
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
    
    @HostBinding('class.nav-item') isNavItem: boolean = true;
    //  isMenuExtended: boolean = true;
    //public isMainActive: boolean = false;
    public url : string = ""

    constructor(
        private router: Router) {}

    ngOnInit(): void {
        this.calculateIsActive(this.router.url);
        this.url = this.router.url
        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                this.calculateIsActive(event.url);
                this.url = event.url
            });
    }

    public get isExpandable() : boolean {
        return this.menuItem != undefined && this.menuItem.children != undefined && this.menuItem.children.length > 0
    }

    public get isMainActive() : boolean{
        return this.isPath()
    }


    @HostBinding('class.menu-open')
    public get isMenuExtended() : boolean {
        return this.isOneOfChildrenActive
    }
    
    public get isOneOfChildrenActive() : boolean{
        return false
        let resultado = this.menuItem.children.find((item) => {
            this.isPath(item.path)
        })
        return resultado != undefined && resultado != null;
    }

    @HostBinding('class.nav-item')
    public get itenActive() : boolean {
        return this.isPath()
    }
    
    public handleMainMenuAction() {
        if (!this.isExpandable) {
            this.router.navigate(this.menuItem.path)
        }
    }

    public calculateIsActive(url: string) : boolean {
        // this.isMainActive = false;
        // // this.isOneOfChildrenActive = false;
        // if (this.isExpandable) {
        //     this.menuItem.children.forEach((item) => {
        //         if (item.path[0] === url) {
        //             // this.isOneOfChildrenActive = true;
        //         }
        //     });
        // } else if (this.menuItem.path[0] === url) {
        //     this.isMainActive = true;
        // }
        // if (!this.isMainActive && !this.isOneOfChildrenActive) {
        //     this.isMenuExtended = false;
        // }
        return true
    }

    public isPath(path : Array<String> = this.menuItem.path) : boolean{
        console.log("rota",path.filter(item => item !== '').join('/'))
        console.log("url",this.url)
        return this.url.startsWith(path.filter(item => item !== '').join('/'))
    }
}