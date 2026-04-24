import { Component, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchItemDTO, FilterOptionsDTO } from './search.service';
import { LucideAngularModule, Search, X, ChevronDown, ChevronUp } from 'lucide-angular';

interface FilterState {
  semesters: Set<string>;
  subjects: Set<string>;
  numbers: Set<number>;
  credits: Set<number>;
  faculty: Set<string>;
}

type FilterType = keyof FilterState;

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
  });

  // Computed
  activeFilterCount = computed(() => {
    const f = this.filters();
    return f.semesters.size + f.subjects.size + f.numbers.size + f.credits.size + f.faculty.size;
  });

  constructor(private searchService: SearchService) {}

  ngOnInit() {
    this.loadFilterOptions();
    this.performSearch(0);
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
    const filterRequest = {
      keyword: this.searchQuery().trim() || undefined,
      semesters: f.semesters.size > 0 ? Array.from(f.semesters) : undefined,
      subjects: f.subjects.size > 0 ? Array.from(f.subjects) : undefined,
      numbers: f.numbers.size > 0 ? Array.from(f.numbers) : undefined,
      credits: f.credits.size > 0 ? Array.from(f.credits) : undefined,
      faculty: f.faculty.size > 0 ? Array.from(f.faculty) : undefined,
    };

    this.searchService.searchAndFilter(filterRequest as any, page).subscribe({
      next: (response: any) => {
        // Support both direct array response or paginated object { results: [], totalPages: x }
        const data = Array.isArray(response) ? response : (response.results || []);
        this.totalPages.set(response.totalPages || 1);
        
        // Instant update
        this.searchResults.set(data);
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

    this.performSearch(0); // Reset to page 0 on change
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.performSearch(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 0) {
      this.performSearch(this.currentPage() - 1);
    }
  }

  toggleFilter(filterName: string) {
    this.expandedFilters.update(s => {
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
    this.filters.set({
      semesters: new Set(),
      subjects: new Set(),
      numbers: new Set(),
      credits: new Set(),
      faculty: new Set(),
    });
    this.performSearch(0);
  }

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