import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { RomaneioFazendaInsumoComponent } from './romaneio-fazenda-insumo.component';
import { RomaneioFazendaInsumoService } from '../../service/romaneio-fazenda-insumo.service';
import { RomaneioPesagemService } from '../../service/romaneio-pesagem.service';
import { AlertService } from '../../../shared/service/alert.service';

describe('RomaneioFazendaInsumoComponent', () => {
  let fixture: ComponentFixture<RomaneioFazendaInsumoComponent>;
  const pesagem = jasmine.createSpyObj('RomaneioPesagemService', ['getByid']);
  const romaneio = jasmine.createSpyObj('RomaneioFazendaInsumoService', ['draft']);

  beforeEach(async () => {
    pesagem.getByid.and.returnValue(of([{}]));
    romaneio.draft.and.returnValue(of({}));
    await TestBed.configureTestingModule({
      declarations: [RomaneioFazendaInsumoComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '42', tipo: 'ENTRADA' })) } },
        { provide: RomaneioPesagemService, useValue: pesagem },
        { provide: RomaneioFazendaInsumoService, useValue: romaneio },
        { provide: AlertService, useValue: {} },
      ],
    }).overrideTemplate(RomaneioFazendaInsumoComponent, '').compileComponents();
    fixture = TestBed.createComponent(RomaneioFazendaInsumoComponent);
    fixture.detectChanges();
  });

  it('loads the weighing record and draft for the route without contacting a backend', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(pesagem.getByid).toHaveBeenCalledWith('42');
    expect(romaneio.draft).toHaveBeenCalledWith('42');
    expect(fixture.componentInstance.tipo).toBe('ENTRADA');
  });
});
