import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Calendar } from 'lucide-angular';

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

  constructor(private router: Router) {}

  handleLogin(event: Event) {
    event.preventDefault();
    this.errorMessage = '';
    this.loading = true;

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: any) => u.username === this.username && u.password === this.password);

      if (user) {
        localStorage.setItem('auth_token', 'mock_token');
        localStorage.setItem('current_user', JSON.stringify({ email: user.email, name: user.name, username: user.username }));
        this.router.navigate(['/home']);
      } else {
        this.errorMessage = 'Invalid username or password';
        this.loading = false;
      }
    }, 500);
  }
}
