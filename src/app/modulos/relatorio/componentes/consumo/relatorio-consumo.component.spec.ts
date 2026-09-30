import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { RelatorioService } from '../../../../sap/service/relatorio.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Subject, of, throwError } from 'rxjs';
import { RelatorioConsumoComponent } from './relatorio-consumo.component';
import { RelatorioDetalhe } from '../../modelos/relatorio.model';
import { FormularioParametrosComponent } from '../formulario-parametros/formulario-parametros.component';

describe('Consumo de relatorios', () => {
  let service: any;
  let component: RelatorioConsumoComponent;
  const detalhe = (id: number): RelatorioDetalhe => ({
    id, nome: `Relatorio ${id}`, formatos: ['csv'], versaoPublicada: 1, atualizadoEm: '', colunas: [],
    parametros: [{ nome: 'ativo', tipo: 'booleano', obrigatorio: true }],
  });

  beforeEach(() => {
    service = jasmine.createSpyObj('RelatorioService', ['obter', 'renderizar', 'lerErro']);
    component = new RelatorioConsumoComponent(
      new FormBuilder(), service, {} as any,
      jasmine.createSpyObj('ToastrService', ['warning', 'error', 'success']),
    );
  });

  afterEach(() => component.ngOnDestroy());

  /** Sem template no teste unitario: pluga o formulario real no lugar do @ViewChild. */
  function comFormulario(relatorio: RelatorioDetalhe): FormularioParametrosComponent {
    const formulario = new FormularioParametrosComponent(new FormBuilder());
    formulario.parametros = relatorio.parametros;
    component.formParams = formulario;
    return formulario;
  }

  it('preserva campos primitivos e serializa datas sem deslocamento de fuso', () => {
    const relatorio = detalhe(1);
    relatorio.parametros = [
      { nome: 'texto', tipo: 'texto', obrigatorio: true, padrao: 'abc' },
      { nome: 'inteiro', tipo: 'numero', obrigatorio: true, padrao: 10 },
      { nome: 'decimal', tipo: 'numero', obrigatorio: true, padrao: 10.25 },
      { nome: 'data', tipo: 'date', obrigatorio: true, padrao: '2026-09-18' },
      { nome: 'hora', tipo: 'datetime', obrigatorio: true, padrao: '2026-09-18T09:30:00' },
      { nome: 'ativo', tipo: 'booleano', obrigatorio: true, padrao: false },
      { nome: 'lista', tipo: 'lista', obrigatorio: true, opcoes: [{ valor: 'A', rotulo: 'Ativo' }], padrao: 'A' },
    ];
    service.obter.and.returnValue(of(relatorio));
    service.renderizar.and.returnValue(new Subject());
    component.selecionar(relatorio);
    comFormulario(relatorio);
    component.gerar('csv');
    expect(service.renderizar).toHaveBeenCalledWith(1, 'csv', { params: {
      texto: 'abc', inteiro: 10, decimal: 10.25, data: '2026-09-18', hora: '2026-09-18T09:30:00', ativo: false, lista: 'A',
    }});
  });

  it('gera arrays de codigos e null para selecao opcional vazia', () => {
    const relatorio = detalhe(2);
    relatorio.parametros = [
      { nome: 'filiais', tipo: 'filial', multiplo: true, obrigatorio: true, padrao: [1, 2] },
      { nome: 'slpCode', tipo: 'vendedor', obrigatorio: true },
      { nome: 'cardCode', tipo: 'parceiro_negocio', obrigatorio: true },
      { nome: 'itens', tipo: 'item', multiplo: true, obrigatorio: false },
    ];
    service.obter.and.returnValue(of(relatorio));
    service.renderizar.and.returnValue(new Subject());
    component.selecionar(relatorio);
    const formulario = comFormulario(relatorio);
    expect(formulario.formulario.invalid).toBeTrue();
    formulario.atualizarCadastro(relatorio.parametros[1], 0);
    formulario.atualizarCadastro(relatorio.parametros[2], 'C0001');
    component.gerar('csv');
    expect(service.renderizar).toHaveBeenCalledWith(2, 'csv', {
      params: { filiais: [1, 2], slpCode: 0, cardCode: 'C0001', itens: null },
    });
    formulario.atualizarCadastro(relatorio.parametros[0], []);
    expect(formulario.formulario.invalid).toBeTrue();
    expect(formulario.campoInvalido(relatorio.parametros[0])).toBeTrue();
  });

  it('envia false para um booleano obrigatorio', () => {
    service.obter.and.returnValue(of(detalhe(2)));
    service.renderizar.and.returnValue(new Subject());
    component.selecionar(detalhe(2));
    expect(comFormulario(detalhe(2)).valido).toBeTrue();
    component.gerar('csv');
    expect(service.renderizar).toHaveBeenCalledWith(2, 'csv', { params: { ativo: false } });
  });

  it('marca o item no clique e nao refaz o request ao clicar de novo', () => {
    const pendente = new Subject<RelatorioDetalhe>();
    service.obter.and.returnValue(pendente);
    component.selecionar(detalhe(5));
    expect(component.selecionadoId).toBe(5);          // marcado antes da resposta
    component.selecionar(detalhe(5));                  // clique repetido enquanto carrega
    pendente.next(detalhe(5));
    component.selecionar(detalhe(5));                  // clique repetido ja aberto
    expect(service.obter).toHaveBeenCalledTimes(1);
    expect(component.relatorio?.id).toBe(5);
  });

  it('depois de erro, clicar de novo tenta outra vez', async () => {
    service.lerErro.and.returnValue(Promise.resolve({ erro: 'x', mensagem: 'falhou' }));
    service.obter.and.returnValues(throwError(() => new Error('rede')), of(detalhe(6)));
    component.selecionar(detalhe(6));
    await Promise.resolve(); await Promise.resolve();
    component.selecionar(detalhe(6));
    expect(service.obter).toHaveBeenCalledTimes(2);
    expect(component.relatorio?.id).toBe(6);
  });

  it('ignora o detalhe anterior quando outra selecao chega primeiro', () => {
    const antigo = new Subject<RelatorioDetalhe>();
    const novo = new Subject<RelatorioDetalhe>();
    service.obter.and.returnValues(antigo, novo);
    component.selecionar(detalhe(3));
    component.selecionar(detalhe(4));
    novo.next(detalhe(4));
    antigo.next(detalhe(3));
    expect(component.relatorio?.id).toBe(4);
    expect(antigo.observed).toBeFalse();
  });

  it('cancela a geracao ao trocar de relatorio', () => {
    service.obter.and.callFake((id: number) => of(detalhe(id)));
    const geracao = new Subject();
    service.renderizar.and.returnValue(geracao);
    component.selecionar(detalhe(3));
    comFormulario(detalhe(3));
    component.gerar('csv');
    expect(geracao.observed).toBeTrue();
    component.selecionar(detalhe(4));
    expect(geracao.observed).toBeFalse();
    expect(component.gerando).toBeUndefined();
  });

  it('abre rascunho na autoria sem consultar endpoint de publicados', () => {
    component.isAdmin = true;
    const editar = spyOn(component.editarRelatorio, 'emit');
    component.selecionar({ id: 99, nome: 'Rascunho', formatos: ['html'], versaoPublicada: null });
    expect(editar).toHaveBeenCalledWith(99);
    expect(service.obter).not.toHaveBeenCalled();
  });
});

