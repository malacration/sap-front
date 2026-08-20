import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { BranchSelectComponent } from './branch-select.component';
import { BranchService } from '../../../../sap/service/branch.service';
import { Branch } from '../../../../sap/model/branch';

// TestBed.createComponent no corpo do describe (como estava aqui antes) roda dentro do
// syncTestZone do Jasmine e estoura "Cannot call Promise.then from within a sync test",
// derrubando o arquivo inteiro antes de qualquer teste executar.
describe('Branch select component', () => {

  function filial(bplid: string, bplname: string): Branch {
    return Object.assign(new Branch(), { Bplid: bplid, Bplname: bplname });
  }

  const filiais = [
    filial('6', 'FAZENDA RIO MADEIRA S/A - FARM - CSC - Serra Verde'),
    filial('7', 'SUSTENNUTRI NUTRICAO ANIMAL LTDA - Matriz'),
  ];

  let fixture: ComponentFixture<BranchSelectComponent>;
  let component: BranchSelectComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BranchSelectComponent],
      providers: [{ provide: BranchService, useValue: { get: () => of(filiais) } }],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(BranchSelectComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('tira a razao social repetida da descricao, senao as opcoes ficam identicas na tela', () => {
    // Todas as filiais vem do SAP com o mesmo prefixo de razao social, mais largo que a
    // coluna do filtro: sem limpar, o usuario ve varias "FAZENDA RIO MADEIRA S/A - FAR..."
    // e nao consegue saber qual esta marcando.
    fixture.detectChanges();

    expect(component.opcoes.map((it) => it.description)).toEqual(['CSC - Serra Verde', 'Matriz']);
  });

  it('filial cujo nome e so a razao social nao fica com descricao vazia', () => {
    TestBed.resetTestingModule();
    const soRazaoSocial = [filial('9', 'SUSTENNUTRI NUTRICAO ANIMAL LTDA')];
    TestBed.configureTestingModule({
      declarations: [BranchSelectComponent],
      providers: [{ provide: BranchService, useValue: { get: () => of(soRazaoSocial) } }],
      schemas: [NO_ERRORS_SCHEMA],
    });
    const outro = TestBed.createComponent(BranchSelectComponent);

    outro.detectChanges();

    expect(outro.componentInstance.opcoes[0].description).toBe('SUSTENNUTRI NUTRICAO ANIMAL LTDA');
  });

  it('no modo multiple a escolha sai por selectedManyOut, nao por selectedOut', () => {
    component.multiple = true;
    const muitas: Array<Branch[]> = [];
    const uma: Array<Branch> = [];
    component.selectedManyOut.subscribe((valor) => muitas.push(valor));
    component.selectedOut.subscribe((valor) => uma.push(valor));

    component.onChange([filiais[0], filiais[1]]);

    expect(muitas).toEqual([[filiais[0], filiais[1]]]);
    expect(uma.length).toBe(0);
  });

  it('sem multiple continua emitindo a filial unica por selectedOut', () => {
    const uma: Array<Branch> = [];
    const muitas: Array<Branch[]> = [];
    component.selectedOut.subscribe((valor) => uma.push(valor));
    component.selectedManyOut.subscribe((valor) => muitas.push(valor));

    component.onChange(filiais[0]);

    expect(uma).toEqual([filiais[0]]);
    expect(muitas.length).toBe(0);
  });

  it('casa os Bplid de selectedMany com as filiais carregadas pra pre-marcar o dropdown', () => {
    // O drill-down do dashboard chega por query param, onde a filial e id em string - sem
    // casar id -> Branch o filtro herdado apareceria no badge mas nao no controle.
    component.multiple = true;
    component.selectedMany = [7];

    fixture.detectChanges();

    expect(component.filiaisIniciais).toEqual([filiais[1]]);
  });

  it('sem pre-selecao nenhuma filial vem marcada', () => {
    component.multiple = true;

    fixture.detectChanges();

    expect(component.filiaisIniciais).toEqual([]);
  });

  it('mudanca em selectedMany depois de carregado reflete no dropdown', () => {
    // O "Limpar" da tela de cobranca manda [] aqui depois do ngOnInit. Calculando so uma vez
    // no carregamento, o dropdown continuava marcado enquanto a consulta ja saia sem filial.
    component.multiple = true;
    component.selectedMany = [7];
    fixture.detectChanges();
    expect(component.filiaisIniciais).toEqual([filiais[1]]);

    component.selectedMany = [];

    expect(component.filiaisIniciais).toEqual([]);
  });

  it('selectedMany trocado antes da lista chegar ainda pre-seleciona', () => {
    // Os ids e a lista de filiais chegam em ordem imprevisivel - o setter roda antes do
    // subscribe do BranchService resolver.
    const { fixture: outro, component: recemCriado } = (() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [BranchSelectComponent],
        providers: [{ provide: BranchService, useValue: { get: () => of(filiais) } }],
        schemas: [NO_ERRORS_SCHEMA],
      });
      const f = TestBed.createComponent(BranchSelectComponent);
      return { fixture: f, component: f.componentInstance };
    })();

    recemCriado.multiple = true;
    recemCriado.selectedMany = [6];
    outro.detectChanges();

    expect(recemCriado.filiaisIniciais).toEqual([filiais[0]]);
  });
});
