import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  exportData(
    communeId: number,
    format: 'csv' | 'pdf',
    type: 'air' | 'meteo' | 'both',
    from: string,
    to: string,
  ): void {
    const url = `${this.baseUrl}/communes/${communeId}/export?format=${format}&type=${type}&from=${from}&to=${to}`;

    this.http.get(url, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response) => {
        const contentType = response.headers.get('content-type') || '';

        // If JSON response, it means no data available
        if (contentType.includes('application/json')) {
          const reader = new FileReader();
          reader.onload = () => {
            const json = JSON.parse(reader.result as string);
            alert(json.message || 'Aucune donnée disponible');
          };
          reader.readAsText(response.body!);
          return;
        }

        const disposition = response.headers.get('content-disposition') || '';
        const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
        const filename = filenameMatch ? filenameMatch[1] : `export.${format}`;

        const blob = response.body!;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      },
      error: (err) => {
        const message = err.error?.message || 'Erreur lors de l\'export';
        alert(message);
      },
    });
  }
}
