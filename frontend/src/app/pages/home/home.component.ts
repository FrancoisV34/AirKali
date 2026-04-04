import { Component } from '@angular/core';
import { MapPreviewComponent } from './components/map-preview/map-preview.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MapPreviewComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
