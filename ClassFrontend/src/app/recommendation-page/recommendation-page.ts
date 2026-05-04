import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { concatMap, from, of } from 'rxjs';
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
  private _completedCoursesText = '';
  parsedCourseCodes: string[] = [];
  selectedProgramCode = '';
  selectedSemester = '';
  loadingOptions = false;
  generatingSchedule = false;
  savingSchedule = false;
  optionsError = '';
  requestError = '';
  saveError = '';
  programSheets: ProgramSheetOption[] = [];
  semesters: string[] = [];
  recommendationResponse: RecommendationResponse | null = null;

  constructor(
    private router: Router,
    private recommendationService: RecommendationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const token = this.getAuthToken();
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }
      this.loadOptions(token);
    }
  }

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
    return (
      this.parsedCourseCodes.length > 0 &&
      this.selectedProgramCode.trim().length > 0 &&
      this.selectedSemester.trim().length > 0 &&
      !this.generatingSchedule
    );
  }

  handleGenerateSchedule(event: Event): void {
    event.preventDefault();
    this.requestError = '';
    this.recommendationResponse = null;

    const token = this.getAuthToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.canGenerateSchedule) {
      this.requestError = 'Please enter course codes, choose a semester, and choose a program sheet.';
      return;
    }

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

    const scheduleName = `${this.recommendationResponse.semester} - Recommended Schedule`;

    this.recommendationService.createSchedule(scheduleName, token).subscribe({
      next: (scheduleResponse) => {
        const scheduleId = scheduleResponse.id;
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

    if (courses.length === 0) {
      this.navigateToSchedule(scheduleId);
      return;
    }

    from(courses).pipe(
      concatMap((course) =>
        this.recommendationService.addCourseToSchedule(scheduleId, course.section.id, token).pipe(
          concatMap(() => of(null)),
        )
      )
    ).subscribe({
      error: (error) => {
        console.error('Failed to add a course to schedule:', error);
      },
      complete: () => {
        this.navigateToSchedule(scheduleId);
      },
    });
  }

  private navigateToSchedule(scheduleId: number): void {
    this.savingSchedule = false;
    this.cdr.markForCheck();
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
        this.optionsError =
          error?.error?.detail || error?.error?.message || 'Could not load recommendation options.';
        this.cdr.markForCheck();
      },
    });
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('auth_token');
  }
}