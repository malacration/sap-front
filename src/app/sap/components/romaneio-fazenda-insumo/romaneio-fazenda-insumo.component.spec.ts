import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RomaneioFazendaInsumoComponent } from './romaneio-fazenda-insumo.component';

describe('RomaneioFazendaInsumoComponent', () => {
  let component: RomaneioFazendaInsumoComponent;
  let fixture: ComponentFixture<RomaneioFazendaInsumoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RomaneioFazendaInsumoComponent ]
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
