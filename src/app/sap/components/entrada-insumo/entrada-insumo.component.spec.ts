import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntradaInsumoComponent } from './entrada-insumo.component';

describe('EntradaInsumoComponent', () => {
  let component: EntradaInsumoComponent;
  let fixture: ComponentFixture<EntradaInsumoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EntradaInsumoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntradaInsumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
