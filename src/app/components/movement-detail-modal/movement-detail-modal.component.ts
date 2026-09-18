import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { IonHeader, IonContent, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { COLORS } from '../../models';
import type { PaymentDto, TransactionDto } from '../../services/api.service';
import type { SplitExpenseDetail } from '../../services/movement-detail.service';

export type MovementDetailData =
  | { kind: 'transaction'; transaction: TransactionDto }
  | { kind: 'payment'; payment: PaymentDto };

@Component({
  selector: 'app-movement-detail-modal',
  templateUrl: './movement-detail-modal.component.html',
  styleUrls: ['./movement-detail-modal.component.scss'],
  imports: [CommonModule, DecimalPipe, IonHeader, IonContent, IonIcon],
})
export class MovementDetailModalComponent implements OnInit {
  @Input() data!: MovementDetailData;
  @Input() payerName = '';
  @Input() splitDetail: SplitExpenseDetail | null = null;

  readonly COLORS = COLORS;

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline });
  }

  ngOnInit(): void {
    if (!this.data) return;
  }

  get isSplitExpense(): boolean {
    return (
      this.data.kind === 'transaction' &&
      !!this.data.transaction.splitGroupId &&
      !!this.splitDetail
    );
  }

  get isExpense(): boolean {
    return this.data.kind === 'transaction' && this.data.transaction.type === 'expense';
  }

  get isIncome(): boolean {
    return this.data.kind === 'transaction' && this.data.transaction.type === 'income';
  }

  get title(): string {
    if (this.data.kind === 'payment') return 'Detall de l\'ingrés';
    if (this.isSplitExpense) return 'Despesa compartida';
    if (this.isExpense) return 'Detall de la despesa';
    return 'Detall de l\'ingrés';
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
