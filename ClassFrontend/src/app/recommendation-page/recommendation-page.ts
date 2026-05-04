import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  savingSchedule = false;

  // Error messages shown in the page when API calls fail.
  optionsError = '';
  requestError = '';
  saveError = '';

  // Data from the backend used by dropdowns and result rendering.
  programSheets: ProgramSheetOption[] = [];
  semesters: string[] = [];
  recommendationResponse: RecommendationResponse | null = null;

  constructor(
    private router: Router,
    private recommendationService: RecommendationService,
    private cdr: ChangeDetectorRef
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
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.generatingSchedule = false;
          this.requestError =
            error?.error?.detail || error?.error?.message || 'Unable to generate schedule right now.';
          this.cdr.markForCheck();
        },
      });
  }

  handleSaveAsSchedule(): void {
    // Token can expire or be removed while page is open, so re-check here.
    const token = this.getAuthToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.recommendationResponse) {
      this.saveError = 'No recommendations to save.';
      this.cdr.markForCheck();
      return;
    }

    this.savingSchedule = true;
    this.saveError = '';

    // Create a new schedule with the semester as the name
    const scheduleName = `${this.recommendationResponse.semester} - Recommended Schedule`;

    this.recommendationService.createSchedule(scheduleName, token).subscribe({
      next: (scheduleResponse) => {
        const scheduleId = scheduleResponse.id;
        // After creating the schedule, add all recommended courses
        this.addRecommendedCoursesToSchedule(scheduleId, token);
      },
      error: (error) => {
        this.savingSchedule = false;
        this.saveError =
          error?.error?.detail || error?.error?.message || 'Failed to create schedule.';
        this.cdr.markForCheck();
      },
    });
  }

  private addRecommendedCoursesToSchedule(scheduleId: number, token: string): void {
    if (!this.recommendationResponse) {
      this.saveError = 'Recommendation data is missing.';
      this.savingSchedule = false;
      this.cdr.markForCheck();
      return;
    }

    const courses = this.recommendationResponse.recommendations;
    let addedCount = 0;
    let failedCount = 0;

    // If no courses, navigate directly
    if (courses.length === 0) {
      this.navigateToSchedule(scheduleId);
      return;
    }

    // Add each recommended course to the schedule
    courses.forEach((course, index) => {
      // Search for the course to get its ID by course code
      const searchQuery = course.courseCode; // e.g., "CS101"

      this.recommendationService.searchCourses(searchQuery, token).subscribe({
        next: (searchResponse) => {
          // Find the exact course match
          const matchedCourse = searchResponse.results.find(
            (c: any) =>
              c.subject === course.section.subject &&
              c.number === course.section.number &&
              c.section === course.section.section
          );

          if (matchedCourse) {
            // Add the course to the schedule
            this.recommendationService.addCourseToSchedule(scheduleId, matchedCourse.id, token).subscribe({
              next: () => {
                addedCount++;
                // If all courses have been processed, navigate to the schedule
                if (addedCount + failedCount === courses.length) {
                  this.navigateToSchedule(scheduleId);
                }
              },
              error: (error) => {
                failedCount++;
                console.error(`Failed to add course ${course.courseCode}:`, error);
                // If all courses have been processed, navigate to the schedule anyway
                if (addedCount + failedCount === courses.length) {
                  this.navigateToSchedule(scheduleId);
                }
              },
            });
          } else {
            failedCount++;
            console.warn(`Could not find course ${course.courseCode} in search results`);
            // If all courses have been processed, navigate to the schedule
            if (addedCount + failedCount === courses.length) {
              this.navigateToSchedule(scheduleId);
            }
          }
        },
        error: (error) => {
          failedCount++;
          console.error(`Failed to search for course ${course.courseCode}:`, error);
          // If all courses have been processed, navigate to the schedule
          if (addedCount + failedCount === courses.length) {
            this.navigateToSchedule(scheduleId);
          }
        },
      });
    });
  }

  private navigateToSchedule(scheduleId: number): void {
    this.savingSchedule = false;
    this.cdr.markForCheck();
    // Update localStorage with the new schedule and navigate to schedule page
    const user = this.getStoredUser();
    if (user) {
      user.schedules.push({ id: scheduleId, name: `${this.recommendationResponse?.semester} - Recommended Schedule` });
      localStorage.setItem('user', JSON.stringify(user));
    }
    this.router.navigate(['/schedule'], { queryParams: { id: scheduleId } });
  }

  private getStoredUser(): any {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
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
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loadingOptions = false;
        // Prefer backend-provided details, then fallback to a generic message.
        this.optionsError =
          error?.error?.detail || error?.error?.message || 'Could not load recommendation options.';
        this.cdr.markForCheck();
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
