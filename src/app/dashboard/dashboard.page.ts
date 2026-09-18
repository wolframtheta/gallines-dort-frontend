import { Component, signal } from '@angular/core';
import { IonContent, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonSkeletonText, IonSpinner, ViewWillEnter } from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { GallinesService } from '../services/gallines.service';
import { MovementDetailService } from '../services/movement-detail.service';
import { COLORS } from '../models';
import { addIcons } from 'ionicons';
import { arrowUpOutline, arrowDownOutline, cashOutline, eggOutline, trashOutline, walletOutline, arrowForwardOutline } from 'ionicons/icons';
import { DecimalPipe } from '@angular/common';
import type { PaymentDto, TransactionDto } from '../services/api.service';

export type DashboardMovement =
  | { kind: 'transaction'; item: TransactionDto; sortKey: string }
  | { kind: 'payment'; item: PaymentDto; sortKey: string };

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [HeaderComponent, IonContent, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonSkeletonText, IonSpinner, DecimalPipe],
})
export class DashboardPage implements ViewWillEnter {
  readonly COLORS = COLORS;
  readonly Math = Math;
  deletingTransactionId = signal<string | null>(null);
  deletingPaymentId = signal<string | null>(null);

  constructor(
    public gallines: GallinesService,
    private movementDetail: MovementDetailService
  ) {
    addIcons({
      arrowUpOutline,
      arrowDownOutline,
      cashOutline,
      eggOutline,
      trashOutline,
      walletOutline,
      arrowForwardOutline,
    });
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('dashboard');
  }

  get sortedMovements(): DashboardMovement[] {
    const transactions: DashboardMovement[] = this.gallines
      .transactions$()
      .filter((t) => !t.paymentGroupId)
      .map((t) => ({
        kind: 'transaction' as const,
        item: t,
        sortKey: t.createdAt ?? t.date,
      }));

    const payments: DashboardMovement[] = this.gallines
      .payments$()
      .filter((p) => p.isSettlement !== false)
      .map((p) => ({
        kind: 'payment' as const,
        item: p,
        sortKey: p.createdAt,
      }));

    return [...transactions, ...payments].sort(
      (a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime()
    );
  }

  getMemberName(t: TransactionDto): string {
    if (t.user) return t.user.displayName || t.user.email;
    if (t.userId) return this.gallines.getMemberName(t.userId);
    if (t.clientName) return t.clientName;
    return 'Desconegut';
  }

  isExpense(m: DashboardMovement): boolean {
    return m.kind === 'transaction' && m.item.type === 'expense';
  }

  isIncome(m: DashboardMovement): boolean {
    return m.kind === 'payment' || (m.kind === 'transaction' && m.item.type === 'income');
  }

  getMovementDescription(m: DashboardMovement): string {
    if (m.kind === 'payment') {
      return m.item.description || `Pagament de ${m.item.fromName}`;
    }
    return m.item.description;
  }

  getMovementSubtitle(m: DashboardMovement): string {
    if (m.kind === 'payment') {
      return `${m.item.fromName} → ${m.item.toName} • ${m.item.date}`;
    }
    return `${this.getMemberName(m.item)} • ${m.item.date}`;
  }

  getMovementIcon(m: DashboardMovement): string {
    if (m.kind === 'payment') return 'arrow-up-outline';
    return m.item.type === 'expense' ? 'cash-outline' : 'egg-outline';
  }

  getMovementAmount(m: DashboardMovement): number {
    return m.item.amount;
  }

  isDeleting(m: DashboardMovement): boolean {
    if (m.kind === 'transaction') {
      return this.deletingTransactionId() === m.item.id;
    }
    return this.deletingPaymentId() === m.item.paymentGroupId;
  }

  openMovementDetail(m: DashboardMovement): void {
    if (m.kind === 'transaction') {
      void this.movementDetail.openTransaction(m.item);
    } else {
      void this.movementDetail.openPayment(m.item);
    }
  }

  async deleteMovement(m: DashboardMovement): Promise<void> {
    if (m.kind === 'transaction') {
      await this.deleteTransaction(m.item);
    } else {
      await this.deletePayment(m.item.paymentGroupId);
    }
  }

  async deleteTransaction(t: TransactionDto): Promise<void> {
    if (this.deletingTransactionId() === t.id) return;
    this.deletingTransactionId.set(t.id);
    try {
      await this.gallines.deleteTransaction(t.id);
    } finally {
      this.deletingTransactionId.set(null);
    }
  }

  async deletePayment(paymentGroupId: string): Promise<void> {
    if (this.deletingPaymentId() === paymentGroupId) return;
    this.deletingPaymentId.set(paymentGroupId);
    try {
      await this.gallines.deletePayment(paymentGroupId);
    } finally {
      this.deletingPaymentId.set(null);
    }
  }
}
