import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeftRight, Search, X, BookOpen, Calendar, MapPin, User, Clock, Users } from 'lucide-angular';
import { WeekGridComponent } from './week-grid.component';
import { CourseSection, Schedule, ScheduleEvent } from './models';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, WeekGridComponent],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.sass',
})
export class SchedulePage {
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

  // Mock data - replace with service
  availableSchedules: Schedule[] = [
    {
      id: 1,
      name: 'Schedule 1',
      events: [] // populate as needed
    },
    {
      id: 2,
      name: 'Schedule 2',
      events: []
    }
  ];

  compareMode = signal(false);
  searchQuery = signal('');
  sheetOpen = signal(false);
  selectedCourse = signal<CourseSection | null>(null);
  selectedScheduleId = signal(1);
  compareScheduleIds = signal<[number, number]>([1, 2]);

  currentSchedule = computed(() =>
    this.availableSchedules.find(s => s.id === this.selectedScheduleId()) || this.availableSchedules[0]
  );

  compareSchedule1 = computed(() =>
    this.availableSchedules.find(s => s.id === this.compareScheduleIds()[0]) || this.availableSchedules[0]
  );

  compareSchedule2 = computed(() =>
    this.availableSchedules.find(s => s.id === this.compareScheduleIds()[1]) || this.availableSchedules[1]
  );

  filteredEvents = computed(() =>
    this.currentSchedule().events.filter(event =>
      event.courseSection.name.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
      event.courseSection.subject.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
      event.courseSection.location.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
      event.courseSection.faculty.some(f => f.toLowerCase().includes(this.searchQuery().toLowerCase()))
    )
  );

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
    this.selectedScheduleId.set(parseInt(value));
  }

  onCompareSchedule1Change(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.compareScheduleIds.set([parseInt(value), this.compareScheduleIds()[1]]);
  }

  onCompareSchedule2Change(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.compareScheduleIds.set([this.compareScheduleIds()[0], parseInt(value)]);
  }

  clearSearch() {
    this.searchQuery.set('');
  }
}
