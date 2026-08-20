import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { SelectComponent } from './select.component';
import { Option, OptionGroup } from '../../../sap/model/form/option';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectComponent ],
      // Sem FormsModule o [(ngModel)] do modo single nao tem diretiva: o template renderizava
      // com NG0303 no log e o teste passava sem exercitar o binding de verdade.
      imports: [ FormsModule ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('SelectComponent no modo multiple', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectComponent],
      imports: [FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    component.multiple = true;
    component.options = [new Option('6', 'Fazenda Serra Verde'), new Option('7', 'Matriz')];
    fixture.detectChanges();
  });

  function checkboxes(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type=checkbox]'));
  }

  function botaoDoDropdown(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.app-select-multi-toggle');
  }

  it('troca o select nativo por um checkbox por opcao', () => {
    // Nativo com multiple exige ctrl+click e vira listbox: nao serve pra linha de filtro.
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(checkboxes().length).toBe(2);
  });

  it('acumula as opcoes marcadas e emite a selecao inteira a cada clique', () => {
    const emitido: any[] = [];
    component.selectedOut.subscribe((valor) => emitido.push(valor));

    checkboxes()[0].click();
    checkboxes()[1].click();

    expect(emitido).toEqual([['6'], ['6', '7']]);
  });

  it('desmarcar remove somente a opcao clicada', () => {
    checkboxes()[0].click();
    checkboxes()[1].click();

    checkboxes()[0].click();

    expect(component.selecionados).toEqual(['7']);
  });

  it('clique dentro de outro multi-select fecha este', () => {
    // O handler testava .closest('.app-select-multi'), que casa com QUALQUER multi-select da
    // pagina: dois na mesma tela nunca se fechavam e ficavam sobrepostos.
    const vizinho = document.createElement('div');
    vizinho.className = 'app-select-multi';
    document.body.appendChild(vizinho);
    try {
      component.toggleAberto();
      expect(component.aberto).toBe(true);

      vizinho.click();

      expect(component.aberto).toBe(false);
    } finally {
      vizinho.remove();
    }
  });

  it('mantem o menu aberto ao marcar e fecha no clique fora', () => {
    botaoDoDropdown().click();
    fixture.detectChanges();
    expect(component.aberto).toBe(true);

    // Quem filtra por varias filiais marca em sequencia - fechar a cada clique seria hostil.
    checkboxes()[0].click();
    expect(component.aberto).toBe(true);

    document.body.click();
    expect(component.aberto).toBe(false);
  });

  it('resume a selecao no botao: descricao quando e uma, contagem quando e mais', () => {
    expect(component.resumoSelecao).toBe('Selecione');

    checkboxes()[0].click();
    expect(component.resumoSelecao).toBe('Fazenda Serra Verde');

    checkboxes()[1].click();
    expect(component.resumoSelecao).toBe('2 selecionadas');
  });

  it('limpar zera a selecao e avisa quem escuta', () => {
    checkboxes()[0].click();
    const emitido: any[] = [];
    component.selectedOut.subscribe((valor) => emitido.push(valor));

    component.limparSelecao();

    expect(component.selecionados).toEqual([]);
    expect(emitido).toEqual([[]]);
  });

  it('initialSelectMany pre-seleciona sem emitir evento', () => {
    // Chega depois do ngOnInit (a lista de opcoes vem do backend) e nao e escolha do usuario:
    // emitir aqui dispararia uma consulta a mais e sobrescreveria o filtro de quem chamou.
    const emitido: any[] = [];
    component.selectedOut.subscribe((valor) => emitido.push(valor));

    component.initialSelectMany = ['7'];
    fixture.detectChanges();

    expect(component.selecionados).toEqual(['7']);
    expect(checkboxes()[1].checked).toBe(true);
    expect(emitido.length).toBe(0);
  });
});

