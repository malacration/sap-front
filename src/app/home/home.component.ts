import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RomaneioService } from '../core/services/romaneio.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(private romaneioService : RomaneioService,
    private router: Router) { }

  ngOnInit(): void {
    console.log('HomeComponent INIT');
  }

  public getRomaneioPesagem() : Array<string> {
    return this.romaneioService.getRomaneioPesagem();
  }

  public getUrlServer() {
    return localStorage.getItem("host")
  }

}
