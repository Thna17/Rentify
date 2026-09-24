import { Component, input, output } from '@angular/core';
@Component({ selector: 'kc-confirm', standalone: true, imports: [], template: `
  <div class="modal-back" (click)="cancel.emit()">
    <div class="modal" (click)="$event.stopPropagation()">
      <h3>{{title()}}</h3>
      <p>{{message()}}</p>
      <div class="modal-actions">
        <button class="btn" (click)="cancel.emit()">Cancel</button>
        <button class="btn btn-primary" (click)="confirm.emit()">{{confirmLabel()}}</button>
      </div>
    </div>
  </div>` })
export class ConfirmComponent {
  title = input.required<string>();
  message = input.required<string>();
  confirmLabel = input('Confirm');
  confirm = output();
  cancel = output();
}