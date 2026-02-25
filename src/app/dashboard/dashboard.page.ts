import { Component, signal } from '@angular/core';
import { IonContent, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonSkeletonText, IonSpinner, ViewWillEnter } from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { GallinesService } from '../services/gallines.service';
import { COLORS } from '../models';
import { addIcons } from 'ionicons';
import { arrowUpOutline, arrowDownOutline, cashOutline, eggOutline, trashOutline } from 'ionicons/icons';
import { DecimalPipe } from '@angular/common';
import type { TransactionDto } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [HeaderComponent, IonContent, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonSkeletonText, IonSpinner, DecimalPipe],
})
export class DashboardPage implements ViewWillEnter {
  readonly COLORS = COLORS;
  deletingTransactionId = signal<string | null>(null);

  constructor(public gallines: GallinesService) {
    addIcons({ arrowUpOutline, arrowDownOutline, cashOutline, eggOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('dashboard');
  }

  get sortedTransactions(): TransactionDto[] {
    return [...this.gallines.transactions$()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  getMemberName(t: TransactionDto): string {
    if (t.user) return t.user.displayName || t.user.email;
    if (t.userId) return this.gallines.getMemberName(t.userId);
    if (t.clientName) return t.clientName;
    return 'Desconegut';
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
}
