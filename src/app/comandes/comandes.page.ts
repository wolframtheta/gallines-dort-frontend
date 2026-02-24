import { Component, signal, computed } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonSkeletonText,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  listOutline,
  addOutline,
  cashOutline,
  cash,
  cubeOutline,
  cube,
  trashOutline,
  chevronDownOutline,
  chevronForwardOutline,
  repeatOutline,
} from 'ionicons/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { GallinesService } from '../services/gallines.service';
import { COLORS } from '../models';
import type { OrderDto } from '../services/api.service';

dayjs.extend(isoWeek);

@Component({
  selector: 'app-comandes',
  templateUrl: 'comandes.page.html',
  styleUrls: ['comandes.page.scss'],
  imports: [
    HeaderComponent,
    IonContent,
    IonIcon,
    FormsModule,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonSkeletonText,
    IonSpinner,
  ],
})
export class ComandesPage implements ViewWillEnter {
  readonly COLORS = COLORS;
  newOrder = {
    clientName: '',
    mitgesDotzenes: signal(1),
  };

  showCompleted = signal(true); // Obert per defecte per veure les comandes pagades

  addingOrder = signal(false);
  updatingOrderId = signal<string | null>(null);
  deletingOrderId = signal<string | null>(null);

  readonly minQty = 1;
  readonly unit = 1;

  constructor(public gallines: GallinesService) {
    addIcons({
      listOutline,
      addOutline,
      cashOutline,
      cash,
      cubeOutline,
      cube,
      trashOutline,
      chevronDownOutline,
      chevronForwardOutline,
      repeatOutline,
    });
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('comandes');
  }

  readonly activeOrders = computed(() =>
    [...this.gallines.orders$()]
      .filter(
        (o) =>
          o.subscriptionId
            ? !o.delivered
            : !o.paid || !o.delivered
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
  );

  readonly completedOrders = computed(() =>
    [...this.gallines.orders$()]
      .filter(
        (o) =>
          o.subscriptionId ? o.delivered : o.paid && o.delivered
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
  );

  toggleCompleted() {
    this.showCompleted.update((v) => !v);
  }

  getPersonName(o: OrderDto): string {
    return o.clientName;
  }

  /** Darrer dia de la setmana (diumenge) de la data de creació + 1 setmana */
  getWeekEndLabel(o: OrderDto): string {
    if (!o.subscriptionId || !o.createdAt) return '';
    return dayjs(o.createdAt).endOf('isoWeek').add(1, 'week').format('DD/MM');
  }

  incrementQty(): void {
    this.newOrder.mitgesDotzenes.update((v) => v + this.unit);
  }

  decrementQty(): void {
    this.newOrder.mitgesDotzenes.update((v) =>
      v > this.minQty ? v - this.unit : v
    );
  }

  setQty(value: number | string): void {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(n) && n >= this.minQty) {
      this.newOrder.mitgesDotzenes.set(n);
    }
  }

  async addOrder(): Promise<void> {
    const qty = this.newOrder.mitgesDotzenes();
    if (!this.newOrder.clientName?.trim() || qty < this.minQty) return;
    this.addingOrder.set(true);
    try {
      if (await this.gallines.createOrder({
        clientName: this.newOrder.clientName.trim(),
        mitgesDotzenes: qty,
        createdAt: new Date().toISOString(),
      })) {
        this.newOrder.clientName = '';
        this.newOrder.mitgesDotzenes.set(1);
      }
    } finally {
      this.addingOrder.set(false);
    }
  }

  async togglePaid(o: OrderDto): Promise<void> {
    this.updatingOrderId.set(o.id);
    try {
      await this.gallines.updateOrder(o.id, { paid: !o.paid });
    } finally {
      this.updatingOrderId.set(null);
    }
  }

  async toggleDelivered(o: OrderDto): Promise<void> {
    this.updatingOrderId.set(o.id);
    try {
      await this.gallines.updateOrder(o.id, { delivered: !o.delivered });
    } finally {
      this.updatingOrderId.set(null);
    }
  }

  async deleteOrder(o: OrderDto): Promise<void> {
    if (this.deletingOrderId() === o.id) return;
    this.deletingOrderId.set(o.id);
    try {
      await this.gallines.deleteOrder(o.id);
    } finally {
      this.deletingOrderId.set(null);
    }
  }
}
