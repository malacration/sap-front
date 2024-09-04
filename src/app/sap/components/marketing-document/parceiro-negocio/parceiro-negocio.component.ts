import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-parceiro-negocio',
  templateUrl: './parceiro-negocio.component.html',
  styleUrls: ['./parceiro-negocio.component.scss']
})
export class ParceiroNegocioComponent implements OnInit {
  CardCode: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
  }
}
