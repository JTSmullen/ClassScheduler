import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeftRight, Search, X, BookOpen, Calendar, MapPin, User, Clock, Users } from 'lucide-angular';
import { WeekGridComponent } from './week-grid.component';
import { ScheduleService, ScheduleDTO, BackendCourseSectionDTO, BackendCourseTime } from './schedule.service';
import { CourseSection, Schedule, ScheduleEvent } from './models';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm
const DAY_INDEX: Record<string, number> = {
  M: 0,
  T: 1,
  W: 2,
  R: 3,
  F: 4,
};

interface UserScheduleMeta {
  id: number;
  name: string;
  lastEdited?: string;
}

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, WeekGridComponent],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.sass',
})
export class SchedulePage implements OnInit {
  readonly ArrowLeftRight = ArrowLeftRight;
  readonly Search = Search;
  readonly X = X;
  readonly BookOpen = BookOpen;
  readonly Calendar = Calendar;
  readonly MapPin = MapPin;
  readonly User = User;
  readonly Clock = Clock;
  readonly Users = Users;

  readonly DAYS = DAYS;
  readonly HOURS = HOURS;

  availableSchedules = signal<Schedule[]>([]);
  scheduleMeta: UserScheduleMeta[] = [];
  loadingSchedules = signal(false);
  errorMessage = signal('');

  compareMode = signal(false);
  searchQuery = signal('');
  sheetOpen = signal(false);
  selectedCourse = signal<CourseSection | null>(null);
  selectedScheduleId = signal(0);
  compareScheduleIds = signal<[number, number]>([0, 0]);
  removingCourse = signal(false);
  removeError = signal('');

  private emptySchedule: Schedule = { id: 0, name: '', events: [] };

  currentSchedule = computed(() =>
    this.availableSchedules().find(s => s.id === this.selectedScheduleId()) || this.availableSchedules()[0] || this.emptySchedule
  );

  compareSchedule1 = computed(() =>
    this.availableSchedules().find(s => s.id === this.compareScheduleIds()[0]) || this.availableSchedules()[0] || this.emptySchedule
  );

  compareSchedule2 = computed(() =>
    this.availableSchedules().find(s => s.id === this.compareScheduleIds()[1]) || this.availableSchedules()[0] || this.emptySchedule
  );

  filteredEvents = computed(() =>
    this.currentSchedule().events.filter(event =>
      event.courseSection.name.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
      event.courseSection.subject.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
      event.courseSection.location.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
      event.courseSection.faculty.some(f => f.toLowerCase().includes(this.searchQuery().toLowerCase()))
    )
  );

  constructor(private router: Router, private scheduleService: ScheduleService) {}

  ngOnInit() {
    const storedUser = this.getStoredUser();

    if (!storedUser) {
      this.router.navigate(['/login']);
      return;
    }

    const scheduleIds = storedUser.schedules.map((schedule: any) => schedule.id as number);
    if (scheduleIds.length === 0) {
      this.availableSchedules.set([]);
      return;
    }

    this.availableSchedules.set(storedUser.schedules.map((schedule: any) => ({
      id: schedule.id,
      name: schedule.name,
      events: [],
    })));

    this.selectedScheduleId.set(scheduleIds[0]);
    this.compareScheduleIds.set([
      scheduleIds[0],
      scheduleIds.length > 1 ? scheduleIds[1] : scheduleIds[0],
    ]);

    this.loadScheduleDetails(this.selectedScheduleId());
    if (scheduleIds.length > 1) {
      this.loadScheduleDetails(this.compareScheduleIds()[1]);
    }
  }

  private loadScheduleDetails(scheduleId: number) {
    if (!scheduleId) {
      return;
    }

    const hasLoaded = this.availableSchedules().some(
      schedule => schedule.id === scheduleId && schedule.events.length > 0
    );
    if (hasLoaded) {
      return;
    }

    this.loadingSchedules.set(true);
    this.scheduleService.loadSchedule(scheduleId).subscribe({
      next: (scheduleDto) => {
        this.updateScheduleFromDto(scheduleDto);
        this.loadingSchedules.set(false);
      },
      error: (error) => {
        console.error('Unable to load schedule:', error);
        this.errorMessage.set('Unable to load schedules from the backend.');
        this.loadingSchedules.set(false);
      },
    });
  }

