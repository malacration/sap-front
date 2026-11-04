import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RomaneioComponent } from './romaneio.component';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';

describe('RomaneioComponent', () => {
  let fixture: ComponentFixture<RomaneioComponent>;
  let service: jasmine.SpyObj<RomaneioPesagemService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('RomaneioPesagemService', ['get']);
    service.get.and.returnValue(of({ content: [], totalElements: 0, size: 20, nextLink: null }));
    await TestBed.configureTestingModule({
      declarations: [RomaneioComponent],
      providers: [{ provide: RomaneioPesagemService, useValue: service }],
    }).overrideTemplate(RomaneioComponent, '').compileComponents();
    fixture = TestBed.createComponent(RomaneioComponent);
    fixture.detectChanges();
  });

  it('loads the first page with the incoming-contract filter', () => {
    const component = fixture.componentInstance;
    expect(service.get).toHaveBeenCalledWith(0, component.filtros);
    expect(component.filtros.get('tipo-contrato').value).toBe('ENTRADA');
    expect(component.romaneiosPesagem).toEqual([]);
    expect(component.carregando).toBeFalse();
  });
});
