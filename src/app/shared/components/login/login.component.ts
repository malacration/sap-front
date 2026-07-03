import { Component } from '@angular/core';
import { AlertService } from '../../service/alert.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { error } from 'console';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {

  username : string
  password : string
  loading = false
  returnUrl = "/"
  keycloak = false

  constructor(
    private router : Router,
    private route: ActivatedRoute,
    private authService : AuthService,
    private alertService : AlertService){

  }

  ngOnInit(): void {
    // Apos o login vai para a tela de boas-vindas (home), salvo quando veio
    // de uma rota protegida (returnUrl preenchido pelo guard).
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    this.keycloak = this.authService.isKeycloak()
    if (this.keycloak && this.authService.isLoggedIn()) {
      this.router.navigateByUrl(this.returnUrl)
    } else if (this.keycloak) {
      // modo Keycloak: redireciona direto para a tela de login do KC
      this.entrarKeycloak()
    }
  }

  entrarKeycloak(){
    this.loading = true
    this.authService.loginKeycloak(this.returnUrl)
  }

  entrar(){
    this.loading = true
    this.authService.login(this.username,this.password).subscribe({
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