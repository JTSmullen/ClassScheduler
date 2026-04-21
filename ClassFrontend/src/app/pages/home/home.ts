import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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

  constructor(private http: HttpClient, private router: Router) {}

  toggleCreate() {
    this.showCreate = !this.showCreate;
    this.errorMessage = '';
  }

  createSchedule(event?: Event) {
    if (event) event.preventDefault();

    this.errorMessage = '';
    this.loading = true;

    const newSchedule = {
      name: this.scheduleName
    };

    // optional auth token (safe if not used by backend)
    const token = localStorage.getItem('auth_token');

    this.http.post<any>(
      'http://localhost:8080/api/v1/schedule/create',
      newSchedule,
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        : {}
    ).subscribe({
      next: (response) => {
        console.log('Created:', response);

        this.loading = false;
        this.showCreate = false;
        this.scheduleName = '';

        // navigate to the new schedule page
        if (response?.id) {
          console.log('NAVIGATING WITH RESPONSE:', response);
          this.router.navigate(['/home']);
        }
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
    });
  }
}