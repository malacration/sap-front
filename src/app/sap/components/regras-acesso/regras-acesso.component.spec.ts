import { Subject } from 'rxjs';
import { VersaoCompleta, VersaoResumo } from '../../service/regras-acesso.service';
import { RegrasAcessoComponent } from './regras-acesso.component';

describe('RegrasAcessoComponent.verMudancas', () => {
  const resumo = (versao: number) => ({ versao } as VersaoResumo);
  const completa = (versao: number) => ({ resumo: { versao }, diff: [] } as unknown as VersaoCompleta);

  let pedidos: Map<number, Subject<VersaoCompleta>>;
  let chamadas: number[];
  let componente: RegrasAcessoComponent;

  beforeEach(() => {
    pedidos = new Map();
    chamadas = [];
    const service = {
      versao: (numero: number) => {
        chamadas.push(numero);
        const pedido = new Subject<VersaoCompleta>();
        pedidos.set(numero, pedido);
        return pedido;
      },
    };
    componente = new RegrasAcessoComponent(service as any, {} as any, {} as any, { config: [] } as any);
  });

  const responder = (numero: number) => {
    pedidos.get(numero)?.next(completa(numero));
    pedidos.get(numero)?.complete();
  };

  it('mostra o relogio enquanto busca e abre quando a resposta chega', () => {
    componente.verMudancas(resumo(6));
    expect(componente.carregandoVersao).toBe(6);
    responder(6);
    expect(componente.versaoAberta?.resumo.versao).toBe(6);
    expect(componente.carregandoVersao).toBeUndefined();
  });

  it('a segunda abertura da mesma versao vem do cache, sem nova chamada', () => {
    componente.verMudancas(resumo(6));
    responder(6);
    componente.verMudancas(resumo(6));
    expect(componente.versaoAberta).toBeUndefined();
    componente.verMudancas(resumo(6));
    expect(chamadas).toEqual([6]);
    expect(componente.versaoAberta?.resumo.versao).toBe(6);
  });

  it('erro libera o botao para tentar de novo', () => {
    componente.verMudancas(resumo(6));
    pedidos.get(6)?.error(new Error('SAP fora do ar'));
    expect(componente.carregandoVersao).toBeUndefined();
    componente.verMudancas(resumo(6));
    expect(chamadas).toEqual([6, 6]);
  });

  it('abrir uma versao do cache cancela a leitura pendente de outra', () => {
    componente.verMudancas(resumo(5));
    responder(5);
    componente.verMudancas(resumo(5));
    componente.verMudancas(resumo(6));
    expect(componente.carregandoVersao).toBe(6);

    componente.verMudancas(resumo(5));
    expect(componente.versaoAberta?.resumo.versao).toBe(5);
    expect(componente.carregandoVersao).toBeUndefined();

    responder(6);
    expect(componente.versaoAberta?.resumo.versao).toBe(5);
  });

  it('clicar em outra versao enquanto uma carrega fica com a ultima escolhida', () => {
    componente.verMudancas(resumo(4));
    componente.verMudancas(resumo(3));
    responder(4);
    expect(componente.versaoAberta).toBeUndefined();
    responder(3);
    expect(componente.versaoAberta?.resumo.versao).toBe(3);
  });
});
