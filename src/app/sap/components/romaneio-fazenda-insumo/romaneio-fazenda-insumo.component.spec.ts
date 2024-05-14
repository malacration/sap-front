import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RomaneioFazendaInsumoComponent } from './romaneio-fazenda-insumo.component';
import { ConfigService } from '../../../core/services/config.service';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClient } from '@angular/common/http';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
import { CoreModule } from '../../../core/core.module';

describe('RomaneioFazendaInsumoComponent', () => {
  let component: RomaneioFazendaInsumoComponent;
  let fixture: ComponentFixture<RomaneioFazendaInsumoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RomaneioFazendaInsumoComponent ],
      providers: [ConfigService],
      imports: [RouterTestingModule,BrowserDynamicTestingModule,CoreModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RomaneioFazendaInsumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
