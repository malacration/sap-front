import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class RomaneioService {

    constructor() {
    
  }
  
  public getRomaneioPesagem() : Array<string>{
    return ["ola","lista"]
  }
  
}
