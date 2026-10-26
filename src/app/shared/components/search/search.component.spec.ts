import { Subject, of, throwError } from 'rxjs';
import { SearchComponent } from './search.component';
import { Page } from '../../../sap/model/page.model';

describe('SearchComponent - busca', () => {

  let component: SearchComponent<any>;
  let selecionados: Array<any>;

  function pagina(content: Array<any>, nextLink: string = undefined): Page<any> {
    const page = new Page<any>();
    page.content = content;
    page.nextLink = nextLink;
    return page;
  }

  beforeEach(() => {
    selecionados = [];
    component = new SearchComponent<any>();
    component.contentSelected.subscribe(item => selecionados.push(item));
    component.modalSelect = { clear: () => {} } as any;
  });

  function comResultado(page: Page<any>) {
    component.service = { search: () => of(page) } as any;
  }

  /** Resultado unico fica na lista para o usuario escolher: nada e selecionado sozinho. */
  it('nao seleciona sozinho quando a busca retorna um item', () => {
    comResultado(pagina([{ ItemCode: 'PAC0000069' }]));

    component.searchService('OX BEEF');

    expect(selecionados).toEqual([]);
    expect(component.resultadoBusca.content).toEqual([{ ItemCode: 'PAC0000069' }]);
  });

  /**
   * Duas buscas em voo disputavam o mesmo resultadoBusca. A resposta atrasada da PRIMEIRA chegava
   * depois de a segunda ter limpado a lista e a tela mostrava o resultado da consulta errada.
   */
  it('descarta resposta atrasada de uma busca ja superada', () => {
    const primeira = new Subject<Page<any>>();
    const segunda = new Subject<Page<any>>();
    const respostas = [primeira, segunda];
    component.service = { search: () => respostas.shift()!.asObservable() } as any;

    component.searchService('MAURO');
    component.searchService('FRISACRE');

    //a primeira responde DEPOIS da segunda ter comecado
    primeira.next(pagina([{ CardCode: 'CLI-ERRADO' }]));

    expect(component.resultadoBusca.content).toEqual([]);
  });

  it('a resposta da busca vigente continua valendo', () => {
    const primeira = new Subject<Page<any>>();
    const segunda = new Subject<Page<any>>();
    const respostas = [primeira, segunda];
    component.service = { search: () => respostas.shift()!.asObservable() } as any;

    component.searchService('MAURO');
    component.searchService('FRISACRE');

    primeira.next(pagina([{ CardCode: 'CLI-ERRADO' }]));
    segunda.next(pagina([{ CardCode: 'CLI-CERTO' }]));

    expect(component.resultadoBusca.content).toEqual([{ CardCode: 'CLI-CERTO' }]);
  });

  /** Pagina que chega depois de uma busca nova pertence a consulta antiga. */
  it('descarta pagina atrasada quando uma busca nova comecou', () => {
    const pagina2 = new Subject<Page<any>>();
    const buscaNova = new Subject<Page<any>>();
    const respostas = [pagina2, buscaNova];
    component.service = { search: () => respostas.shift()!.asObservable() } as any;

    component.changePageService('OX');
    component.searchService('BOV');

    pagina2.next(pagina([{ ItemCode: 'ANTIGO' }]));

    expect(component.resultadoBusca.content).toEqual([]);
  });

  it('busca que falha nao deixa o loading ligado', () => {
    component.service = { search: () => throwError(() => new Error('rede')) } as any;

    component.searchService('OX');

    expect(component.loading).toBeFalse();
  });
});
