import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Notification } from '../../../core/models/forum.models';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './notification-modal.component.html',
  styleUrl: './notification-modal.component.scss',
})
export class NotificationModalComponent {
  @Input() notifications: Notification[] = [];
  @Output() acknowledged = new EventEmitter<number>();

  get current(): Notification | null {
    return this.notifications.length > 0 ? this.notifications[0] : null;
  }

  onOk(): void {
    if (this.current) {
      this.acknowledged.emit(this.current.id);
    }
  }
}
