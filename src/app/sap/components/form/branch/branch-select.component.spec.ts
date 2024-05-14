import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BranchSelectComponent } from './branch-select.component';
import { BranchService } from '../../../service/branch.service';
import { ConfigService } from '../../../../core/services/config.service';
import { CoreModule } from '../../../../core/core.module';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';

describe('Branch select component', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BranchSelectComponent],
      providers: [BranchService],
      imports: [RouterTestingModule,BrowserDynamicTestingModule,CoreModule]
    }).compileComponents();
  }));

  const fixture = TestBed.createComponent(BranchSelectComponent);
  const app = fixture.debugElement.componentInstance;

  it('should create the app', waitForAsync(() => {
    
    expect(app).toBeTruthy();
  }));


  it('should create the app', waitForAsync(() => {
    const fixture = TestBed.createComponent(BranchSelectComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
