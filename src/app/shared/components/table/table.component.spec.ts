import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TableComponent } from './table.component';
import { Column } from './column.model';
import { SafeHtmlDirective } from '../../directives/safe-html/safe-html.directive';
import { AlertService } from '../../service/alert.service';

describe('TableComponent posicao da coluna de acoes', () => {
  let fixture: ComponentFixture<TableComponent>;
  let component: TableComponent;

  class Linha {
    constructor(public Nome: string) {}
    getActions() {
      return [];
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TableComponent, SafeHtmlDirective],
      providers: [{ provide: AlertService, useValue: {} }],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    component.definition = [new Column('Tipo', 'Nome'), new Column('Cliente', 'Nome')];
    component.content = [new Linha('Cliente Teste')];
    component.actionsLabel = 'Ações';
  });

  function cabecalhos(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('thead th')).map((th: any) => th.textContent.trim());
  }

  it('por padrao a coluna de acoes continua sendo a ultima', () => {
    // Default preservado de proposito: ~20 telas usam essa tabela e nenhuma pediu a troca.
    fixture.detectChanges();

    expect(cabecalhos()).toEqual(['Tipo', 'Cliente', 'Ações']);
  });

  it('com actionsFirst a coluna de acoes vai pro inicio', () => {
    component.actionsFirst = true;

    fixture.detectChanges();

    expect(cabecalhos()).toEqual(['Ações', 'Tipo', 'Cliente']);
  });

  it('a celula de acoes acompanha o cabecalho, senao os dados saem trocados de coluna', () => {
    component.actionsFirst = true;

    fixture.detectChanges();

    const celulas = fixture.nativeElement.querySelectorAll('tbody tr td');
    expect(celulas[0].querySelector('app-action, div')).toBeTruthy();
    expect(celulas.length).toBe(3);
  });

  it('linha sem getActions rende celula vazia, nao desloca as colunas', () => {
    // O <th> de acoes existe se QUALQUER linha tem acao, mas o <td> era por linha: com
    // actionsFirst, a linha sem getActions escorregava toda pra esquerda e cada valor
    // aparecia sob o cabecalho do vizinho.
    component.actionsFirst = true;
    component.content = [new Linha('Com ações'), { Nome: 'Sem ações' }];

    fixture.detectChanges();

    const linhas = fixture.nativeElement.querySelectorAll('tbody tr');
    const colunasPorLinha = Array.from(linhas).map((tr: any) => tr.querySelectorAll('td').length);
    expect(colunasPorLinha).toEqual([3, 3]);

    const semAcoes = linhas[1].querySelectorAll('td');
    expect(semAcoes[0].querySelector('app-action')).toBeNull();
    expect(semAcoes[1].textContent).toContain('Sem ações');
  });
});