describe('Pastas e busca na lista de relatorios', () => {
  let service: any;
  let component: RelatorioConsumoComponent;
  const item = (id: number, nome: string, pasta?: string | null) =>
    ({ id, nome, pasta, formatos: ['pdf'], versaoPublicada: 1, atualizadoEm: '' });

  const criar = (isAdmin = false) => {
    component = new RelatorioConsumoComponent(
      new FormBuilder(), service, {} as any,
      jasmine.createSpyObj('ToastrService', ['warning', 'error', 'success']),
    );
    component.isAdmin = isAdmin;
    component.carregarLista();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('RelatorioService', ['listar', 'listarTodos', 'obter', 'lerErro']);
    service.listar.and.returnValue(of([
      item(1, 'Vendas por cliente', 'Vendas'),
      item(2, 'Cobrança em aberto', 'Financeiro'),
      item(3, 'Estoque'),
      item(4, 'Vendas por vendedor', 'Vendas'),
    ]));
    service.listarTodos.and.returnValue(of([item(5, 'Rascunho admin', 'Vendas')]));
    criar();
  });

  afterEach(() => component.ngOnDestroy());

  const titulos = () => component.grupos.map((g) => g.titulo);

  it('agrupa por pasta ao carregar, com "Sem pasta" por ultimo', () => {
    expect(titulos()).toEqual(['Financeiro', 'Vendas', 'Sem pasta']);
    expect(component.totalFiltrado).toBe(4);
  });

  it('admin carrega pela lista completa e tambem agrupa', () => {
    component.ngOnDestroy();
    criar(true);
    expect(service.listarTodos).toHaveBeenCalled();
    expect(titulos()).toEqual(['Vendas']);
  });

  it('a busca filtra sem acento, some com pastas vazias e conta os resultados', () => {
    component.buscar('COBRANCA');
    expect(titulos()).toEqual(['Financeiro']);
    expect(component.totalFiltrado).toBe(1);
    component.buscar('nada disso');
    expect(component.grupos).toEqual([]);
    expect(component.totalFiltrado).toBe(0);
    component.buscar('');
    expect(titulos()).toEqual(['Financeiro', 'Vendas', 'Sem pasta']);
  });

  it('a busca mantem a lista carregada e sobrevive a um recarregamento', () => {
    component.buscar('vendas');
    component.carregarLista();
    expect(component.relatorios.length).toBe(4);
    expect(titulos()).toEqual(['Vendas']);
  });

  it('pasta recolhida fica fechada, e durante a busca todas abrem', () => {
    const vendas = component.grupos.find((g) => g.titulo === 'Vendas')!;
    expect(component.pastaAberta(vendas)).toBeTrue();
    component.alternarPasta(vendas);
    expect(component.pastaAberta(vendas)).toBeFalse();

    component.buscar('vendas');
    expect(component.pastaAberta(component.grupos[0])).toBeTrue();
    component.alternarPasta(component.grupos[0]);
    expect(component.pastaAberta(component.grupos[0])).toBeTrue();

    component.buscar('');
    expect(component.pastaAberta(component.grupos.find((g) => g.titulo === 'Vendas')!)).toBeFalse();
  });

  it('selecionar um item reabre a pasta recolhida dele', () => {
    service.obter.and.returnValue(new Subject());
    const vendas = component.grupos.find((g) => g.titulo === 'Vendas')!;
    component.alternarPasta(vendas);
    expect(component.pastaAberta(vendas)).toBeFalse();

    component.selecionar(vendas.itens[0]);
    expect(component.pastaAberta(vendas)).toBeTrue();
  });

  it('relatorio sem pasta reabre o grupo "Sem pasta" ao ser selecionado', () => {
    service.obter.and.returnValue(new Subject());
    const sem = component.grupos.find((g) => g.titulo === 'Sem pasta')!;
    component.alternarPasta(sem);
    component.selecionar(sem.itens[0]);
    expect(component.pastaAberta(sem)).toBeTrue();
  });
});

