import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { LoginPage } from './login-page/login-page';
import { RegisterPage } from './register-page/register-page';
import { Home } from './pages/home/home';
import { SchedulePage } from './schedule-page/schedule-page';
import { CreateSchedulePage } from './create-schedule-page/create-schedule-page'
import { RecommendationPage } from './recommendation-page/recommendation-page';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'home', component: Home },
  { path: 'schedule', component: SchedulePage },
  {path: 'create', component: CreateSchedulePage },
  { path: 'recommendations', component: RecommendationPage },
  { path: '**', redirectTo: '' },
];
