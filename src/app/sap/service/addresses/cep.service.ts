import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

/** O que o ViaCEP devolve e a tela usa. ibge e o codigo de 7 digitos do municipio. */
export interface EnderecoCep {
  cep : string
  logradouro : string
  bairro : string
  localidade : string
  uf : string
  ibge : string
}

/**
 * Consulta de CEP no ViaCEP (publico, sem chave). Usa um HttpClient sem os interceptadores do app:
 * eles poem o Authorization do nosso backend, o ViaCEP nao aceita esse cabecalho (CORS) e o token
 * nao tem nada que sair para terceiro. Vai so o CEP.
 */
@Injectable({
  providedIn: 'root'
})
export class CepService {

  private readonly http : HttpClient

  constructor(handler : HttpBackend) {
    this.http = new HttpClient(handler)
  }

  /** null quando o CEP nao existe ou o servico falhou - a tela segue no preenchimento manual. */
  consulta(cep : string) : Observable<EnderecoCep | null> {
    const digitos = (cep || '').replace(/\D/g, '')
    if(digitos.length != 8)
      return of(null)
    return this.http.get<any>(`https://viacep.com.br/ws/${digitos}/json/`).pipe(
      map(resposta => resposta?.erro ? null : resposta as EnderecoCep),
      catchError(() => of(null))
    )
  }
}
