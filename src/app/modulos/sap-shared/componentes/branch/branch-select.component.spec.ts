import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
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

  it('permite tentar novamente quando o cadastro falha', () => {
    const buscar = spyOn(TestBed.inject(BranchService), 'get').and.returnValue(throwError(() => new Error('falha')));
    fixture.detectChanges();
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeTruthy();
    buscar.and.returnValue(of(filiais));
    component.carregar();
    expect(component.erro).toBe('');
    expect(component.branches).toEqual(filiais);
  });

  it('cancela carregamento quando o formulario e destruido', () => {
    const resposta = new Subject<Branch[]>();
    spyOn(TestBed.inject(BranchService), 'get').and.returnValue(resposta);
    fixture.detectChanges();
    fixture.destroy();
    expect(resposta.observed).toBeFalse();
  });

  it('abrevia a razao social preservando a identificacao da empresa', () => {
    fixture.detectChanges();

    expect(component.opcoes.map((it) => it.description)).toEqual(['FAZENDA CSC - Serra Verde', 'SUSTENNUTRI Matriz']);
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

    expect(outro.componentInstance.opcoes[0].description).toBe('SUSTENNUTRI');
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

  it('resolve a selecao unica por id mesmo quando o objeto veio do IndexedDB', () => {
    component.selected = Object.assign(new Branch(), { Bplid: '7', Bplname: 'copia local' });

    fixture.detectChanges();

    expect(component.selectedBranch).toBe(filiais[1]);
  });
});
