import { Observable } from "rxjs";
import { Page } from "../model/page.model";


export interface SearchService<T>{
    search($event) : Observable<Page<T>>;
}
  