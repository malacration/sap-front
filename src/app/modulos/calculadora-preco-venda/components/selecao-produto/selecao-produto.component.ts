import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Produto } from '../../models/produto';
import { CalculadoraService } from '../../service/calculadora.service';
import { AlertService } from '../../../../shared/service/alert.service';

@Component({
  selector: 'selecao-produto-calc',
  templateUrl: './selecao-produto.component.html',
})
export class SelecaoProdutoComponent implements OnInit {
  

  constructor(private service : CalculadoraService, private alertService : AlertService){

  }

  loading = false
  segundos: number = 0;
  start = "PAC0000001"
  end   = "PAC9999999"
  private intervalId: any;


  @Output()
  selecaoProdutos : EventEmitter<Array<Produto>> = new EventEmitter<Array<Produto>>();

  ngOnInit(): void {

  }

  selecionaTodosProdutos(){
    this.loading = true
    this.resetTimer()
    this.service.range(this.start,this.end).subscribe({next : (it => {
      this.selecaoProdutos.emit(it)
      this.loading = false
      this.stopTimer()
      if(it.length == 0)
        this.alertService.info("Nenhum registro foi encontrado com os criterios"+this.start + " - "+this.end)
    }),
    error : (it => {
      this.loading = false
      this.stopTimer()
    })
   })
  }

  startTimer(): void {
    if (!this.intervalId) { // Evita múltiplas execuções do timer
      this.intervalId = setInterval(() => {
        this.segundos++;
      }, 1000);
    }
  }

  stopTimer(): void {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  resetTimer(): void {
    this.stopTimer();
    this.segundos = 0;
    this.startTimer();
  }

  formatTime(): string {
    const minutos = Math.floor(this.segundos / 60);
    const segundos = this.segundos % 60;
    return `${this.pad(minutos)}:${this.pad(segundos)}`;
  }

  private pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

}


