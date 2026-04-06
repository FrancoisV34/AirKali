import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Pipe({ name: 'safeMarkdown', standalone: true })
export class SafeMarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    const rawHtml = marked.parse(value) as string;
    const clean = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
