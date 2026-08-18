import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { SelectComponent } from './select.component';
import { Option } from '../../../sap/model/form/option';

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
