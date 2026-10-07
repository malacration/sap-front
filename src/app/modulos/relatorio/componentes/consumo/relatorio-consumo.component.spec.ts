import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { RelatorioService } from '../../../../sap/service/relatorio.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Subject, of, throwError } from 'rxjs';
import { CHAVE_PASTAS_FECHADAS, RelatorioConsumoComponent } from './relatorio-consumo.component';
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
    localStorage.removeItem(CHAVE_PASTAS_FECHADAS);
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

  /** Segunda instancia (outra aba do navegador): le o localStorage ao nascer, como a primeira. */
  const criarOutro = () => {
    const outro = new RelatorioConsumoComponent(
      new FormBuilder(), service, {} as any,
      jasmine.createSpyObj('ToastrService', ['warning', 'error', 'success']),
    );
    outro.carregarLista();
    return outro;
  };

  beforeEach(() => {
    localStorage.removeItem(CHAVE_PASTAS_FECHADAS);
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

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.removeItem(CHAVE_PASTAS_FECHADAS);
  });

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

  it('lembra as pastas recolhidas: um componente novo volta como o usuario deixou', () => {
    const vendas = component.grupos.find((g) => g.titulo === 'Vendas')!;
    component.alternarPasta(vendas);
    expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!)).toEqual(['vendas']);

    component.ngOnDestroy();
    criar();
    expect(component.pastaAberta(component.grupos.find((g) => g.titulo === 'Vendas')!)).toBeFalse();
    expect(component.pastaAberta(component.grupos.find((g) => g.titulo === 'Financeiro')!)).toBeTrue();
  });

  it('duas abas abertas nao apagam as pastas que a outra recolheu', () => {
    const outra = component;
    const aba2 = criarOutro();
    outra.alternarPasta(outra.grupos.find((g) => g.titulo === 'Vendas')!);
    aba2.alternarPasta(aba2.grupos.find((g) => g.titulo === 'Financeiro')!);
    expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!).sort()).toEqual(['financeiro', 'vendas']);

    // Reabrir uma pasta numa aba tambem nao desfaz o que a outra recolheu.
    aba2.alternarPasta(aba2.grupos.find((g) => g.titulo === 'Financeiro')!);
    expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!)).toEqual(['vendas']);
    aba2.ngOnDestroy();
  });

  it('valor corrompido ou ilegivel no localStorage nao quebra: tudo abre', () => {
    localStorage.setItem(CHAVE_PASTAS_FECHADAS, '{isso nao e json');
    component.ngOnDestroy();
    criar();
    expect(component.grupos.every((g) => component.pastaAberta(g))).toBeTrue();

    localStorage.setItem(CHAVE_PASTAS_FECHADAS, JSON.stringify([1, null, 'vendas', { a: 1 }]));
    component.ngOnDestroy();
    criar();
    expect(component.pastaAberta(component.grupos.find((g) => g.titulo === 'Vendas')!)).toBeFalse();
    expect(component.pastaAberta(component.grupos.find((g) => g.titulo === 'Financeiro')!)).toBeTrue();
  });

  it('selecionar um relatorio reabre a pasta e isso tambem e lembrado', () => {
    service.obter.and.returnValue(new Subject());
    const vendas = component.grupos.find((g) => g.titulo === 'Vendas')!;
    component.alternarPasta(vendas);
    component.selecionar(vendas.itens[0]);
    expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!)).toEqual([]);
  });

  it('recolher todas fecha tudo, menos a pasta do relatorio aberto; abrir todas reabre', () => {
    service.obter.and.returnValue(new Subject());
    component.selecionar(component.grupos.find((g) => g.titulo === 'Financeiro')!.itens[0]);

    component.recolherTodas();
    const abertas = () => component.grupos.filter((g) => component.pastaAberta(g)).map((g) => g.titulo);
    expect(abertas()).toEqual(['Financeiro']);

    component.expandirTodas();
    expect(abertas()).toEqual(['Financeiro', 'Vendas', 'Sem pasta']);
    expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!)).toEqual([]);
  });

  it('recolher todas sem relatorio aberto fecha inclusive "Sem pasta"', () => {
    component.recolherTodas();
    expect(component.grupos.some((g) => component.pastaAberta(g))).toBeFalse();
  });

  it('abrir/recolher todas so aparecem fora da busca e com mais de uma pasta', () => {
    expect(component.mostrarAbrirRecolher).toBeTrue();
    component.buscar('vendas');
    expect(component.mostrarAbrirRecolher).toBeFalse();
    component.buscar('');
    expect(component.mostrarAbrirRecolher).toBeTrue();
  });

  it('a contagem da pasta mostra "N de M" durante a busca', () => {
    const vendas = () => component.grupos.find((g) => g.titulo === 'Vendas')!;
    expect(component.contagemPasta(vendas())).toBe('2');
    component.buscar('cliente');
    expect(component.contagemPasta(vendas())).toBe('1 de 2');
  });

  it('guarda os trechos a destacar por relatorio e por pasta, e nada sem busca', () => {
    expect(component.destaques.size).toBe(0);
    component.buscar('cobr');
    expect(component.destaques.get(2)!.nome.filter((t) => t.marcado).map((t) => t.texto)).toEqual(['Cobr']);
    expect(component.destaquesPasta.get('financeiro')!.some((t) => t.marcado)).toBeFalse();

    component.buscar('financ');
    expect(component.destaquesPasta.get('financeiro')!.filter((t) => t.marcado).map((t) => t.texto)).toEqual(['Financ']);

    component.buscar('');
    expect(component.destaques.size).toBe(0);
    expect(component.destaquesPasta.size).toBe(0);
  });

  it('nao marca o titulo "Sem pasta", que nao e texto dos relatorios', () => {
    component.buscar('sem pasta');
    expect(titulos()).toEqual(['Sem pasta']);
    expect(component.destaquesPasta.size).toBe(0);
  });

  it('durante a busca a ordem e por relevancia: o melhor acerto fica na primeira pasta', () => {
    service.listar.and.returnValue(of([
      item(1, 'Resumo', 'Alfa'),
      item(2, 'Saldo de vendas', 'Beta'),
      item(3, 'Vendas por cliente', 'Zeta'),
    ]));
    component.carregarLista();
    component.buscar('vendas');
    expect(titulos()).toEqual(['Zeta', 'Beta']);
  });

  it('Esc no campo limpa a busca', () => {
    component.buscar('cobr');
    const evento = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    component.aoTeclarNoCampo(evento);
    expect(component.busca).toBe('');
    expect(evento.defaultPrevented).toBeTrue();
    expect(component.grupos.length).toBe(3);
  });

  describe('com subpastas', () => {
    beforeEach(() => {
      service.listar.and.returnValue(of([
        item(1, 'Posição em aberto', 'Financeiro/Contas a pagar'),
        item(2, 'Por cliente', 'Financeiro/Contas a receber'),
        item(3, 'Saldos', 'Financeiro'),
        item(4, 'Frete', 'Logística/Custos'),
      ]));
      component.ngOnDestroy();
      criar();
    });

    const no = (...caminho: string[]) => {
      let nivel = component.grupos;
      let achado;
      for (const titulo of caminho) {
        achado = nivel.find((g) => g.titulo === titulo)!;
        nivel = achado.filhos;
      }
      return achado!;
    };

    it('monta a arvore e conta as subpastas no total da pasta de cima', () => {
      expect(titulos()).toEqual(['Financeiro', 'Logística']);
      expect(no('Financeiro').filhos.map((g) => g.titulo)).toEqual(['Contas a pagar', 'Contas a receber']);
      expect(component.contagemPasta(no('Financeiro'))).toBe('3');
      component.buscar('pagar');
      expect(component.contagemPasta(no('Financeiro'))).toBe('1 de 3');
    });

    it('abrir/recolher todas aparecem mesmo com uma pasta so, se ela tem subpasta', () => {
      service.listar.and.returnValue(of([item(1, 'Frete', 'Logística/Custos')]));
      component.carregarLista();
      expect(component.grupos.length).toBe(1);
      expect(component.mostrarAbrirRecolher).toBeTrue();
    });

    it('recolher todas fecha as pastas de todos os niveis e abrir todas reabre', () => {
      component.recolherTodas();
      expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!).sort()).toEqual([
        'financeiro', 'financeiro/contas a pagar', 'financeiro/contas a receber', 'logistica', 'logistica/custos',
      ]);
      expect(component.pastaAberta(no('Financeiro'))).toBeFalse();
      expect(component.pastaAberta(no('Financeiro', 'Contas a pagar'))).toBeFalse();

      component.expandirTodas();
      expect(component.pastaAberta(no('Financeiro', 'Contas a pagar'))).toBeTrue();
    });

    it('recolher todas poupa a cadeia inteira do relatorio aberto, pasta e subpasta', () => {
      service.obter.and.returnValue(new Subject());
      component.selecionar(no('Financeiro', 'Contas a pagar').itens[0]);
      component.recolherTodas();
      expect(component.pastaAberta(no('Financeiro'))).toBeTrue();
      expect(component.pastaAberta(no('Financeiro', 'Contas a pagar'))).toBeTrue();
      expect(component.pastaAberta(no('Financeiro', 'Contas a receber'))).toBeFalse();
      expect(component.pastaAberta(no('Logística'))).toBeFalse();
    });

    it('recolher todas reabre a cadeia do relatorio aberto se ela ja estava recolhida', () => {
      service.obter.and.returnValue(new Subject());
      component.selecionar(no('Financeiro', 'Contas a pagar').itens[0]);
      component.alternarPasta(no('Financeiro'));          // o usuario recolhe a pasta do relatorio aberto
      expect(component.pastaAberta(no('Financeiro'))).toBeFalse();

      component.recolherTodas();
      expect(component.pastaAberta(no('Financeiro'))).toBeTrue();
      expect(component.pastaAberta(no('Financeiro', 'Contas a pagar'))).toBeTrue();
      expect(component.pastaAberta(no('Logística'))).toBeFalse();
      expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!)).not.toContain('financeiro');
    });

    it('selecionar um relatorio reabre a pasta e a subpasta recolhidas dele', () => {
      service.obter.and.returnValue(new Subject());
      component.alternarPasta(no('Financeiro', 'Contas a pagar'));
      component.alternarPasta(no('Financeiro'));
      expect(component.pastaAberta(no('Financeiro'))).toBeFalse();

      component.selecionar(no('Financeiro', 'Contas a pagar').itens[0]);
      expect(component.pastaAberta(no('Financeiro'))).toBeTrue();
      expect(component.pastaAberta(no('Financeiro', 'Contas a pagar'))).toBeTrue();
      expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!)).toEqual([]);
    });

    it('as pastas recolhidas de um nivel so ficam lembradas como na versao de um nivel', () => {
      localStorage.setItem(CHAVE_PASTAS_FECHADAS, JSON.stringify(['financeiro']));
      component.ngOnDestroy();
      criar();
      expect(component.pastaAberta(no('Financeiro'))).toBeFalse();
      expect(component.pastaAberta(no('Logística'))).toBeTrue();
    });

    it('guarda os trechos a destacar no nome da subpasta, nao so no da pasta', () => {
      component.buscar('pagar');
      const marcados = component.destaquesPasta.get('financeiro/contas a pagar')!.filter((t) => t.marcado);
      expect(marcados.length).toBe(1);
      expect(marcados[0].texto.toLowerCase()).toBe('pagar');
      expect(component.destaquesPasta.get('financeiro')!.some((t) => t.marcado)).toBeFalse();
    });
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

  afterEach(() => localStorage.removeItem(CHAVE_PASTAS_FECHADAS));

  async function montar(dados = [
    item(1, 'Vendas por cliente', 'Vendas'),
    item(2, 'Cobrança em aberto', 'Financeiro'),
    item(3, 'Estoque'),
  ]) {
    localStorage.removeItem(CHAVE_PASTAS_FECHADAS);
    const service = jasmine.createSpyObj('RelatorioService', ['listar', 'listarTodos', 'obter', 'lerErro']);
    service.listar.and.returnValue(of(dados));
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

  /**
   * Caminho da pasta ("Financeiro / Contas a pagar") -> nomes dos relatorios que estao DIRETAMENTE nela:
   * prova a associacao de cada relatorio a propria pasta, nao so as duas listas soltas.
   */
  const estrutura = (el: HTMLElement): Record<string, (string | undefined)[]> => {
    const saida: Record<string, (string | undefined)[]> = {};
    el.querySelectorAll('.lista-relatorios .no-pasta').forEach((no) => {
      const proprios = no.querySelectorAll(':scope > .no-pasta-corpo > .list-group .relatorio-select .font-weight-bold');
      saida[no.getAttribute('data-caminho')!] = Array.from(proprios).map((n) => n.textContent?.trim());
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

  it('destaca o trecho que casou no nome, e a contagem da pasta mostra "N de M"', async () => {
    const fixture = await montar();
    const el: HTMLElement = fixture.nativeElement;
    const campo: HTMLInputElement = el.querySelector('input[type="search"]')!;

    digitar(fixture, campo, 'cobr');
    const marcas = Array.from(el.querySelectorAll('.relatorio-select mark')).map((m) => m.textContent);
    expect(marcas).toEqual(['Cobr']);
    expect(el.querySelector('.relatorio-select .font-weight-bold')!.textContent!.replace(/\s+/g, ' ').trim())
      .toBe('Cobrança em aberto');

    digitar(fixture, campo, 'financ');
    expect(Array.from(el.querySelectorAll('.pasta-titulo mark')).map((m) => m.textContent)).toEqual(['Financ']);

    digitar(fixture, campo, 'cliente');
    expect(el.querySelector('.pasta-cabecalho .badge')!.textContent!.trim()).toBe('1 de 1');
    digitar(fixture, campo, '');
    expect(el.querySelectorAll('mark').length).toBe(0);
    fixture.destroy();
  });

  const comSubpastas = () => [
    item(1, 'Posição em aberto', 'Financeiro/Contas a pagar'),
    item(2, 'Vencimentos', 'Financeiro/Contas a pagar'),
    item(3, 'Por cliente', 'Financeiro/Contas a receber'),
    item(4, 'Saldos', 'Financeiro'),
    item(5, 'Comissões', 'Vendas'),
    item(6, 'Estoque'),
  ];

  it('mostra as subpastas dentro da pasta, com o total de cada uma', async () => {
    const fixture = await montar(comSubpastas());
    const el: HTMLElement = fixture.nativeElement;
    expect(estrutura(el)).toEqual({
      'Financeiro': ['Saldos'],
      'Financeiro / Contas a pagar': ['Posição em aberto', 'Vencimentos'],
      'Financeiro / Contas a receber': ['Por cliente'],
      'Vendas': ['Comissões'],
      'Sem pasta': ['Estoque'],
    });
    const selo = (caminho: string) =>
      el.querySelector(`.no-pasta[data-caminho="${caminho}"] > .pasta-cabecalho .badge`)!.textContent!.trim();
    expect(selo('Financeiro')).toBe('4');
    expect(selo('Financeiro / Contas a pagar')).toBe('2');
    expect(el.querySelector('.no-pasta[data-caminho="Financeiro / Contas a pagar"] > .pasta-cabecalho')!
      .classList.contains('subpasta')).toBeTrue();
    expect(el.querySelector('.no-pasta[data-caminho="Financeiro"] > .pasta-cabecalho')!
      .classList.contains('subpasta')).toBeFalse();
    fixture.destroy();
  });

  it('a hierarquia e semantica: listas aninhadas e rotulo com nome e contagem para leitor de tela', async () => {
    const fixture = await montar(comSubpastas());
    const el: HTMLElement = fixture.nativeElement;
    const financeiro = el.querySelector('.no-pasta[data-caminho="Financeiro"]')!;

    expect(financeiro.tagName).toBe('LI');
    expect(financeiro.parentElement!.tagName).toBe('UL');
    const subpasta = financeiro.querySelector('.no-pasta[data-caminho="Financeiro / Contas a pagar"]')!;
    expect(subpasta.tagName).toBe('LI');
    expect(subpasta.parentElement!.tagName).toBe('UL');
    expect(financeiro.contains(subpasta.parentElement)).toBeTrue();       // ul dentro do li da pasta
    expect(subpasta.querySelector('ul.list-group li.relatorio-list-item')).not.toBeNull();

    // list-style: none faz o Safari/VoiceOver descartar a lista; role explicito a restaura.
    el.querySelectorAll('ul').forEach((lista) => expect(lista.getAttribute('role')).withContext(lista.className).toBe('list'));

    const rotulo = (caminho: string) => el.querySelector(`.no-pasta[data-caminho="${caminho}"] > .pasta-cabecalho`)!
      .getAttribute('aria-label');
    expect(rotulo('Financeiro')).toBe('Financeiro, 4 relatórios');
    expect(rotulo('Vendas')).toBe('Vendas, 1 relatório');

    const campo: HTMLInputElement = el.querySelector('input[type="search"]')!;
    digitar(fixture, campo, 'receber');
    expect(rotulo('Financeiro')).toBe('Financeiro, 1 de 4 relatórios');
    fixture.destroy();
  });

  it('recolher a pasta esconde tudo o que tem dentro; reabrir devolve, e a subpasta segue como estava', async () => {
    const fixture = await montar(comSubpastas());
    const el: HTMLElement = fixture.nativeElement;
    const cabecalho = (caminho: string) =>
      el.querySelector(`.no-pasta[data-caminho="${caminho}"] > .pasta-cabecalho`) as HTMLButtonElement;

    cabecalho('Financeiro / Contas a pagar').click();
    fixture.detectChanges();
    expect(estrutura(el)['Financeiro / Contas a pagar']).toEqual([]);

    cabecalho('Financeiro').click();
    fixture.detectChanges();
    expect(Object.keys(estrutura(el))).toEqual(['Financeiro', 'Vendas', 'Sem pasta']);
    expect(estrutura(el)['Financeiro']).toEqual([]);

    cabecalho('Financeiro').click();
    fixture.detectChanges();
    expect(estrutura(el)['Financeiro']).toEqual(['Saldos']);
    expect(estrutura(el)['Financeiro / Contas a pagar']).toEqual([]);          // continua recolhida
    expect(estrutura(el)['Financeiro / Contas a receber']).toEqual(['Por cliente']);
    fixture.destroy();
  });

  it('a busca abre o caminho ate o achado e destaca o nome da subpasta', async () => {
    const fixture = await montar(comSubpastas());
    const el: HTMLElement = fixture.nativeElement;
    const campo: HTMLInputElement = el.querySelector('input[type="search"]')!;

    digitar(fixture, campo, 'receber');
    expect(estrutura(el)).toEqual({
      'Financeiro': [],
      'Financeiro / Contas a receber': ['Por cliente'],
    });
    const marcas = Array.from(el.querySelectorAll('.pasta-titulo mark')).map((m) => m.textContent);
    expect(marcas.length).toBe(1);
    expect(marcas[0]!.toLowerCase()).toBe('receber');
    // O selo mostra o que apareceu de quanto existe, com as subpastas somadas.
    expect(el.querySelector('.no-pasta[data-caminho="Financeiro"] > .pasta-cabecalho .badge')!.textContent!.trim())
      .toBe('1 de 4');
    fixture.destroy();
  });

  it('recolher todas e abrir todas pelos botoes do cabecalho', async () => {
    const fixture = await montar();
    const el: HTMLElement = fixture.nativeElement;
    const botao = (rotulo: string) => el.querySelector(`button[aria-label="${rotulo}"]`) as HTMLButtonElement;

    botao('Recolher todas as pastas').click();
    fixture.detectChanges();
    expect(estrutura(el)).toEqual({ 'Financeiro': [], 'Vendas': [], 'Sem pasta': [] });
    expect(JSON.parse(localStorage.getItem(CHAVE_PASTAS_FECHADAS)!).sort()).toEqual(['', 'financeiro', 'vendas']);

    botao('Abrir todas as pastas').click();
    fixture.detectChanges();
    expect(estrutura(el)['Vendas']).toEqual(['Vendas por cliente']);

    const campo: HTMLInputElement = el.querySelector('input[type="search"]')!;
    digitar(fixture, campo, 'vendas');
    expect(botao('Recolher todas as pastas')).toBeNull();
    fixture.destroy();
  });

  it('Esc limpa a busca e a tecla / leva o foco ao campo, exceto ao digitar em outro campo', async () => {
    const fixture = await montar();
    const el: HTMLElement = fixture.nativeElement;
    const campo: HTMLInputElement = el.querySelector('input[type="search"]')!;

    digitar(fixture, campo, 'zzz');
    campo.focus();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(campo.value).toBe('');
    expect(Object.keys(estrutura(el)).length).toBe(3);

    (document.activeElement as HTMLElement).blur();
    const barra = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(barra);
    expect(document.activeElement).toBe(campo);
    expect(barra.defaultPrevented).toBeTrue();

    const outro = document.createElement('input');
    document.body.appendChild(outro);
    outro.focus();
    const barraNoOutro = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    outro.dispatchEvent(barraNoOutro);
    expect(document.activeElement).toBe(outro);
    expect(barraNoOutro.defaultPrevented).toBeFalse();

    const comCtrl = new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(comCtrl);
    expect(comCtrl.defaultPrevented).toBeFalse();
    outro.remove();
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
