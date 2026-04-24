import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Calendar } from 'lucide-angular';
import { AuthService, UserInfo } from '../auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.sass'],
})
export class LoginPage {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';
  readonly Calendar = Calendar;

  constructor(private router: Router, private authService: AuthService) {}

  handleLogin(event: Event) {
    event.preventDefault();
    this.errorMessage = '';
    this.loading = true;

    this.authService
      .login({ username: this.username, password: this.password })
      .subscribe({
        next: (response) => {
          localStorage.setItem('auth_token', response.token);

          this.authService.fetchUserInfo().subscribe({
            next: (user: UserInfo) => {
              localStorage.setItem(
                'current_user',
                JSON.stringify({
                  id: user.id,
                  username: response.username,
                  name: user.name,
                  firstName: user.firstName,
                  schedules: user.schedules,
                })
              );
              this.loading = false;
              this.router.navigate(['/home']);
            },
            error: (fetchError) => {
              this.loading = false;
              this.errorMessage = 'Signed in, but could not load profile.';
              console.error('Fetch profile error:', fetchError);
            },
          });
        },
        error: (error) => {
          this.loading = false;
          if (error.error && (error.error.detail || error.error.message)) {
            this.errorMessage = error.error.detail || error.error.message;
          } else if (error.status === 401) {
            this.errorMessage = 'Invalid username or password';
          } else {
            this.errorMessage = 'Unable to sign in. Please try again.';
          }
          console.error('Login error:', error);
        },
      });
  }
}
