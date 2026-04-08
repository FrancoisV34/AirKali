import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { SuspensionModalComponent } from '../suspension-modal/suspension-modal.component';
import { SuspensionHistoryComponent } from '../suspension-history/suspension-history.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    SuspensionHistoryComponent,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  total = 0;
  page = 1;
  limit = 20;
  searchInput = '';
  loading = false;
  actionMessage = '';

  expandedHistoryUserId: number | null = null;

  currentAdminId: number | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.currentAdminId = this.authService.getUserId();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getUsers(this.searchInput || undefined, this.page, this.limit).subscribe({
      next: (result) => {
        this.users = result.data;
        this.total = result.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadUsers();
  }

  onClearSearch(): void {
    this.searchInput = '';
    this.page = 1;
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  onPrevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadUsers();
    }
  }

  onNextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadUsers();
    }
  }

  canSuspend(user: AdminUser): boolean {
    return user.role !== 'ADMIN' && user.id !== this.currentAdminId && !user.estSuspendu;
  }

  canReactivate(user: AdminUser): boolean {
    return user.estSuspendu;
  }

  onSuspend(user: AdminUser): void {
    const dialogRef = this.dialog.open(SuspensionModalComponent, {
      data: { user },
      width: '480px',
    });

    dialogRef.afterClosed().subscribe((motif: string | null) => {
      if (!motif) return;
      this.actionMessage = '';
      this.adminService.suspendUser(user.id, motif).subscribe({
        next: (res) => {
          this.actionMessage = res.message;
          this.loadUsers();
        },
        error: (err) => {
          this.actionMessage = err.error?.message || 'Erreur lors de la suspension.';
        },
      });
    });
  }

  onReactivate(user: AdminUser): void {
    if (!confirm(`Réactiver le compte de ${user.prenom} ${user.nom} ?`)) return;

    this.actionMessage = '';
    this.adminService.reactivateUser(user.id).subscribe({
      next: (res) => {
        this.actionMessage = res.message;
        this.loadUsers();
      },
      error: (err) => {
        this.actionMessage = err.error?.message || 'Erreur lors de la réactivation.';
      },
    });
  }

  onToggleHistory(userId: number): void {
    this.expandedHistoryUserId = this.expandedHistoryUserId === userId ? null : userId;
  }
}
