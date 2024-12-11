import { Router } from '@angular/router';
import { ConfigService } from '../core/services/config.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  constructor(private config : ConfigService) { }
  
  public getUrlServer() {
    return this.config.getHost();
  }

}
