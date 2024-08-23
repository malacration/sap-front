import {ChangeDetectorRef, Component, HostBinding, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, debounce, debounceTime} from 'rxjs';
import { AppState } from '../../store/state';
import { UiState } from '../../store/ui/state';
import { ConfigService } from '../../core/services/config.service';
import { Route, Router } from '@angular/router';
import { MenuItem } from './menu-item.model';
import { AuthService } from '../../shared/service/auth.service';

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
    modoOperacao = "external"

    constructor(
        private config : ConfigService,
        private store: Store<AppState>,
        private router: Router,
        private authService : AuthService,
        private ref: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.modoOperacao = this.config.getModoOperacao()
        this.title = this.config.title
        this.ui = this.store.select('ui');
        this.ui.subscribe((state: UiState) => {
            this.classes = `${BASE_CLASSES} ${state.sidebarSkin}`;
        });
        this.menu = this.createMenu(this.router.config);
        this.authService.loginChange$.subscribe(() => {
            this.menu = this.createMenu(this.router.config);
        })
    }

    logout() {
        this.authService.logout()
    }

    isLoggedIn() : boolean {
        return this.authService.isLoggedIn()
    }

    userName() {
        return this.authService.getUser()
    }


    createMenu(routes: Route[], pai : string = '') : Array<MenuItem> {
        let menu : Array<MenuItem> = new Array<MenuItem>()
        routes.filter(it =>
            this.isTemTitulo(it) && !this.isHidden(it) && this.isShowGuard(it)
            && (
                (this.modoOperacao == "internal" && this.isRouteInternal(it))
                ||
                (this.modoOperacao != "internal" && !this.isRouteInternal(it))
            )
        )
        .map(route =>{
            let item = new MenuItem(route,pai)
            if (route.children) {
                let stackPai = pai+"/"+route.path
                item.children = this.createMenu(route.children,stackPai)
            }
            menu.push(item)
            item
        })
        this.menu = menu
        return menu
    }

    isShowGuard(route : Route) : boolean{
        if(route.canActivate)
            return this.authService.isLoggedIn()
        return true
    }

    isHidden(it){
        return it?.data?.filter(item => item.toString() == "hidden").toString() == 'hidden'
    }

    isTemTitulo(it){
        return it.title != undefined
    }

    isRouteInternal(it : Route) : boolean {
        return it?.data?.filter(item => item.toString() == "internal").toString() == 'internal'
    }

}

