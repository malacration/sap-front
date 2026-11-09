import { Router } from '@angular/router';
import { ConfigService } from '../core/services/config.service';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { WsService } from '../shared/WsService';
import { stdout } from 'process';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HomeComponent {

  constructor(
    private config : ConfigService,
  ) { }

  public getUrlServer() {
    return this.config.getHost();
  }

}
