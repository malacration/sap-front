import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DualListBoxComponent } from './dual-list-box.component';

describe('DualListBoxComponent', () => {
  let component: DualListBoxComponent;
  let fixture: ComponentFixture<DualListBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DualListBoxComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DualListBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
