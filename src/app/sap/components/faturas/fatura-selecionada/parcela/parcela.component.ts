import { Component, Input, OnInit } from '@angular/core';



@Component({
  selector: 'app-parcelas',
  templateUrl: './parcela.component.html',
})
export class ParcelasComponent implements OnInit {
  
  @Input()
  parcela : any

  ngOnInit(): void {
  }

}
