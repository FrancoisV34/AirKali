import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { Commune, CommuneService } from '../../../../core/services/commune.service';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent implements OnInit {
  @Output() communeSelected = new EventEmitter<Commune>();

  searchControl = new FormControl('');
  results: Commune[] = [];

  constructor(private communeService: CommuneService) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((val): val is string => typeof val === 'string' && val.length >= 2),
        switchMap((query) => this.communeService.searchCommunes(query)),
      )
      .subscribe((communes) => {
        this.results = communes;
      });
  }

  displayFn(commune: Commune): string {
    return commune ? `${commune.nom} — ${commune.codePostal}` : '';
  }

  onSelect(commune: Commune): void {
    this.communeSelected.emit(commune);
  }
}
