import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { LoginPage } from './login-page/login-page';
import { RegisterPage } from './register-page/register-page';
import { Home } from './pages/home/home'
 
export const routes: Routes = [

    { path: '', component: LandingPage },
    { path: 'login', component: LoginPage },
    { path: 'register', component: RegisterPage },
    { path: '**', redirectTo: '' },
    { path: 'home', component: Home}

];
