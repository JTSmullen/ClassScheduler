import { Component, OnInit, signal, Inject, PLATFORM_ID } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
export class Home implements OnInit {
  // Signals for reactive UI
  schedules = signal<any[]>([]);
  showCreate = false;
  scheduleName = '';
  loading = false;
  errorMessage = '';

  // Form fields for login (if needed on this page)
  username = '';
  password = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only access localStorage if we are running in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.loadSchedules();
    }
  }

  /**
   * Reads the current user from storage and updates the schedules signal
   */
  loadSchedules() {
    if (isPlatformBrowser(this.platformId)) {
      const rawUser = localStorage.getItem('current_user');
      if (rawUser) {
        try {
          const user = JSON.parse(rawUser);
          this.schedules.set(user.schedules || []);
        } catch (e) {
          console.error('Failed to parse user from storage', e);
        }
      }
    }
  }

  /**
   * Navigates to a specific schedule by ID
   */
  navigateToSchedule(id: number) {
    this.router.navigate(['/schedule'], { queryParams: { id: id } });
  }

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
      .post<any>('https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/schedule/create', newSchedule)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.showCreate = false;
          this.scheduleName = '';

          // Refresh user info from backend to get updated list
          this.authService.fetchUserInfo().subscribe({
            next: (user: UserInfo) => {
              if (isPlatformBrowser(this.platformId)) {
                const existingUser = JSON.parse(localStorage.getItem('current_user') || '{}');

                const updatedUserData = {
                  id: user.id,
                  username: existingUser.username || '',
                  name: user.name,
                  firstName: user.firstName,
                  schedules: user.schedules,
                };

                localStorage.setItem('current_user', JSON.stringify(updatedUserData));

                // Update UI state
                this.schedules.set(user.schedules || []);
              }

              // Navigate to the specific schedule view
              if (response?.id) {
                this.navigateToSchedule(response.id);
              }
            },
            error: (fetchError) => {
              console.error('User info refresh failed:', fetchError);
              if (response?.id) this.navigateToSchedule(response.id);
            },
          });
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.detail || error.error?.message || 'Failed to create schedule.';
        }
      });
  }

  login() {
    this.loading = true;

    this.authService
      .login({ username: this.username, password: this.password })
      .subscribe({
        next: (response) => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('auth_token', response.token);
          }

          this.authService.fetchUserInfo().subscribe({
            next: (user: any) => {
              if (isPlatformBrowser(this.platformId)) {
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
                this.loadSchedules();
              }
              this.loading = false;
              this.router.navigate(['/home']);
            },
            error: () => {
              this.loading = false;
              this.errorMessage = 'Signed in, but could not load profile.';
            },
          });
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.status === 401 ? 'Invalid credentials' : 'Unable to sign in.';
        },
      });
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('current_user');
      localStorage.removeItem('auth_token');
    }
    this.router.navigate(['/login']);
  }
}
