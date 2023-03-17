import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RomaneioComponent } from './romaneio.component';

describe('RomaneioComponent', () => {
  let component: RomaneioComponent;
  let fixture: ComponentFixture<RomaneioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RomaneioComponent ]
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
