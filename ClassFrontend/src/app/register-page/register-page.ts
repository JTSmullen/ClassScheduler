import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Calendar } from 'lucide-angular';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
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
  loading = false;
  errorMessage = '';
  readonly Calendar = Calendar;

  constructor(private router: Router) {}

  handleRegister(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const existingUser = users.find(
        (u: any) => u.username === this.username || u.email === this.email
      );

      if (existingUser) {
        this.errorMessage = 'A user with that username or email already exists';
        this.loading = false;
        return;
      }

      const newUser = {
        firstName: this.firstName,
        lastName: this.lastName,
        username: this.username,
        email: this.email,
        password: this.password,
      };

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('auth_token', 'mock_token');
      localStorage.setItem(
        'current_user',
        JSON.stringify({
          username: this.username,
          name: `${this.firstName} ${this.lastName}`,
          email: this.email,
        })
      );

      this.router.navigate(['/home']);
    }, 500);
  }
}
