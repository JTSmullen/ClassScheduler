import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Calendar } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { AuthService, UserInfo } from '../auth/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, FormsModule],
  templateUrl: './register-page.html',
  styleUrls: ['./register-page.sass'],
})
export class RegisterPage {
  firstName = '';
  lastName = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  isAdmin = false;        // ← add here
  loading = false;
  errorMessage = '';
  readonly Calendar = Calendar;

  constructor(private router: Router, private authService: AuthService) {}

  handleRegister(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;
    // remove isAdmin = false that was here

    const registerData = {
      username: this.username,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      admin: this.isAdmin
    };

    this.authService.register(registerData).subscribe({
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
            this.errorMessage = 'Registration succeeded, but could not load profile.';
            console.error('Fetch profile error:', fetchError);
          },
        });
      },
      error: (error) => {
        this.loading = false;
        if (error.error && (error.error.detail || error.error.message)) {
          this.errorMessage = error.error.detail || error.error.message;
        } else if (error.status === 409) {
          this.errorMessage = 'A user with that username or email already exists.';
        } else {
          this.errorMessage = 'An unexpected error occurred. Please try again.';
        }
        console.error('Registration error:', error);
      },
    });
  }
}
