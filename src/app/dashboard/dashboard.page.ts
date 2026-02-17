import { Component } from '@angular/core';
import { IonContent, IonIcon, ViewWillEnter } from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { GallinesService } from '../services/gallines.service';
import { COLORS } from '../models';
import { addIcons } from 'ionicons';
import { arrowUpOutline, arrowDownOutline, cashOutline, eggOutline } from 'ionicons/icons';
import { DecimalPipe } from '@angular/common';
import type { TransactionDto } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [HeaderComponent, IonContent, IonIcon, DecimalPipe],
})
export class DashboardPage implements ViewWillEnter {
  readonly COLORS = COLORS;

  constructor(public gallines: GallinesService) {
    addIcons({ arrowUpOutline, arrowDownOutline, cashOutline, eggOutline });
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
    if (t.type === 'income') {
      if (t.orderId) return `Comanda ${t.orderId.substring(0, 8)}`;
      return t.clientName || 'Ingrés';
    }
    if (t.user) return t.user.displayName || t.user.email;
    if (t.userId) return this.gallines.getMemberName(t.userId);
    return 'General';
  }
}
