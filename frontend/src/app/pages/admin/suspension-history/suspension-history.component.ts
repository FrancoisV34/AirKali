import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, SuspensionLog } from '../../../core/services/admin.service';

@Component({
  selector: 'app-suspension-history',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="history-container">
      <mat-spinner *ngIf="loading" diameter="32"></mat-spinner>

      <p *ngIf="!loading && history.length === 0" class="empty">Aucun historique.</p>

      <table *ngIf="!loading && history.length > 0" class="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Motif</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let entry of history" [class.suspend-row]="entry.action === 'SUSPEND'">
            <td>{{ entry.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
            <td>
              <span [class]="entry.action === 'SUSPEND' ? 'badge-suspended' : 'badge-active'">
                {{ entry.action === 'SUSPEND' ? 'Suspendu' : 'Réactivé' }}
              </span>
            </td>
            <td>{{ entry.motif || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .history-container { padding: 8px 0; }
    .history-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
    .history-table th, .history-table td { padding: 6px 10px; border-bottom: 1px solid #eee; text-align: left; }
    .badge-suspended { background: #f44336; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
    .badge-active { background: #4caf50; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
    .empty { color: #888; font-style: italic; }
  `],
})
export class SuspensionHistoryComponent implements OnChanges {
  @Input() userId!: number;
  @Input() isAdminView = false;

  history: SuspensionLog[] = [];
  loading = false;

  constructor(private adminService: AdminService) {}

  ngOnChanges(): void {
    if (this.userId) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    const obs = this.isAdminView
      ? this.adminService.getSuspensionHistory(this.userId)
      : this.adminService.getMySuspensionHistory();

    obs.subscribe({
      next: (data) => {
        this.history = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
