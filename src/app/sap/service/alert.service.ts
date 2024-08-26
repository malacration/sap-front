import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { info } from 'console';
import Swal from 'sweetalert2';


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

    error(text : string) : Promise<any> {
        return Swal.fire({
            title: 'Error!',
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