describe('SelectComponent no modo multiple agrupado', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  // Janela recortada como a tela de cobranca recorta: o grupo da ponta entra incompleto de
  // proposito (com 24 meses, o ano mais antigo comeca no meio).
  const grupos = [
    new OptionGroup('2026', [new Option('2026-08', 'Agosto'), new Option('2026-07', 'Julho')]),
    new OptionGroup('2025', [new Option('2025-12', 'Dezembro')]),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectComponent],
      imports: [FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    component.multiple = true;
    component.grupos = grupos;
    component.rotuloSemSelecao = 'Todos';
    component.nomeNoPlural = 'meses';
    fixture.detectChanges();
  });

  function caixaDeTodos(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.app-select-todos input[type=checkbox]');
  }

  function caixasDeItem(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.app-select-item-do-grupo input[type=checkbox]'));
  }

  function abrir(): void {
    fixture.nativeElement.querySelector('.app-select-multi-toggle').click();
    fixture.detectChanges();
  }

  it('abre com o primeiro grupo aberto e os outros recolhidos', () => {
    // 24 meses de uma vez fariam o usuario rolar o painel pra achar o mes.
    expect(component.estaRecolhido('2026')).toBe(false);
    expect(component.estaRecolhido('2025')).toBe(true);
  });

  it('sem nada marcado o botao mostra o rotulo de "sem restricao"', () => {
    expect(component.semSelecao).toBe(true);
    expect(component.resumoSelecao).toBe('Todos');
    expect(caixaDeTodos().checked).toBe(true);
  });

  it('clicar em "(Todos)" com nada marcado mantem a caixa marcada', () => {
    // O browser desmarca sozinho no clique e o [checked] continua true: sem repor na mao, o
    // Angular nao ve mudanca de binding e a caixa ficava desmarcada pra sempre.
    abrir();
    caixaDeTodos().click();
    fixture.detectChanges();

    expect(component.semSelecao).toBe(true);
    expect(caixaDeTodos().checked).toBe(true);
  });

  it('"(Todos)" limpa a selecao e avisa quem escuta', () => {
    const emitido: any[] = [];
    component.selectedOut.subscribe((valor) => emitido.push(valor));
    abrir();

    caixasDeItem()[0].click();
    fixture.detectChanges();
    expect(component.semSelecao).toBe(false);

    caixaDeTodos().click();
    fixture.detectChanges();

    expect(component.semSelecao).toBe(true);
    expect(emitido[emitido.length - 1]).toEqual([]);
    expect(caixaDeTodos().checked).toBe(true);
  });

  it('emite o valor da opcao, nao o rotulo', () => {
    // O filtro de cobranca depende disso: o backend faz YearMonth.parse do YYYY-MM.
    const emitido: any[] = [];
    component.selectedOut.subscribe((valor) => emitido.push(valor));
    abrir();

    caixasDeItem()[1].click();

    expect(emitido).toEqual([['2026-07']]);
  });

  it('marcar o grupo marca as opcoes que ele oferece', () => {
    const emitido: any[] = [];
    component.selectedOut.subscribe((valor) => emitido.push(valor));

    component.alternarGrupo(grupos[0]);

    expect(emitido[0]).toEqual(['2026-08', '2026-07']);
    expect(component.grupoMarcado(grupos[0])).toBe(true);
    expect(component.grupoParcial(grupos[0])).toBe(false);
  });

  it('grupo com parte das opcoes fica em estado intermediario, nao marcado', () => {
    component.alternar(grupos[0].options[1]);

    expect(component.grupoMarcado(grupos[0])).toBe(false);
    expect(component.grupoParcial(grupos[0])).toBe(true);
    expect(component.semSelecao).toBe(false);
  });

  it('desmarcar o grupo solta so as opcoes dele', () => {
    component.alternar(grupos[1].options[0]);
    component.alternarGrupo(grupos[0]);
    expect(component.estaSelecionado(grupos[0].options[0])).toBe(true);

    component.alternarGrupo(grupos[0]);

    // A opcao do outro grupo nao pode ser levada junto.
    expect(component.estaSelecionado(grupos[0].options[0])).toBe(false);
    expect(component.estaSelecionado(grupos[1].options[0])).toBe(true);
  });

  it('resume uma selecao com o rotulo do grupo, e varias pela contagem', () => {
    // "Julho" sozinho e ambiguo - de qual ano?
    component.alternar(grupos[0].options[1]);
    expect(component.resumoSelecao).toBe('Julho/2026');

    component.alternar(grupos[1].options[0]);
    expect(component.resumoSelecao).toBe('2 meses');
  });

  it('quem usa manda no estado: receber [] limpa o que estava marcado', () => {
    component.alternar(grupos[0].options[1]);
    expect(component.semSelecao).toBe(false);

    component.initialSelectMany = [];

    expect(component.semSelecao).toBe(true);
  });

  it('recolher e expandir esconde e mostra as opcoes do grupo', () => {
    abrir();
    expect(caixasDeItem().length).toBe(2); // so 2026 aberto

    component.alternarRecolhido('2025');
    fixture.detectChanges();
    expect(caixasDeItem().length).toBe(3);

    component.alternarRecolhido('2026');
    fixture.detectChanges();
    expect(caixasDeItem().length).toBe(1);
  });

  it('modo plano nao ganha "(Todos)" nem grupo', () => {
    // Regressao: quem passa options (branch-select) tem que continuar como era.
    component.grupos = [];
    component.options = [new Option('6', 'Fazenda Serra Verde')];
    fixture.detectChanges();

    expect(component.agrupado).toBe(false);
    expect(fixture.nativeElement.querySelector('.app-select-todos')).toBeNull();
    expect(fixture.nativeElement.querySelector('.app-select-grupo')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('label.dropdown-item').length).toBe(1);
  });
});
