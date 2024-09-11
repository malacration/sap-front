import { Component, HostBinding, Renderer2 } from '@angular/core';
import { ToggleSidebarMenu } from './store/ui/actions';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { UiState } from './store/ui/state';
import { Observable } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { ConfigService } from './core/services/config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  
  @HostBinding('class') class = 'wrapper';
  public ui: Observable<UiState>;

  public itens : Array<string> = ["item1","item2"]
  homologacao : boolean = false

  constructor(private renderer: Renderer2, 
    private titleService : Title,
    private config : ConfigService,
    private store: Store<AppState>) {}

  ngOnInit() {
    this.changeColors()

    this.titleService.setTitle(this.config.title)
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
    if(this.config.hmg)
        this.homologacao = this.config.hmg

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

    changeColors() {
        const primary = this.config.primaryColor;
        const darkerPrimary = this.adjustColor(primary, -10);
        const textColorPrimary = this.colorContrast(primary);
        document.documentElement.style.setProperty('--bs-primary', primary);
        document.documentElement.style.setProperty('--bs-primary-dark', darkerPrimary);
        document.documentElement.style.setProperty('--bs-primary-text', textColorPrimary);
        

        const success =  this.config.successColor;
        const darkerSuccess = this.adjustColor(success, -10);
        const textColorSuccess = this.colorContrast(success);
        document.documentElement.style.setProperty('--bs-success', success);
        document.documentElement.style.setProperty('--bs-success-dark', darkerSuccess);
        document.documentElement.style.setProperty('--bs-success-text', textColorSuccess);
    }


  adjustColor(color: string, amount: number): string {
    return '#' + color.replace(/^#/, '').replace(/../g, (color) =>
      ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
    );
  }


    luminance(r: number, g: number, b: number): number {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
  
    contrast(l1: number, l2: number): number {
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
  
  colorContrast(hexcolor: string): string {
    if (hexcolor.startsWith('#')) {
      hexcolor = hexcolor.slice(1);
    }  
  
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
  
    const bgLuminance = this.luminance(r, g, b);
  
    const whiteLuminance = this.luminance(255, 255, 255);
    const blackLuminance = this.luminance(0, 0, 0);
  
    let blackPenality = 3.5
    const contrastWithWhite = this.contrast(bgLuminance, whiteLuminance);
    const contrastWithBlack = this.contrast(bgLuminance, blackLuminance)- blackPenality;

    return contrastWithWhite > contrastWithBlack ? '#ffffff' : '#000000';
  }  

  onToggleMenuSidebar() {
      this.store.dispatch(new ToggleSidebarMenu());
  }
}
