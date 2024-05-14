import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RomaneioComponent } from './romaneio.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
import { CoreModule } from '../../../core/core.module';

describe('RomaneioComponent', () => {
  let component: RomaneioComponent;
  let fixture: ComponentFixture<RomaneioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RomaneioComponent ],
      imports: [RouterTestingModule,BrowserDynamicTestingModule,CoreModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RomaneioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
