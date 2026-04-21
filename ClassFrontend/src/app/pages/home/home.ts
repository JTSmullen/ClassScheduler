import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, UserInfo } from '../../auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.sass',
})
export class Home {
  showCreate = false;
  scheduleName = '';
  loading = false;
  errorMessage = '';

  username = '';
  password = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  toggleCreate() {
    this.showCreate = !this.showCreate;
    this.errorMessage = '';
  }

  createSchedule(event?: Event) {
    if (event) event.preventDefault();

    this.errorMessage = '';
    this.loading = true;

    const newSchedule = { name: this.scheduleName };

    this.http
      .post<any>('http://localhost:8080/api/v1/schedule/create', newSchedule)
      .subscribe({
        next: (response) => {
          console.log('Created:', response);
          this.loading = false;
          this.showCreate = false;
          this.scheduleName = '';

          // Refresh user info to include the new schedule
          this.authService.fetchUserInfo().subscribe({
            next: (user: UserInfo) => {
              // Get existing user data to preserve username
              const existingUser = JSON.parse(localStorage.getItem('current_user') || '{}');
              
              localStorage.setItem(
                'current_user',
                JSON.stringify({
                  id: user.id,
                  username: existingUser.username || '',
                  name: user.name,
                  firstName: user.firstName,
                  schedules: user.schedules,
                })
              );

              if (response?.id) {
                this.router.navigate(['/schedule']);
              }
            },
            error: (fetchError) => {
              console.error('Failed to refresh user info after schedule creation:', fetchError);
              // Still navigate to schedule even if user info refresh fails
              if (response?.id) {
                this.router.navigate(['/schedule']);
              }
            },
          });
        },
        error: (error) => {
          this.loading = false;
          if (error.error && (error.error.detail || error.error.message)) {
            this.errorMessage = error.error.detail || error.error.message;
          } else if (error.status === 400) {
            this.errorMessage = 'Invalid schedule data';
          } else {
            this.errorMessage = 'Failed to create schedule. Try again.';
          }
          console.error('Create schedule error:', error);
        }
      }); // End of createSchedule subscription
  } // End of createSchedule method

  login() {
    this.loading = true;

    this.authService
      .login({ username: this.username, password: this.password })
      .subscribe({
        next: (response) => {
          localStorage.setItem('auth_token', response.token);

          this.authService.fetchUserInfo().subscribe({
            next: (user: any) => {
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
      }); // End of login subscription
  } // End of login method
} // End of Class