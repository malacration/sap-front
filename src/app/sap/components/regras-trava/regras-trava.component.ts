import { Component, OnInit } from '@angular/core';
import { Observable, lastValueFrom } from 'rxjs';
import { TravaRegraService, Regra } from '../../service/trava-regra.service';
import { AlertService } from '../../../shared/service/alert.service';

/**
 * Administração do catálogo de regras de trava (UDO TRAVA_REGRA no SAP).
 * Listar / adicionar / editar / ativar-desativar / apagar. Nada aqui liga a
 * regra numa trava — isso continua sendo feito na TransactionNotification.
 */
@Component({
  selector: 'app-regras-trava',
  templateUrl: './regras-trava.component.html',
})
export class RegrasTravaComponent implements OnInit {

  regras: Regra[] = [];
  carregando = false;

  editando = false;
  form: Regra = this.novoForm();

  constructor(
    private service: TravaRegraService,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.service.getRegras(true).subscribe({
      next: r => {
        this.regras = r;
        this.carregando = false;
        // sem clobbering: só ajusta o default quando não está editando e o form está limpo
        if (!this.editando && !this.form.codigo) {
          this.form.ordem = this.proximaOrdem();
        }
      },
      error: () => { this.carregando = false; },
    });
  }

  /** Próxima ordem = maior ordem cadastrada + 1 (nova regra vai para o fim). */
  private proximaOrdem(): number {
    return this.regras.reduce((max, r) => Math.max(max, r.ordem ?? 0), 0) + 1;
  }

  private novoForm(): Regra {
    return { codigo: '', descricao: '', ordem: this.proximaOrdem(), ativo: true };
  }

  novo(): void {
    this.editando = false;
    this.form = this.novoForm();
  }

  editar(r: Regra): void {
    this.editando = true;
    this.form = { ...r };
  }

  salvar(): void {
    const codigo = (this.form.codigo || '').trim().toUpperCase();
    if (!codigo || !(this.form.descricao || '').trim()) {
      this.alert.error('Informe código e descrição.');
      return;
    }
    this.form.codigo = codigo;
    this.recarregarCom(this.service.salvar(this.form, this.editando)).then(ok => {
      if (ok) { this.novo(); }
    });
  }

  alternarAtivo(r: Regra): void {
    this.recarregarCom(this.service.salvar({ ...r, ativo: !r.ativo }, true));
  }

  apagar(r: Regra): void {
    this.alert.confirm(`Apagar a regra "${r.codigo}"?`).then(res => {
      if (res.isConfirmed) {
        this.recarregarCom(this.service.deletar(r.codigo));
      }
    });
  }

  /**
   * Executa a operação e recarrega a lista mostrando o overlay "Carregando..."
   * durante todo o round-trip com o SAP (que é lento). Erros já são exibidos
   * pelo ErrorInterceptor global. Retorna true se deu certo.
   */
  private async recarregarCom(obs: Observable<any>): Promise<boolean> {
    const tarefa = (async () => {
      await lastValueFrom(obs);
      return await lastValueFrom(this.service.getRegras(true));
    })();
    try {
      this.regras = await this.alert.loading(tarefa);
      if (!this.editando && !this.form.codigo) {
        this.form.ordem = this.proximaOrdem();
      }
      return true;
    } catch {
      return false;
    }
  }
}
