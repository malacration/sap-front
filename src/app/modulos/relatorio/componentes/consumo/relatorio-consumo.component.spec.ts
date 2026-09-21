import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
