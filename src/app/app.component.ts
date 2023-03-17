import { Component, HostBinding, Renderer2 } from '@angular/core';
import { ToggleSidebarMenu } from './store/ui/actions';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { UiState } from './store/ui/state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  
  @HostBinding('class') class = 'wrapper';
  public ui: Observable<UiState>;

  public itens : Array<string> = ["item1","item2"]

  constructor(private renderer: Renderer2, private store: Store<AppState>) {}

  ngOnInit() {
      this.ui = this.store.select('ui');
      this.renderer.removeClass(
          document.querySelector('body'),
          'login-page'
      );
      this.renderer.removeClass(
          document.querySelector('body'),
          'register-page'
      );
      this.renderer.addClass(
          document.querySelector('body'),
          'layout-fixed'
      );

      this.ui.subscribe(
          ({menuSidebarCollapsed, controlSidebarCollapsed, darkMode}) => {
              if (menuSidebarCollapsed) {
                  this.renderer.removeClass(
                      document.querySelector('body'),
                      'sidebar-open'
                  );
                  this.renderer.addClass(
                      document.querySelector('body'),
                      'sidebar-collapse'
                  );
              } else {
                  this.renderer.removeClass(
                      document.querySelector('body'),
                      'sidebar-collapse'
                  );
                  this.renderer.addClass(
                      document.querySelector('body'),
                      'sidebar-open'
                  );
              }

              if (controlSidebarCollapsed) {
                  this.renderer.removeClass(
                      document.querySelector('body'),
                      'control-sidebar-slide-open'
                  );
              } else {
                  this.renderer.addClass(
                      document.querySelector('body'),
                      'control-sidebar-slide-open'
                  );
              }

              if (darkMode) {
                  this.renderer.addClass(
                      document.querySelector('body'),
                      'dark-mode'
                  );
              } else {
                  this.renderer.removeClass(
                      document.querySelector('body'),
                      'dark-mode'
                  );
              }
          }
      );
  }

  onToggleMenuSidebar() {
      this.store.dispatch(new ToggleSidebarMenu());
  }
}
