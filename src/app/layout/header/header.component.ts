import {Component, HostBinding, OnInit} from '@angular/core';
import {UntypedFormGroup, UntypedFormControl} from '@angular/forms';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import { AppState } from '../../store/state';
import { ToggleControlSidebar, ToggleDarkMode, ToggleSidebarMenu } from '../../store/ui/actions';
import { UiState } from '../../store/ui/state';
import { config } from 'process';
import { ConfigService } from '../../core/services/config.service';

//main-header navbar navbar-expand navbar-light navbar-white

const BASE_CLASSES = 'main-header navbar navbar-expand';
@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
    @HostBinding('class') classes: string = BASE_CLASSES;
    public ui: Observable<UiState>;
    public isDarkMode : Boolean = false
    public searchForm: UntypedFormGroup;
    public sidebarHeaderButton : boolean = true;
    public headerMenu : boolean = true;
    homologacao : boolean = false
    
    constructor(
        private store: Store<AppState>,
        private config : ConfigService
    ) {}

    ngOnInit() {
        this.ui = this.store.select('ui');
        this.ui.subscribe((state: UiState) => {
            this.classes = `${BASE_CLASSES} ${state.navbarVariant}`;
            this.sidebarHeaderButton = state.sidebarHeaderButton;
            this.headerMenu = state.headerMenu;
            this.isDarkMode = state.darkMode;
        });
        this.searchForm = new UntypedFormGroup({
            search: new UntypedFormControl(null)
        });
        this.homologacao = this.config.hmg
    }

    logout() {
        
    }

    onToggleMenuSidebar() {
        this.store.dispatch(new ToggleSidebarMenu());
    }

    onToggleControlSidebar() {
        this.store.dispatch(new ToggleControlSidebar());
    }

    onToggleDarkMode() {
        this.store.dispatch(new ToggleDarkMode());
    }
}
