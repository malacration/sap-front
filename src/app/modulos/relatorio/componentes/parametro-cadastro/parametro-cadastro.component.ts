import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { Subject, throwError } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Parametro } from '../../modelos/relatorio.model';
import { SalesPersonService } from '../../../../sap/service/sales-person.service';
import { ItemService } from '../../../../sap/service/item.service';
import { BusinessPartnerService } from '../../../sap-shared/_services/business-partners.service';
import { LocalidadeService } from '../../../sap-shared/_services/localidade.service';
import { SearchService } from '../../../../sap/service/search.service';
import { Column } from '../../../../shared/components/table/column.model';

/** Registro fechado de cadastros: o YAML nunca fornece URL, SQL ou nome de propriedade. */
@Component({
  selector: 'app-parametro-cadastro',
  templateUrl: './parametro-cadastro.component.html',
})
export class ParametroCadastroComponent implements OnChanges, OnDestroy {
  @Input() parametro!: Parametro;
  @Input() valor: any;
  @Output() valorChange = new EventEmitter<any>();
  service?: SearchService<any>;
  colunas: Column[] = [];
  erro = '';
  private campoCodigo = '';
  private campoNome = '';
  private nomes = new Map<string | number, string>();
  private readonly destruir = new Subject<void>();

  constructor(
    private vendedores: SalesPersonService,
    private parceiros: BusinessPartnerService,
    private itens: ItemService,
    private localidades: LocalidadeService,
  ) {}

  ngOnChanges(changes: import('@angular/core').SimpleChanges): void {
    if (!changes.parametro) return;
    this.nomes.clear();
    this.erro = '';
    const cadastros = {
      vendedor: { service: this.vendedores, codigo: 'SalesEmployeeCode', nome: 'SalesEmployeeName' },
      parceiro_negocio: { service: this.parceiros, codigo: 'CardCode', nome: 'CardName' },
      item: { service: { search: (termo: any) => this.itens.searchItem(termo) }, codigo: 'ItemCode', nome: 'ItemDescription' },
      localidade: { service: this.localidades, codigo: 'Code', nome: 'Name' },
    };
    const cadastro = cadastros[this.parametro.tipo];
    this.service = undefined;
    if (!cadastro) return;
    this.campoCodigo = cadastro.codigo;
    this.campoNome = cadastro.nome;
    this.colunas = [new Column('Código', cadastro.codigo), new Column('Nome', cadastro.nome)];
    this.service = { search: (termo: any) => {
      this.erro = '';
      return cadastro.service.search(termo).pipe(
        takeUntil(this.destruir),
        catchError(error => {
          this.erro = 'Não foi possível buscar o cadastro. Tente novamente.';
          return throwError(() => error);
        }),
      );
    }};
  }

  get selecionados(): Array<string | number> {
    return this.parametro.multiplo ? (this.valor || []) : this.valor == null ? [] : [this.valor];
  }

  descricao(codigo: string | number): string {
    const nome = this.nomes.get(codigo);
    return nome ? `${codigo} — ${nome}` : String(codigo);
  }

  selecionar(registro: any): void {
    // app-search.clear() emite undefined; não deve apagar as escolhas já acumuladas.
    if (!registro || registro[this.campoCodigo] == null) return;
    const codigo = this.parametro.tipo === 'vendedor'
      ? Number(registro[this.campoCodigo]) : String(registro[this.campoCodigo]);
    this.nomes.set(codigo, String(registro[this.campoNome] || ''));
    this.atualizar(this.parametro.multiplo ? [...new Set([...this.selecionados, codigo])] : codigo);
  }

  selecionarFiliais(registros: any): void {
    const codigo = (registro: any) => Number(registro.Bplid ?? registro.BPLID);
    this.atualizar(this.parametro.multiplo ? (registros || []).map(codigo) : registros ? codigo(registros) : null);
  }

  remover(codigo: string | number): void {
    this.atualizar(this.parametro.multiplo ? this.selecionados.filter(item => item !== codigo) : null);
  }

  private atualizar(valor: any): void {
    this.valor = valor;
    this.valorChange.emit(valor);
  }

  ngOnDestroy(): void {
    this.destruir.next();
    this.destruir.complete();
  }
}
