import { Component, signal, computed } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
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
} from 'ionicons/icons';
import { GallinesService } from '../services/gallines.service';
import { COLORS } from '../models';
import type { OrderDto } from '../services/api.service';

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
  ],
})
export class ComandesPage implements ViewWillEnter {
  readonly COLORS = COLORS;
  newOrder = {
    clientName: '',
    mitgesDotzenes: signal(1),
  };

  showCompleted = signal(true); // Obert per defecte per veure les comandes pagades

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
    });
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('comandes');
  }

  readonly activeOrders = computed(() =>
    [...this.gallines.orders$()]
      .filter((o) => !o.paid || !o.delivered)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
  );

  readonly completedOrders = computed(() =>
    [...this.gallines.orders$()]
      .filter((o) => o.paid && o.delivered)
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
    if (await this.gallines.createOrder({
      clientName: this.newOrder.clientName.trim(),
      mitgesDotzenes: qty,
    })) {
      this.newOrder.clientName = '';
      this.newOrder.mitgesDotzenes.set(1);
    }
  }

  togglePaid(o: OrderDto): void {
    void this.gallines.updateOrder(o.id, { paid: !o.paid });
  }

  toggleDelivered(o: OrderDto): void {
    void this.gallines.updateOrder(o.id, { delivered: !o.delivered });
  }

  deleteOrder(o: OrderDto): void {
    void this.gallines.deleteOrder(o.id);
  }
}
