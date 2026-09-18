import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  MovementDetailModalComponent,
  type MovementDetailData,
} from '../components/movement-detail-modal/movement-detail-modal.component';
import { GallinesService } from './gallines.service';
import type { PaymentDto, TransactionDto, User } from './api.service';

export interface SplitExpenseDetail {
  totalAmount: number;
  description: string;
  date: string;
  payerName: string;
  payerId: string;
  assignments: { name: string; amount: number }[];
  debts: { fromName: string; toName: string; amount: number }[];
}

@Injectable({ providedIn: 'root' })
export class MovementDetailService {
  private readonly modalCtrl = inject(ModalController);
  private readonly gallines = inject(GallinesService);

  getSplitExpenseDetail(splitGroupId: string): SplitExpenseDetail | null {
    const txs = this.gallines
      .transactions$()
      .filter((t) => t.splitGroupId === splitGroupId);
    const mainExpense = txs.find(
      (t) => !t.paymentGroupId && t.type === 'expense'
    );
    if (!mainExpense?.userId) return null;

    const splitPayments = this.gallines
      .payments$()
      .filter((p) => p.splitGroupId === splitGroupId);
    const payerName = this.resolveName(mainExpense.userId, mainExpense.user);
    const totalAmount = mainExpense.amount;

    const assignments: { name: string; amount: number }[] = [];
    let othersTotal = 0;

    for (const payment of splitPayments) {
      assignments.push({
        name: this.resolveName(payment.fromUserId, undefined, payment.fromName),
        amount: payment.amount,
      });
      othersTotal += payment.amount;
    }

    const payerShare = totalAmount - othersTotal;
    if (payerShare > 0.01) {
      assignments.push({ name: payerName, amount: payerShare });
    }

    assignments.sort((a, b) => b.amount - a.amount);

    return {
      totalAmount,
      description: mainExpense.description,
      date: mainExpense.date,
      payerName,
      payerId: mainExpense.userId,
      assignments,
      debts: splitPayments.map((p) => ({
        fromName: this.resolveName(p.fromUserId, undefined, p.fromName),
        toName: this.resolveName(p.toUserId, undefined, p.toName),
        amount: p.amount,
      })),
    };
  }

  private resolveName(
    userId: string,
    user?: User | null,
    fallbackName?: string
  ): string {
    if (user) return user.displayName || user.email;
    if (fallbackName && fallbackName !== '?' && fallbackName !== userId) {
      return fallbackName;
    }
    const resolved = this.gallines.getMemberName(userId);
    return resolved !== userId ? resolved : fallbackName || resolved;
  }

  async openTransaction(transaction: TransactionDto): Promise<void> {
    const payerName = this.resolveName(
      transaction.userId ?? '',
      transaction.user
    );

    const splitDetail = transaction.splitGroupId
      ? this.getSplitExpenseDetail(transaction.splitGroupId)
      : null;

    await this.present({
      kind: 'transaction',
      transaction,
    }, payerName, splitDetail);
  }

  async openPayment(payment: PaymentDto): Promise<void> {
    await this.present({ kind: 'payment', payment });
  }

  private async present(
    data: MovementDetailData,
    payerName = '',
    splitDetail: SplitExpenseDetail | null = null
  ): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: MovementDetailModalComponent,
      componentProps: { data, payerName, splitDetail },
      breakpoints: [0, 0.85],
      initialBreakpoint: 0.85,
    });
    await modal.present();
  }
}
