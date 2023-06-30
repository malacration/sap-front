import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, fromEvent, tap } from 'rxjs';



@Component({
  selector: 'filter-numero-nf',
  templateUrl: './numero-nf.component.html'
})
export class FilterNumeroNfComponent implements OnInit {
  

  @Output()
  currentValue : any;

  @Output() 
  changeFilter = new EventEmitter<number>();

  @ViewChild('input', {static: true}) input: ElementRef;

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
    this.changeFilter.emit(event)
  }


}
