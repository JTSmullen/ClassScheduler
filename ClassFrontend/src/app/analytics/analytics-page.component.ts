import { Component, OnInit, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule, DecimalPipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { LucideAngularModule, ChevronLeft, Activity, Server } from 'lucide-angular';
import { AnalyticsService, MethodStatDTO } from './analytics.service'; // Ensure path is correct

Chart.register(...registerables);

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DecimalPipe],
  templateUrl: './analytics-page.component.html',
  styleUrls: ['./analytics-page.component.sass'] // Matches your .sass file exactly
})
export class AnalyticsPageComponent implements OnInit {
  stats = signal<MethodStatDTO[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  readonly ChevronLeft = ChevronLeft;
  readonly Activity = Activity;
  readonly Server = Server;

  private chart: any;

  constructor(
    private analyticsService: AnalyticsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMetrics();
    }
  }

  loadMetrics(): void {
    this.isLoading.set(true);
    // Uses your hardcoded localhost URL from the service
    this.analyticsService.getDashboardData().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.renderChart(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Analytics Error:', err);
        this.errorMessage.set('Failed to load server stats. Check if Spring Boot is running on 8080.');
        this.isLoading.set(false);
      }
    });
  }

  renderChart(data: MethodStatDTO[]): void {
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart("apiLineChart", {
      type: 'bar',
      data: {
        labels: data.map(s => s.method),
        datasets: [
          {
            label: 'Avg Latency (ms)',
            data: data.map(s => s.avgMs),
            backgroundColor: 'rgba(66, 165, 245, 0.7)',
            borderColor: '#42A5F5',
            borderWidth: 1
          },
          {
            label: 'Max Latency (ms)',
            // Use average as a fallback if max is 0 for better visuals
            data: data.map(s => s.maxMs > 0 ? s.maxMs : s.avgMs),
            backgroundColor: 'rgba(255, 167, 38, 0.7)',
            borderColor: '#FFA726',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Milliseconds' }
          }
        }
      }
    });
  }

  goBack() {
    window.history.back();
  }
}
