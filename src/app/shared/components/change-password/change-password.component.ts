import { Component } from '@angular/core';
import { AlertService } from '../../service/alert.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { error } from 'console';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html'
})
export class ChangePassowrd {

  passwordCheck : string
  password : string
  loading = false
  returnUrl = "/"

  constructor(
    private router : Router,
    private route: ActivatedRoute,
    private authService : AuthService,
    private alertService : AlertService){

  }

  ngOnInit(): void {
    // Get the return URL from the route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  trocarSenha(){
    this.loading = true
    this.authService.changePassword(this.password).subscribe({
      next : (it) =>{
        this.loading = false
        this.router.navigateByUrl(this.returnUrl);
      }, 
      error : (err) => {
        this.loading = false
      }
    })
  }
  
}