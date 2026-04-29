import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  RecommendationService,
  ProgramSheetOption,
  RecommendationOptionsResponse,
  RecommendationResponse,
} from './recommendation.service';

@Component({
  selector: 'app-recommendation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recommendation-page.html',
  styleUrl: './recommendation-page.sass',
})
export class RecommendationPage implements OnInit {
  // Backing field for the textarea input
  private _completedCoursesText = '';
  
  // Stored array to prevent infinite change detection loops
  parsedCourseCodes: string[] = [];

  // Selected values for the two dropdowns.
  selectedProgramCode = '';
  selectedSemester = '';

  // UI state flags used by the template to show loading text and disable actions.
  loadingOptions = false;
  generatingSchedule = false;

  // Error messages shown in the page when API calls fail.
  optionsError = '';
  requestError = '';

  // Data from the backend used by dropdowns and result rendering.
  programSheets: ProgramSheetOption[] = [];
  semesters: string[] = [];
  recommendationResponse: RecommendationResponse | null = null;

  constructor(
    private router: Router,
    private recommendationService: RecommendationService
  ) {}

  ngOnInit(): void {
    // SSR SAFETY GUARD: Prevent the Node.js server from running this block.
    // If the server runs this, it sees no token, redirects to /login, and sends the wrong HTML,
    // which causes Angular to throw a Hydration Mismatch and permanently freeze the UI.
    if (typeof window !== 'undefined') {
      const token = this.getAuthToken();
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      // Initial page data load for semester and program sheet dropdowns.
      this.loadOptions(token);
    }
  }

  // Intercepts the ngModel updates from the HTML so we only calculate the array 
  // exactly when the user types, instead of infinitely on every UI tick.
  get completedCoursesText(): string {
    return this._completedCoursesText;
  }
  set completedCoursesText(value: string) {
    this._completedCoursesText = value;
    this.parsedCourseCodes = value
      .split(',')
      .map((course) => course.trim().toUpperCase())
      .filter((course) => course.length > 0);
  }

  get canGenerateSchedule(): boolean {
    // Keep submit disabled until the required fields are present.
    return (
      this.parsedCourseCodes.length > 0 &&
      this.selectedProgramCode.trim().length > 0 &&
      this.selectedSemester.trim().length > 0 &&
      !this.generatingSchedule
    );
  }

  handleGenerateSchedule(event: Event): void {
    // Prevent full page reload on form submit.
    event.preventDefault();
    this.requestError = '';
    this.recommendationResponse = null;

    // Token can expire or be removed while page is open, so re-check here.
    const token = this.getAuthToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.canGenerateSchedule) {
      this.requestError = 'Please enter course codes, choose a semester, and choose a program sheet.';
      return;
    }

    // Send structured payload to backend and update UI based on success/failure.
    this.generatingSchedule = true;
    this.recommendationService
      .generateSchedule(
        {
          programCode: this.selectedProgramCode,
          semester: this.selectedSemester,
          completedCourses: this.parsedCourseCodes,
        },
        token
      )
      .subscribe({
        next: (response) => {
          this.recommendationResponse = response;
          this.generatingSchedule = false;
        },
        error: (error) => {
          this.generatingSchedule = false;
          this.requestError =
            error?.error?.detail || error?.error?.message || 'Unable to generate schedule right now.';
        },
      });
  }

  private loadOptions(token: string): void {
    // Fetch dropdown options shown before a recommendation can be requested.
    this.loadingOptions = true;
    this.optionsError = '';

    this.recommendationService.getOptions(token).subscribe({
      next: (options: RecommendationOptionsResponse) => {
        this.programSheets = options.programSheets || [];
        this.semesters = options.semesters || [];

        if (this.programSheets.length > 0) {
          this.selectedProgramCode = this.programSheets[0].programCode;
        }

        if (this.semesters.length > 0) {
          this.selectedSemester = this.semesters[0];
        }

        this.loadingOptions = false;
      },
      error: (error) => {
        this.loadingOptions = false;
        // Prefer backend-provided details, then fallback to a generic message.
        this.optionsError =
          error?.error?.detail || error?.error?.message || 'Could not load recommendation options.';
      },
    });
  }

  private getAuthToken(): string | null {
    // SSR safety: localStorage only exists in browser context.
    if (typeof window === 'undefined') {
      return null;
    }

    // JWT saved during login.
    return localStorage.getItem('auth_token');
  }
}
