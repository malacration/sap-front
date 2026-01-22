import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'selecao-produto-calc',
  templateUrl: './selecao-produto.component.html',
})
export class SelecaoProdutoComponent implements OnInit {
  

  constructor(){}

  loading = false
  segundos: number = 0;
  start = "PAC0000001"
  end   = "PAC9999999"
  private intervalId: any;


  @Output()
  solicitarProdutos = new EventEmitter<{codeStart: string; codeEnd: string; warehouse: number}>();

  ngOnInit(): void {

  }

  selecionaTodosProdutos() {
    this.loading = true
    this.resetTimer()
    this.solicitarProdutos.emit({
      codeStart: this.start,
      codeEnd: this.end,
      warehouse: 500.01
    })
  }

  finalizarSelecao(): void {
    this.stopTimer()
    this.loading = false
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

