import { Component, Input, signal, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseSection, ScheduleEvent } from './models';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm

@Component({
  selector: 'app-week-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './week-grid.component.html',
  styleUrls: ['./week-grid.component.sass'],
})
export class WeekGridComponent implements OnInit, OnChanges {
  @Input() events: ScheduleEvent[] = [];
  @Input() title?: string;
  @Output() courseSelected = new EventEmitter<CourseSection>();

  readonly DAYS = DAYS;
  readonly HOURS = HOURS;

  selectedCourse = signal<CourseSection | null>(null);

  totalCredits = signal(0);

  ngOnInit() {
    this.updateTotalCredits();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['events']) {
      this.updateTotalCredits();
    }
  }

  updateTotalCredits() {
    this.totalCredits.set(this.events.reduce((sum, event) => sum + event.courseSection.credits, 0));
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
    this.courseSelected.emit(course);
  }

  trackByEvent(index: number, event: ScheduleEvent) {
    return event.courseSection.id;
  }

  isHeightGreaterThan(event: ScheduleEvent, threshold: number): boolean {
    const height = parseInt(this.getEventPosition(event).height);
    return height > threshold;
  }
}