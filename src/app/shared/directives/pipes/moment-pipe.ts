import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

@Pipe({
    name: 'dateFormat',
    standalone: false
})
export class MomentPipe implements PipeTransform {
    transform(value: Date | moment.Moment, dateFormat: string = "YYYY-MM-DD"): any {
        return moment(value).format(dateFormat);
    }
}