import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Dropzone } from 'dropzone';

/**
 * Adaptador Angular 15 para a engine Dropzone instalada por
 * ngx-dropzone-wrapper. A versao 15.0.0 do wrapper presente no lockfile foi
 * publicada com declarations Angular 16, incompativeis com o TypeScript 4.8.
 */
@Component({
  selector: 'app-ngx-dropzone-compat',
  template: '<div #dropzoneHost class="dropzone relatorio-dropzone"></div>',
  styleUrls: ['./ngx-dropzone-compat.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class NgxDropzoneCompatComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dropzoneHost', { static: true }) dropzoneHost!: ElementRef<HTMLDivElement>;
  @Input() extensao = '';
  @Input() mensagem = 'Arraste ou clique para selecionar';
  @Output() arquivoAdicionado = new EventEmitter<File>();
  @Output() arquivoRemovido = new EventEmitter<File>();
  @Output() falha = new EventEmitter<string>();

  private instancia?: any;

  ngAfterViewInit(): void {
    const DropzoneClass: any = Dropzone;
    DropzoneClass.autoDiscover = false;
    this.instancia = new DropzoneClass(this.dropzoneHost.nativeElement, {
      url: '/noop',
      autoProcessQueue: false,
      maxFiles: 1,
      acceptedFiles: this.extensao,
      addRemoveLinks: true,
      dictDefaultMessage: this.mensagem,
      dictRemoveFile: 'Remover',
      dictInvalidFileType: `Selecione um arquivo ${this.extensao}.`,
      dictMaxFilesExceeded: 'Remova o arquivo atual antes de escolher outro.',
      accept: (file: File, done: (error?: string) => void) => {
        this.arquivoAdicionado.emit(file);
        done();
      },
    });
    this.instancia.on('removedfile', (file: File) => this.arquivoRemovido.emit(file));
    this.instancia.on('error', (_file: File, mensagem: string) => this.falha.emit(mensagem));
  }

  resetar(): void {
    this.instancia?.removeAllFiles(true);
  }

  ngOnDestroy(): void {
    this.instancia?.destroy();
    this.instancia = undefined;
  }
}
