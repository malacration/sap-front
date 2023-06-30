import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { BusinessPlacesService } from '../../../service/business-places.service';
import { BusinessPlace } from '../../../model/business-place';



@Component({
  selector: 'filter-business-place',
  templateUrl: './filter-business-place.component.html'
})
export class FilterBusinessPlaceComponent implements OnInit {
  

  constructor(private businessPlacesService: BusinessPlacesService){
      
  }

  businessPlaces 

  @Output()
  currentValue : any = "all";

  @Output() 
  changeFilter = new EventEmitter<BusinessPlace>();

  ngOnInit(): void {
    let init = new BusinessPlace(-1,"Todos","all","all","all");
    this.businessPlaces = [init,new BusinessPlace(-1,"Carregando","all","all","all")];
    this.currentValue = init;
    this.businessPlacesService.get().subscribe((data: Array<BusinessPlace>) => {
      this.businessPlaces = data
    });
  }

  change(event) {
    this.changeFilter.emit(event)
  }


}