describe('Lista de relatorios renderizada', () => {
  const item = (id: number, nome: string, pasta?: string | null) =>
    ({ id, nome, pasta, formatos: ['pdf'], versaoPublicada: 1, atualizadoEm: '' });

  async function montar() {
    const service = jasmine.createSpyObj('RelatorioService', ['listar', 'listarTodos', 'obter', 'lerErro']);
    service.listar.and.returnValue(of([
      item(1, 'Vendas por cliente', 'Vendas'),
      item(2, 'Cobrança em aberto', 'Financeiro'),
      item(3, 'Estoque'),
    ]));
    await TestBed.configureTestingModule({
      declarations: [RelatorioConsumoComponent],
      imports: [CommonModule, ReactiveFormsModule, FormsModule],
      providers: [
        { provide: RelatorioService, useValue: service },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['warning', 'error', 'success']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    const fixture = TestBed.createComponent(RelatorioConsumoComponent);
    fixture.detectChanges();
    return fixture;
  }

  /** Pasta -> nomes dos relatorios DENTRO do painel dela: prova a associacao, nao so as duas listas. */
  const estrutura = (el: HTMLElement): Record<string, (string | undefined)[]> => {
    const saida: Record<string, (string | undefined)[]> = {};
    el.querySelectorAll('.lista-relatorios .pasta-cabecalho').forEach((cabecalho) => {
      const titulo = cabecalho.querySelector('.pasta-titulo')!.textContent!.trim();
      const painel = cabecalho.nextElementSibling;
      const dentro = painel?.classList.contains('list-group') ? painel : null;
      saida[titulo] = Array.from(dentro?.querySelectorAll('.relatorio-select .font-weight-bold') ?? [])
        .map((n) => n.textContent?.trim());
    });
    return saida;
  };
  const digitar = (fixture: any, campo: HTMLInputElement, texto: string) => {
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('mostra cada relatorio dentro da pasta dele e filtra ao digitar', async () => {
    const fixture = await montar();
    const el: HTMLElement = fixture.nativeElement;
    expect(estrutura(el)).toEqual({
      'Financeiro': ['Cobrança em aberto'],
      'Vendas': ['Vendas por cliente'],
      'Sem pasta': ['Estoque'],
    });
    expect(Object.keys(estrutura(el))).toEqual(['Financeiro', 'Vendas', 'Sem pasta']);

    const campo: HTMLInputElement = el.querySelector('input[type="search"]')!;
    digitar(fixture, campo, 'cobranca');
    expect(estrutura(el)).toEqual({ 'Financeiro': ['Cobrança em aberto'] });
    expect(el.textContent).toContain('1 de 3 relatórios');

    digitar(fixture, campo, 'sem pasta');
    expect(estrutura(el)).toEqual({ 'Sem pasta': ['Estoque'] });

    digitar(fixture, campo, 'zzz');
    expect(el.querySelector('.pasta-titulo')).toBeNull();
    expect(el.textContent).toContain('Nenhum relatório encontrado para «zzz»');
    fixture.destroy();
  });

  it('clicar na pasta recolhe e expande apenas os relatorios dela', async () => {
    const fixture = await montar();
    const el: HTMLElement = fixture.nativeElement;
    const cabecalho: HTMLButtonElement = el.querySelector('.pasta-cabecalho')!;
    expect(cabecalho.getAttribute('aria-expanded')).toBe('true');

    cabecalho.click();
    fixture.detectChanges();
    expect(cabecalho.getAttribute('aria-expanded')).toBe('false');
    expect(estrutura(el)).toEqual({ 'Financeiro': [], 'Vendas': ['Vendas por cliente'], 'Sem pasta': ['Estoque'] });

    cabecalho.click();
    fixture.detectChanges();
    expect(estrutura(el)['Financeiro']).toEqual(['Cobrança em aberto']);
    fixture.destroy();
  });

  it('limpar a busca devolve o foco ao campo, seja pelo X ou pelo botao do estado vazio', async () => {
    const fixture = await montar();
    const el: HTMLElement = fixture.nativeElement;
    const campo: HTMLInputElement = el.querySelector('input[type="search"]')!;

    digitar(fixture, campo, 'cobranca');
    (el.querySelector('button[aria-label="Limpar busca"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable(); // o ngModel escreve o valor de volta no campo de forma assincrona
    expect(campo.value).toBe('');
    expect(document.activeElement).toBe(campo);

    campo.blur();
    digitar(fixture, campo, 'zzz');
    const vazio = Array.from(el.querySelectorAll('.empty-state button'))
      .find((b) => b.textContent?.includes('Limpar busca')) as HTMLButtonElement;
    vazio.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(campo.value).toBe('');
    expect(Object.keys(estrutura(el)).length).toBe(3);
    expect(document.activeElement).toBe(campo);
    fixture.destroy();
  });
});

describe('Formulario renderizado de relatorios', () => {
  it('mantem value accessors distintos para lista unica e multipla', async () => {
    await TestBed.configureTestingModule({
      declarations: [FormularioParametrosComponent],
      imports: [CommonModule, ReactiveFormsModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    const fixture = TestBed.createComponent(FormularioParametrosComponent);
    const component = fixture.componentInstance;
    component.parametros = [
      { nome: 'unica', tipo: 'lista', obrigatorio: true, opcoes: [{ valor: 'A', rotulo: 'Ativo' }] },
      { nome: 'multipla', tipo: 'lista', multiplo: true, obrigatorio: true, opcoes: [{ valor: 'A', rotulo: 'Ativo' }] },
    ];
    component.aplicarValores({ unica: 'A', multipla: ['A'] });
    fixture.detectChanges();
    const unica: HTMLSelectElement = fixture.nativeElement.querySelector('#param-unica');
    const multipla: HTMLSelectElement = fixture.nativeElement.querySelector('#param-multipla');
    expect(unica.multiple).toBeFalse();
    expect(multipla.multiple).toBeTrue();
    expect(unica.selectedOptions[0].textContent?.trim()).toBe('Ativo');
    expect(multipla.selectedOptions.length).toBe(1);
    multipla.options[0].selected = false;
    multipla.dispatchEvent(new Event('change'));
    expect(component.formulario.value).toEqual({ unica: 'A', multipla: [] });
    fixture.destroy();
  });
});
