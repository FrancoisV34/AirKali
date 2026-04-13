import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService, ManualAlertItem } from '../../../core/services/admin.service';
import { CommuneService, Commune } from '../../../core/services/commune.service';

@Component({
  selector: 'app-admin-alertes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './admin-alertes.component.html',
  styleUrl: './admin-alertes.component.scss',
})
export class AdminAlertesComponent implements OnInit {
  alerts: ManualAlertItem[] = [];
  communes: Commune[] = [];
  loading = false;
  creating = false;
  searchCommune = '';

  // Form
  selectedCommuneId: number | null = null;
  selectedPalier = 'AIR_MAUVAIS';
  message = '';
  formError = '';
  formSuccess = '';

  paliers = [
    { value: 'AIR_MOYEN', label: 'Air — Moyen' },
    { value: 'AIR_MAUVAIS', label: 'Air — Mauvais' },
    { value: 'AIR_TRES_MAUVAIS', label: 'Air — Très mauvais' },
    { value: 'METEO_SEVERE', label: 'Météo — Sévère' },
  ];

  constructor(
    private adminService: AdminService,
    private communeService: CommuneService,
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.adminService.getManualAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  searchCommunes(): void {
    if (this.searchCommune.length < 2) return;
    this.communeService.searchCommunes(this.searchCommune).subscribe({
      next: (communes) => (this.communes = communes),
    });
  }

  onCreate(): void {
    this.formError = '';
    this.formSuccess = '';

    if (!this.selectedCommuneId) {
      this.formError = 'Veuillez sélectionner une commune';
      return;
    }

    this.creating = true;
    this.adminService
      .createManualAlert({
        communeId: this.selectedCommuneId,
        palier: this.selectedPalier,
        message: this.message || undefined,
      })
      .subscribe({
        next: () => {
          this.formSuccess = 'Alerte créée avec succès';
          this.message = '';
          this.creating = false;
          this.loadAlerts();
        },
        error: (err) => {
          this.formError = err.error?.message || 'Erreur lors de la création';
          this.creating = false;
        },
      });
  }

  onClose(id: number): void {
    this.adminService.closeManualAlert(id).subscribe({
      next: () => this.loadAlerts(),
    });
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Active':
        return 'statut-active';
      case 'Clôturée':
        return 'statut-closed';
      case 'Expirée':
        return 'statut-expired';
      default:
        return '';
    }
  }
}
