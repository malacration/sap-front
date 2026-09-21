import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Parametro } from '../../modelos/relatorio.model';

/**
 * Formulario de parametros gerado a partir de `parametros[]` do relatorio.
 *
 * Extraido da aba Executar para ser usado tambem na pre-visualizacao da
 * autoria. As regras de conversao (datas em ISO, numero, booleano, multiplos,
 * cadastros) ficam num lugar so: duas copias divergiriam, e o relatorio
 * pre-visualizado receberia parametros diferentes do executado.
 */
@Component({
  selector: 'app-formulario-parametros',
  templateUrl: './formulario-parametros.component.html',
  styleUrls: ['./formulario-parametros.component.scss'],
})
export class FormularioParametrosComponent implements OnDestroy {
  /** Valores prontos para envio, emitidos a cada alteracao do formulario. */
  @Output() paramsChange = new EventEmitter<Record<string, unknown>>();

  formulario: FormGroup = this.fb.group({});
  lista: Parametro[] = [];

  /** Evita o eco: aplicar valores vindos do JSON nao deve reescrever o JSON. */
  private aplicando = false;
  private inscricao?: Subscription;

  constructor(private readonly fb: FormBuilder) {}

  @Input()
  set parametros(parametros: Parametro[] | null | undefined) {
    this.lista = parametros || [];
    this.montarFormulario(this.lista);
  }

  get parametros(): Parametro[] {
    return this.lista;
  }

  get valido(): boolean {
    return this.formulario.valid;
  }

  marcarTodos(): void {
    this.formulario.markAllAsTouched();
  }

  /** Valores no formato que a API espera (datas ISO, numeros, booleanos). */
  valores(): Record<string, unknown> {
    const resultado: Record<string, unknown> = {};
    this.lista.forEach((parametro) => {
      const valor = this.formulario.get(parametro.nome)?.value;
      if (parametro.multiplo) {
        resultado[parametro.nome] = Array.isArray(valor) && valor.length ? valor : null;
      } else if (parametro.tipo === 'date' || parametro.tipo === 'datetime') {
        // O app-campo-data ja entrega string ISO.
        resultado[parametro.nome] = valor || null;
      } else if (parametro.tipo === 'numero') {
        resultado[parametro.nome] = valor === '' || valor == null ? null : Number(valor);
      } else if (parametro.tipo === 'booleano') {
        resultado[parametro.nome] = Boolean(valor);
      } else {
        resultado[parametro.nome] = valor;
      }
    });
    return resultado;
  }

  /**
   * Caminho inverso: JSON editado a mao -> formulario.
   *
   * So toca parametros declarados; chave desconhecida no JSON e ignorada aqui
   * (quem envia o JSON e o chamador, e a API recusa parametro sobrando).
   */
  aplicarValores(valores: Record<string, unknown>): void {
    this.aplicando = true;
    try {
      this.lista.forEach((parametro) => {
        if (!(parametro.nome in valores)) return;
        this.formulario.get(parametro.nome)?.setValue(this.paraControle(parametro, valores[parametro.nome]));
      });
    } finally {
      this.aplicando = false;
    }
  }

  campoInvalido(parametro: Parametro): boolean {
    const controle = this.formulario.get(parametro.nome);
    return !!controle && controle.invalid && (controle.dirty || controle.touched);
  }

  rotulo(parametro: Parametro): string {
    return parametro.rotulo || parametro.nome;
  }

  cadastro(parametro: Parametro): boolean {
    return ['filial', 'vendedor', 'parceiro_negocio', 'item', 'localidade'].includes(parametro.tipo);
  }

  atualizarCadastro(parametro: Parametro, valor: unknown): void {
    const controle = this.formulario.get(parametro.nome);
    controle?.setValue(valor);
    controle?.markAsDirty();
    controle?.markAsTouched();
  }

  identificarParametro(_: number, parametro: Parametro): string {
    return parametro.nome;
  }

  ngOnDestroy(): void {
    this.inscricao?.unsubscribe();
  }

  private montarFormulario(parametros: Parametro[]): void {
    this.inscricao?.unsubscribe();
    const controles: Record<string, FormControl> = {};
    parametros.forEach((parametro) => {
      const validadores = parametro.obrigatorio ? [Validators.required] : [];
      controles[parametro.nome] = new FormControl(this.valorInicial(parametro), validadores);
    });
    this.formulario = this.fb.group(controles);
    this.inscricao = this.formulario.valueChanges.subscribe(() => {
      if (!this.aplicando) this.paramsChange.emit(this.valores());
    });
    // Emite o estado inicial, para quem espelha em JSON ja comecar preenchido.
    Promise.resolve().then(() => this.paramsChange.emit(this.valores()));
  }

  private valorInicial(parametro: Parametro): unknown {
    if (parametro.multiplo) return Array.isArray(parametro.padrao) ? [...parametro.padrao] : [];
    if (parametro.padrao == null) {
      return parametro.tipo === 'booleano' ? false : null;
    }
    return this.paraControle(parametro, parametro.padrao);
  }

  /** Converte um valor de JSON/YAML para o que o controle espera. */
  private paraControle(parametro: Parametro, valor: unknown): unknown {
    if (parametro.multiplo) return Array.isArray(valor) ? [...valor] : [];
    if (valor == null) return parametro.tipo === 'booleano' ? false : null;
    // js-yaml le `padrao: 2026-09-18` (sem aspas) como Date em UTC; o controle quer string ISO.
    if (valor instanceof Date && (parametro.tipo === 'date' || parametro.tipo === 'datetime')) {
      return Number.isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, parametro.tipo === 'date' ? 10 : 19);
    }
    if (parametro.tipo === 'numero') return Number(valor);
    if (parametro.tipo === 'booleano') return valor === true || valor === 'true';
    return valor;
  }
}
