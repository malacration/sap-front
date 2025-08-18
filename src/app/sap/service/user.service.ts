import { Injectable } from "@angular/core";
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private users = [
    { id: '1', name: 'Usuário 1', role: '' },
    { id: '2', name: 'Usuário 2', role: '' },
    { id: '3', name: 'Usuário 3', role: '' },
  ];

  constructor() {}

  getUsers(): Observable<any[]> {
    return of(this.users);
  }

  assignRoleToUser(userId: string, role: string): Observable<any> {
    const user = this.users.find(u => u.id == userId);
    if (user) {
      user.role = role; 
    }
    return of({ success: true });
  }
}