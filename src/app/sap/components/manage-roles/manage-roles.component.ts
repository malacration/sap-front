import { Component, OnInit, ViewChild } from '@angular/core';
import { RoleService } from '../../service/role.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-manage-roles',
  templateUrl: './manage-roles.component.html',
  styleUrls: ['./manage-roles.component.scss'],
})
export class ManageRolesComponent implements OnInit {
  roles: any = {};
  selectedRole: string = '';
  permissions: any = { url: '', actions: '' };
  newRoleName: string = '';
  roleToRemove: string = '';

  @ViewChild('createRoleModal', { static: true }) createRoleModal: ModalComponent;
  @ViewChild('removeRoleModal', { static: true }) removeRoleModal: ModalComponent;

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    this.roleService.roles$.subscribe((roles) => {
      this.roles = roles;
    });
  }

  addPermission(): void {
    if (this.selectedRole && this.permissions.url) {
      const newPermission = {
        url: this.permissions.url,
        actions: this.permissions.actions.split(',').map(action => action.trim()),
        role: this.selectedRole 
      };
  
      this.roles[this.selectedRole].push(newPermission);
      this.roleService.updateRole(this.selectedRole, this.roles[this.selectedRole]);
      this.permissions = { url: '', actions: '' }; 
    }
  }

  removePermission(permission: any): void {
    const index = this.roles[this.selectedRole].indexOf(permission);
    if (index !== -1) {
      this.roles[this.selectedRole].splice(index, 1);
      this.roleService.updateRole(this.selectedRole, this.roles[this.selectedRole]);
    }
  }

  openCreateRoleModal(): void {
    this.newRoleName = '';
    this.createRoleModal.openModal();
  }

  createRole(): void {
    if (this.newRoleName) {
      this.roles[this.newRoleName] = [];
      this.roleService.updateRole(this.newRoleName, []);
      this.createRoleModal.closeModal();
    }
  }

  openRemoveRoleModal(): void {
    this.roleToRemove = '';
    this.removeRoleModal.openModal();
  }

  confirmRemoveRole(): void {
    if (this.roleToRemove) {
      delete this.roles[this.roleToRemove];  
      this.roleService.removeRole(this.roleToRemove); 
      this.removeRoleModal.closeModal();
      this.roleToRemove = '';  
    }
  }
}