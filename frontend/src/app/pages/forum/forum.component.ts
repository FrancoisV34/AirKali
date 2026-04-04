import { Component } from '@angular/core';

@Component({
  selector: 'app-forum',
  standalone: true,
  template: `
    <div class="placeholder">
      <h2>Forum</h2>
      <p>Bientôt disponible</p>
    </div>
  `,
  styles: [`.placeholder { text-align: center; padding: 120px 24px; color: #777; }`],
})
export class ForumComponent {}
