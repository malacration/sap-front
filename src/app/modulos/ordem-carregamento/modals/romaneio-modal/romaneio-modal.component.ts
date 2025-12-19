import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { RomaneioPdfComponent } from '../../componentes/romaneio-pdf/romaneio-pdf.component';

@Component({
  selector: 'app-romaneio-modal',
  templateUrl: './romaneio-modal.component.html'
})
export class RomaneioModalComponent {
  @Input() show: boolean = false;
  @Input() pedidos: any[] = [];
  @Input() ordem: any;
  @Input() placa: string = '';
  @Input() motorista: string = '';
  
  @Output() showChange = new EventEmitter<boolean>();
  
  @ViewChild('romaneioPdf') romaneioPdf: RomaneioPdfComponent;

  gerarPDF() {
    this.romaneioPdf.gerarPdf();
  }

  close() {
    this.showChange.emit(false);
  }
}