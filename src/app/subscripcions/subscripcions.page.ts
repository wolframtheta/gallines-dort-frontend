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
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { HeaderComponent } from '../components/header/header.component';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  repeatOutline,
  addOutline,
  trashOutline,
  chevronDownOutline,
  chevronForwardOutline,
  cashOutline,
  pencilOutline,
} from 'ionicons/icons';
import { GallinesService } from '../services/gallines.service';
import { COLORS } from '../models';
import type { SubscriptionDto } from '../services/api.service';

@Component({
  selector: 'app-subscripcions',
  templateUrl: 'subscripcions.page.html',
  styleUrls: ['subscripcions.page.scss'],
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
export class SubscripcionsPage implements ViewWillEnter {
  readonly COLORS = COLORS;
  newSub = {
    clientName: '',
    mitgesDotzenes: signal(1),
    amountPerMonth: signal<number | null>(10),
  };

  showInactive = signal(false);
  readonly minQty = 1;
  readonly unit = 1;

  addingSub = signal(false);
  charging = signal<string | null>(null);
  updatingSubId = signal<string | null>(null);
  deletingSubId = signal<string | null>(null);

  constructor(
    public gallines: GallinesService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      repeatOutline,
      addOutline,
      trashOutline,
      chevronDownOutline,
      chevronForwardOutline,
      cashOutline,
      pencilOutline,
    });
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('subscripcions');
  }

  readonly activeSubs = computed(() =>
    [...this.gallines.subscriptions$()].filter((s) => s.active)
  );

  readonly inactiveSubs = computed(() =>
    [...this.gallines.subscriptions$()].filter((s) => !s.active)
  );

  toggleInactive() {
    this.showInactive.update((v) => !v);
  }

  incrementQty(): void {
    this.newSub.mitgesDotzenes.update((v) => v + this.unit);
  }

  decrementQty(): void {
    this.newSub.mitgesDotzenes.update((v) =>
      v > this.minQty ? v - this.unit : v
    );
  }

  setQty(value: number | string): void {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(n) && n >= this.minQty) {
      this.newSub.mitgesDotzenes.set(n);
    }
  }

  setAmountPerMonth(value: number | string): void {
    const v = typeof value === 'string' ? value.trim() : String(value);
    if (v === '' || v === 'null') {
      this.newSub.amountPerMonth.set(null);
      return;
    }
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0) {
      this.newSub.amountPerMonth.set(n);
    }
  }

  async addSubscription(): Promise<void> {
    const qty = this.newSub.mitgesDotzenes();
    if (!this.newSub.clientName?.trim() || qty < this.minQty) return;

    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    this.addingSub.set(true);
    try {
      const amount = this.newSub.amountPerMonth();
      if (await this.gallines.createSubscription({
        clientName: this.newSub.clientName.trim(),
        mitgesDotzenes: qty,
        amountPerMonth: amount != null && amount > 0 ? amount : undefined,
      })) {
        this.newSub.clientName = '';
        this.newSub.mitgesDotzenes.set(1);
        this.newSub.amountPerMonth.set(10);
        const toast = await this.toastCtrl.create({
          message: 'Subscripció afegida!',
          duration: 1500,
          position: 'bottom',
        });
        await toast.present();
      }
    } finally {
      this.addingSub.set(false);
    }
  }

  formatAmount(s: { amountPerMonth?: number | null }): string {
    if (s.amountPerMonth != null && s.amountPerMonth > 0) {
      return s.amountPerMonth + ' €/mes';
    }
    return 'Calculat';
  }

  async editAmount(s: SubscriptionDto): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Import mensual',
      message: s.clientName,
      inputs: [
        {
          name: 'amount',
          type: 'number',
          value: s.amountPerMonth ?? '',
          min: 0,
        },
      ],
      buttons: [
        { text: 'Cancel·lar', role: 'cancel' },
        {
          text: 'Desar',
          handler: async (data) => {
            const v = data.amount;
            const n = v === '' || v == null ? null : parseFloat(String(v));
            if (n === null || (!isNaN(n) && n >= 0)) {
              this.updatingSubId.set(s.id);
              try {
                await this.gallines.updateSubscription(s.id, { amountPerMonth: n });
              } finally {
                this.updatingSubId.set(null);
              }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async chargeMonth(s: SubscriptionDto): Promise<void> {
    this.charging.set(s.id);
    try {
      const res = await this.gallines.chargeMonth(s.id);
      if (res) {
        // success
      }
    } finally {
      this.charging.set(null);
    }
  }

  async toggleActive(s: SubscriptionDto): Promise<void> {
    if (this.updatingSubId() === s.id) return;
    this.updatingSubId.set(s.id);
    try {
      await this.gallines.updateSubscription(s.id, { active: !s.active });
    } finally {
      this.updatingSubId.set(null);
    }
  }

  async deleteSub(s: SubscriptionDto): Promise<void> {
    if (this.deletingSubId() === s.id) return;
    this.deletingSubId.set(s.id);
    try {
      await this.gallines.deleteSubscription(s.id);
    } finally {
      this.deletingSubId.set(null);
    }
  }
}
