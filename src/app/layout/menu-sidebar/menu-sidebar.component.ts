import {Component, HostBinding, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import { AppState } from '../../store/state';
import { UiState } from '../../store/ui/state';
import { ConfigService } from '../../core/services/config.service';
import { Route, Router } from '@angular/router';
import { MenuItem } from './menu-item.model';

const BASE_CLASSES = 'main-sidebar elevation-4';
@Component({
    selector: 'app-menu-sidebar',
    templateUrl: './menu-sidebar.component.html',
    styleUrls: ['./menu-sidebar.component.scss']
})
export class MenuSidebarComponent implements OnInit {
    @HostBinding('class') classes: string = BASE_CLASSES;
    public ui: Observable<UiState>;
    public user;
    title
    menu

    constructor(
        private config : ConfigService,
        private store: Store<AppState>,
        private router: Router
    ) {}

    ngOnInit() {
        this.title = this.config.title
        this.ui = this.store.select('ui');
        this.ui.subscribe((state: UiState) => {
            this.classes = `${BASE_CLASSES} ${state.sidebarSkin}`;
        });
        this.menu = this.createMenu(this.router.config);
    }


    createMenu(routes: Route[]) : Array<MenuItem> {
        let menu : Array<MenuItem> = new Array<MenuItem>()
        routes.filter(it => it.title != undefined && !(it.data?['hidden'] : undefined))
        .map(route =>{
            let item = new MenuItem(route)
            if (route.children) {
                item.children = this.createMenu(route.children)
            }
            menu.push(item)
            item
        })
        return menu
    }

}

