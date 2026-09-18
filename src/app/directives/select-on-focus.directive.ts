import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: 'input[appSelectOnFocus]',
  standalone: true,
})
export class SelectOnFocusDirective {
  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    requestAnimationFrame(() => input.select());
  }
}
