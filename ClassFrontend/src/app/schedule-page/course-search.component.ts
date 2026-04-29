import { Component, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchItemDTO, FilterOptionsDTO } from './search.service';
import { LucideAngularModule, Search, X, ChevronDown, ChevronUp } from 'lucide-angular';

interface TimeFilter {
  day: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface FilterState {
  semesters: Set<string>;
  subjects: Set<string>;
  numbers: Set<number>;
  credits: Set<number>;
  faculty: Set<string>;
  times: TimeFilter[];
}

type FilterType = keyof Omit<FilterState, 'times'>;

@Component({
  selector: 'app-course-search',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './course-search.component.html',
  styleUrl: './course-search.component.sass',
})
export class CourseSearchComponent implements OnInit {
  @Output() courseSelected = new EventEmitter<SearchItemDTO>();
  @Output() closed = new EventEmitter<void>();

  // Icons
  readonly Search = Search;
  readonly X = X;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;

  // State Signals
  searchQuery = signal('');
  isLoading = signal(false);
  searchResults = signal<SearchItemDTO[]>([]);
  filterOptions = signal<FilterOptionsDTO | null>(null);
  currentPage = signal(0);
  totalPages = signal(0);

  // UI State Signals
  expandedFilters = signal<Set<string>>(new Set(['semesters']));
  filters = signal<FilterState>({
    semesters: new Set(),
    subjects: new Set(),
    numbers: new Set(),
    credits: new Set(),
    faculty: new Set(),
    times: [],
  });
  
  timeFilterUI = signal<TimeFilter>({
    day: 'M',
    startHour: 8,
    startMinute: 0,
    endHour: 9,
    endMinute: 0,
  });

  // Constants
  readonly DAYS: string[] = ['M', 'T', 'W', 'R', 'F'];
  readonly HOURS: number[] = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  readonly MINUTES: number[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Computed
  activeFilterCount = computed(() => {
    const f = this.filters();
    const timeCount = f.times.length > 0 ? 1 : 0;
    return f.semesters.size + f.subjects.size + f.numbers.size + f.credits.size + f.faculty.size + timeCount;
  });

  constructor(private searchService: SearchService) {}

  ngOnInit() {
    this.loadFilterOptions();
  }

  // Formatting helpers for the template
  formatHourOption(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour} ${period}`;
  }

  formatMinuteOption(minute: number): string {
    return String(minute).padStart(2, '0');
  }

  formatTimeDisplay(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const displayMinute = String(minute).padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }

  loadFilterOptions() {
    this.searchService.getFilterOptions().subscribe({
      next: (options) => this.filterOptions.set(options),
      error: (err) => console.error('Failed to load filter options:', err),
    });
  }

  performSearch(page: number = 0) {
    this.isLoading.set(true);
    this.currentPage.set(page);

    const f = this.filters();
    
    // Convert time filters back to string format ("HH:mm:ss")
    // Spring Boot Jackson automatically deserializes "08:00:00" to java.time.LocalTime
    const times = f.times.length > 0 ? [f.times.map(t => {
      const startTimeStr = `${String(t.startHour).padStart(2, '0')}:${String(t.startMinute).padStart(2, '0')}:00`;
      const endTimeStr = `${String(t.endHour).padStart(2, '0')}:${String(t.endMinute).padStart(2, '0')}:00`;
      
      return {
        day: t.day,
        start_time: startTimeStr,
        end_time: endTimeStr
      };
    })] : undefined;

    const filterRequest = {
      keyword: this.searchQuery().trim() || undefined,
      semesters: f.semesters.size > 0 ? Array.from(f.semesters) : undefined,
      subjects: f.subjects.size > 0 ? Array.from(f.subjects) : undefined,
      numbers: f.numbers.size > 0 ? Array.from(f.numbers) : undefined,
      credits: f.credits.size > 0 ? Array.from(f.credits) : undefined,
      faculty: f.faculty.size > 0 ? Array.from(f.faculty) : undefined,
      times: times,
    };

    this.searchService.searchAndFilter(filterRequest as any, page).subscribe({
      next: (response: any) => {
        const results: SearchItemDTO[] = response.results ? Array.from(response.results) : [];
        this.searchResults.set(results);
        this.totalPages.set(response.totalPages ?? 1);
        this.currentPage.set(response.currentPage ?? page);

        const hasActiveSearch = this.searchQuery().trim().length > 0 || this.activeFilterCount() > 0;
        if (response.filterOptionsDTO && hasActiveSearch) {
          this.filterOptions.set(response.filterOptionsDTO);
        }

        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Search failed:', error);
        this.searchResults.set([]);
        this.isLoading.set(false);
      },
    });
  }

  toggleFilterOption(filterType: FilterType, value: any) {
    this.filters.update((current) => {
      const newFilters = { ...current };
      const newSet = new Set(current[filterType] as any);

      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      (newFilters[filterType] as any) = newSet;
      return newFilters;
    });
    this.performSearch(0);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) this.performSearch(this.currentPage() + 1);
  }

  prevPage() {
    if (this.currentPage() > 0) this.performSearch(this.currentPage() - 1);
  }

  toggleFilter(filterName: string) {
    this.expandedFilters.update((s) => {
      const next = new Set(s);
      if (next.has(filterName)) next.delete(filterName);
      else next.add(filterName);
      return next;
    });
  }

  isFilterSelected(filterType: FilterType, value: any): boolean {
    return (this.filters()[filterType] as any).has(value);
  }

  clearFilters() {
    this.filters.set({ semesters: new Set(), subjects: new Set(), numbers: new Set(), credits: new Set(), faculty: new Set(), times: [] });
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.totalPages.set(0);
    this.loadFilterOptions();
  }

  addTimeFilter() {
    const timeUI = this.timeFilterUI();
    const startMins = timeUI.startHour * 60 + timeUI.startMinute;
    const endMins = timeUI.endHour * 60 + timeUI.endMinute;

    if (startMins >= endMins) {
      console.warn('End time must be after start time');
      return;
    }

    this.filters.update((current) => {
      const newTimes = [...current.times];
      const exists = newTimes.some(
        (t) => t.day === timeUI.day && 
               t.startHour === timeUI.startHour && t.startMinute === timeUI.startMinute &&
               t.endHour === timeUI.endHour && t.endMinute === timeUI.endMinute
      );
      if (!exists) {
        newTimes.push({ ...timeUI });
      }
      return { ...current, times: newTimes };
    });

    this.performSearch(0);
  }

  removeTimeFilter(index: number) {
    this.filters.update((current) => {
      const newTimes = current.times.filter((_, i) => i !== index);
      return { ...current, times: newTimes };
    });
    this.performSearch(0);
  }

  getDayLabel(day: string): string {
    const dayMap: { [key: string]: string } = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday' };
    return dayMap[day] || day;
  }

  onDayChange(day: string) { this.timeFilterUI.update(t => ({ ...t, day })) }
  onStartHourChange(h: string) { this.timeFilterUI.update(t => ({ ...t, startHour: parseInt(h, 10) })) }
  onStartMinuteChange(m: string) { this.timeFilterUI.update(t => ({ ...t, startMinute: parseInt(m, 10) })) }
  onEndHourChange(h: string) { this.timeFilterUI.update(t => ({ ...t, endHour: parseInt(h, 10) })) }
  onEndMinuteChange(m: string) { this.timeFilterUI.update(t => ({ ...t, endMinute: parseInt(m, 10) })) }

  onSearchInput() {
    this.performSearch(0);
  }

  selectCourse(course: SearchItemDTO) {
    this.courseSelected.emit(course);
  }

  close() {
    this.closed.emit();
  }
}