  private updateScheduleFromDto(scheduleDto: ScheduleDTO) {
    const schedule: Schedule = {
      id: scheduleDto.id,
      name: scheduleDto.name,
      events: scheduleDto.courseSections.flatMap((course, index) =>
        course.times.map(time => ({
          courseSection: this.mapCourseSection(course),
          day: this.mapDayToIndex(time.day),
          startHour: this.parseLocalTime(time.start_time).hour,
          startMinute: this.parseLocalTime(time.start_time).minute,
          durationMinutes: this.getDurationMinutes(time),
          color: this.getColorForCourseIndex(index),
        }))
      ),
    };

    this.availableSchedules.update(schedules => {
      const existingIndex = schedules.findIndex(s => s.id === schedule.id);
      if (existingIndex >= 0) {
        schedules[existingIndex] = schedule;
      } else {
        schedules.push(schedule);
      }
      return [...schedules];
    });
  }

  private mapCourseSection(course: BackendCourseSectionDTO): CourseSection {
    return {
      id: course.id,
      subject: course.subject,
      number: course.number,
      name: course.name,
      credits: course.credits,
      is_lab: course.is_lab,
      is_open: course.is_open,
      location: course.location,
      section: course.section,
      semester: course.semester,
      open_seats: course.open_seats,
      total_seats: course.total_seats,
      faculty: course.faculty || [],
      times: course.times.map(time => ({
        day: time.day,
        start_time: this.parseLocalTime(time.start_time),
        end_time: this.parseLocalTime(time.end_time),
      })),
    };
  }

  private parseLocalTime(value: string | { hour: number; minute: number }): { hour: number; minute: number } {
    if (typeof value === 'string') {
      const [hour, minute] = value.split(':').map(Number);
      return { hour, minute };
    }
    return value;
  }

  private getDurationMinutes(time: BackendCourseTime): number {
    const start = this.parseLocalTime(time.start_time);
    const end = this.parseLocalTime(time.end_time);
    return (end.hour - start.hour) * 60 + (end.minute - start.minute);
  }

  private mapDayToIndex(day: string): number {
    return DAY_INDEX[day.toUpperCase()] ?? 0;
  }

  private getColorForCourseIndex(index: number): string {
    const palette = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];
    return palette[index % palette.length];
  }

  private getStoredUser() {
    if (typeof window === 'undefined') {
      return null;
    }
    const rawUser = localStorage.getItem('current_user');
    if (!rawUser) {
      return null;
    }
    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour > 12) return `${hour - 12} PM`;
    return `${hour} AM`;
  }

  getEventPosition(event: ScheduleEvent) {
    const top = ((event.startHour - 7) * 60 + event.startMinute) / 60;
    const height = event.durationMinutes / 60;
    return { top: `${top * 60}px`, height: `${height * 60}px` };
  }

  selectCourse(course: CourseSection) {
    this.selectedCourse.set(course);
  }

  closeDialog() {
    this.selectedCourse.set(null);
  }

  toggleCompareMode() {
    this.compareMode.set(!this.compareMode());
  }

  openSheet() {
    this.sheetOpen.set(true);
  }

  closeSheet() {
    this.sheetOpen.set(false);
  }

  onScheduleChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    const scheduleId = parseInt(value);
    this.selectedScheduleId.set(scheduleId);
    this.loadScheduleDetails(scheduleId);
  }

  onCompareSchedule1Change(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    const scheduleId = parseInt(value);
    this.compareScheduleIds.set([scheduleId, this.compareScheduleIds()[1]]);
    this.loadScheduleDetails(scheduleId);
  }

  onCompareSchedule2Change(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    const scheduleId = parseInt(value);
    this.compareScheduleIds.set([this.compareScheduleIds()[0], scheduleId]);
    this.loadScheduleDetails(scheduleId);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  removeCourse() {
    const course = this.selectedCourse();
    if (!course) {
      return;
    }

    const scheduleId = this.selectedScheduleId();
    this.removingCourse.set(true);
    this.removeError.set('');

    this.scheduleService.removeCourse(scheduleId, course.id).subscribe({
      next: () => {
        // Clear the schedule events to force a reload from the backend
        this.availableSchedules.update(schedules => {
          const schedule = schedules.find(s => s.id === scheduleId);
          if (schedule) {
            schedule.events = [];
          }
          return [...schedules];
        });
        // Now reload the schedule details to fetch fresh data
        this.loadScheduleDetails(scheduleId);
        this.removingCourse.set(false);
        this.closeDialog();
      },
      error: (error) => {
        console.error('Unable to remove course:', error);
        this.removeError.set('Failed to remove course. Please try again.');
        this.removingCourse.set(false);
      },
    });
  }
}
