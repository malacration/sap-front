import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
import { CoreModule } from './core/core.module';
import { StoreModule } from '@ngrx/store';
import { AppModule } from './app.module';
import { OfflineContextService } from './core/offline/offline-context.service';
import { PermissoesApiService } from './core/permissoes-api.service';
import { of } from 'rxjs';

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [AppModule]
    })
      .overrideProvider(OfflineContextService, { useValue: {
        initialize: () => Promise.resolve(), backendOnline: false, state$: of({ backendOnline: false })
      } })
      .overrideProvider(PermissoesApiService, { useValue: { iniciar: () => {} } })
      .compileComponents();
  }));

  it('should create the app', waitForAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
