import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminUser } from '../../../core/services/admin.service';

@Component({
  selector: 'app-suspension-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Suspendre {{ data.user.prenom }} {{ data.user.nom }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Motif (obligatoire)</mat-label>
        <textarea matInput [(ngModel)]="motif" rows="3" placeholder="Raison de la suspension..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Annuler</button>
      <button mat-raised-button color="warn" [disabled]="!motif.trim()" (click)="dialogRef.close(motif.trim())">
        Confirmer
      </button>
    </mat-dialog-actions>
  `,
})
export class SuspensionModalComponent {
  motif = '';

  constructor(
    public dialogRef: MatDialogRef<SuspensionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: AdminUser },
  ) {}
}
