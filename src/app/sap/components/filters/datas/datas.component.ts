import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, fromEvent, tap } from 'rxjs';



@Component({
  selector: 'filter-datas',
  templateUrl: './datas.component.html'
})
export class DatasComponent implements OnInit {
  

  @Output()
  currentValue : any;

  @Output() 
  changeFilter = new EventEmitter<any>();

  @ViewChild('input', {static: true}) input: ElementRef;


  de : Date
  ate : Date

  ngOnInit(): void {

  }

  ngAfterViewInit() {
    fromEvent(this.input.nativeElement,'keyup')
    .pipe(
        filter(Boolean),
        debounceTime(350),
        distinctUntilChanged(),
        tap((event:KeyboardEvent) => {
          this.change(this.currentValue)
        })
    )
    .subscribe();
}

  change(event) {
    this.changeFilter.emit({
      de : this.de,
      ate : this.ate
    })
  }


}
