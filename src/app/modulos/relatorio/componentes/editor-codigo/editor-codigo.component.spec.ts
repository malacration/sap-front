import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorCodigoComponent } from './editor-codigo.component';

describe('Editor de relatorios', () => {
  let fixture: ComponentFixture<EditorCodigoComponent>;
  afterEach(() => fixture?.destroy());

  it('carrega Handlebars com o realce de HTML e expressoes', () => {
    TestBed.configureTestingModule({ declarations: [EditorCodigoComponent] });
    fixture = TestBed.createComponent(EditorCodigoComponent);
    fixture.componentInstance.modo = 'handlebars';
    fixture.componentInstance.valor = '<h1>{{meta.nome}}</h1>';
    expect(() => fixture.detectChanges()).not.toThrow();
    const cm = (window as any).CodeMirror;
    expect(typeof cm.defineSimpleMode).toBe('function');
    expect(cm.getMode({}, { name: 'handlebars', base: 'text/html' }).name).toBe('handlebars');
    expect(fixture.nativeElement.querySelector('.CodeMirror')).toBeTruthy();
  });
});
