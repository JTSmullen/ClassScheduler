import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Calendar, Search, BookOpen } from 'lucide-angular';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.sass']
})
export class LandingPage {
  readonly Calendar = Calendar;
  readonly Search = Search;
  readonly BookOpen = BookOpen;
}