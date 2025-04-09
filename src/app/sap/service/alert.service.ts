import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, lastValueFrom } from 'rxjs';
import { info } from 'console';
import Swal, { SweetAlertResult } from 'sweetalert2';


@Injectable({
  providedIn: 'root'
})
export class AlertService {
    
    warning(): Promise<any> {
        return Swal.fire({
            title: 'Error!',
            text: 'Do you want to continue',
            icon: 'error',
            confirmButtonText: 'Ok'
          })
    }

    confirm(text : string = "Tem certeza que deseja continuar?"): Promise<SweetAlertResult> {
        return Swal.fire({
            title: 'Atenção',
            text: text,
            icon: 'question',
            confirmButtonText: 'Ok',
            showCancelButton : true,
          })
    }

    loading<T>(task: Promise<T> | Observable<T>) : Promise<T>{
        const swalInstance = Swal.fire({
            title: 'Carregando...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading(null);
            }
        });

        const taskPromise = task instanceof Promise ? task : lastValueFrom(task);

        return taskPromise.finally(() => {
            // Verifica se ainda é a instância ativa antes de fechar
            if (Swal.isVisible() && Swal.getTitle()?.textContent === 'Carregando...') {
                Swal.close();
            }
        });
    }

    error(text : string, titulo : string = 'Erro!') : Promise<any> {
        return Swal.fire({
            title: 'Erro!',
            text: text,
            icon: 'error',
            confirmButtonText: 'Ok'
        })
    }

    info(msg : string = 'Do you want to continue') : Promise<any>{
        return Swal.fire({
            title: 'Info!',
            text: msg,
            icon: 'info',
            confirmButtonText: 'Ok'
        })
    }
}
