import { Component, OnInit } from '@angular/core';
import { UserService } from '../../service/user.service'; 
import { AlertService } from '../../service/alert.service';
import { RoleService } from '../../service/role.service'; // Importar o RoleService

@Component({
  selector: 'app-assign-role',
  templateUrl: './assign-role.component.html',
  styleUrls: ['./assign-role.component.scss'],
})
export class AssignRoleComponent implements OnInit {
  users: any[] = []; 
  selectedUser: string = '';
  selectedRole: string = '';
  roles: string[] = []; 

  constructor(
    private userService: UserService, 
    private alertService: AlertService,
    private roleService: RoleService 
  ) {}

  ngOnInit(): void {
    this.userService.getUsers().subscribe((users) => {
      this.users = users;
    });
    this.roles = Object.keys(this.roleService.roles);
  }

  assignRole() {
    if (this.selectedUser && this.selectedRole) {
      this.userService.assignRoleToUser(this.selectedUser, this.selectedRole).subscribe(response => {
        if (response.success) {
          this.alertService.info('Permissão atribuída com sucesso!').then(() => {
            this.userService.getUsers().subscribe(users => {
              this.users = users;
            });
          });
        }
      });
    }
  }
}