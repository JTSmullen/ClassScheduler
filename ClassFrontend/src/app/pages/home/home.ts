import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.sass',
})

export class Home {
  showCreate = false;
  scheduleName = '';

  toggleCreate() {
    this.showCreate = !this.showCreate;
  }

  createSchedule() {
    console.log('New schedule:', this.scheduleName);
  }
}
