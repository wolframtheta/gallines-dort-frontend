import { Component, signal } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { DecimalPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { eggOutline, walletOutline, arrowForwardOutline, cashOutline, trashOutline } from 'ionicons/icons';
import { GallinesService } from '../services/gallines.service';
import { COLORS } from '../models';
import type { TransactionDto } from '../services/api.service';

@Component({
  selector: 'app-balance',
  templateUrl: 'balance.page.html',
  styleUrls: ['balance.page.scss'],
  imports: [
    HeaderComponent,
    IonContent,
    IonIcon,
    DecimalPipe,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonSpinner,
  ],
})
export class BalancePage implements ViewWillEnter {
  readonly COLORS = COLORS;
  readonly Math = Math;
  deletingTransactionId = signal<string | null>(null);

  constructor(public gallines: GallinesService) {
    addIcons({ eggOutline, walletOutline, arrowForwardOutline, cashOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('balance');
  }

  get sortedTransactions(): TransactionDto[] {
    return [...this.gallines.transactions$()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  getMemberName(t: TransactionDto): string {
    if (t.type === 'income') {
      if (t.orderId) return `Comanda ${t.orderId.substring(0, 8)}`;
      return t.clientName || 'Ingrés';
    }
    if (t.user) return t.user.displayName || t.user.email;
    if (t.userId) return this.gallines.getMemberName(t.userId);
    return 'General';
  }

  async deleteTransaction(id: string): Promise<void> {
    if (this.deletingTransactionId() === id) return;
    this.deletingTransactionId.set(id);
    try {
      await this.gallines.deleteTransaction(id);
    } finally {
      this.deletingTransactionId.set(null);
    }
  }
}
