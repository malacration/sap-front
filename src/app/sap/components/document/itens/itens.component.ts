import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-itens',
  templateUrl: './itens.component.html',
  styleUrls: ['./itens.component.scss'],
})
export class ItensComponent implements OnInit {
  
  itens = new Array()
  showThumbnail = false

  ngOnInit(): void {

    this.itens.push(1)
    this.itens.push(3)
    this.itens.push(2)
  }


}
