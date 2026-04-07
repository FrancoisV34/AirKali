import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NotificationModalComponent } from './shared/components/notification-modal/notification-modal.component';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { Notification } from './core/models/forum.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HeaderComponent, FooterComponent, NotificationModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  pendingNotifications: Notification[] = [];

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      if (loggedIn) {
        this.notificationService.getUnread().subscribe({
          next: (notifs) => (this.pendingNotifications = notifs),
          error: () => {},
        });
      } else {
        this.pendingNotifications = [];
      }
    });
  }

  onNotificationAcknowledged(id: number): void {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.pendingNotifications = this.pendingNotifications.filter((n) => n.id !== id);
      },
      error: () => {
        this.pendingNotifications = this.pendingNotifications.filter((n) => n.id !== id);
      },
    });
  }
}
