import { Component, OnInit, inject, effect, signal, computed } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSkeletonText,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';
import { GallinesService } from '../services/gallines.service';
import { AuthService } from '../services/auth.service';
import { PaymentDto, User } from '../services/api.service';
import { MovementDetailService } from '../services/movement-detail.service';
import { COLORS } from '../models';
import { SelectOnFocusDirective } from '../directives/select-on-focus.directive';

@Component({
  selector: 'app-ingresos',
  templateUrl: 'ingresos.page.html',
  styleUrls: ['ingresos.page.scss'],
  imports: [
    HeaderComponent,
    IonContent,
    IonIcon,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSkeletonText,
    IonSpinner,
    FormsModule,
    SelectOnFocusDirective,
  ],
})
export class IngresosPage implements OnInit, ViewWillEnter {
  readonly COLORS = COLORS;

  newPayment: {
    fromUserId: string;
    toUserId: string;
    amount: string;
    description: string;
  } = {
    fromUserId: '',
    toUserId: '',
    amount: '',
    description: '',
  };

  addingPayment = signal(false);
  deletingPaymentId = signal<string | null>(null);

  private readonly auth = inject(AuthService);

  constructor(
    public gallines: GallinesService,
    private movementDetail: MovementDetailService
  ) {
    addIcons({ addOutline, trashOutline });

    effect(() => {
      const currentUser = this.auth.user$();
      const users = this.gallines.users$();

      if (currentUser && users.length > 0 && !this.newPayment.fromUserId) {
        const exists = users.find((u: User) => u.id === currentUser.id);
        if (exists) this.newPayment.fromUserId = currentUser.id;
      }
    });
  }

  ngOnInit(): void {
    const currentUser = this.auth.user$();
    if (currentUser) {
      this.newPayment.fromUserId = currentUser.id;
    }
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('ingresos');
  }

  readonly sortedPayments = computed(() =>
    [...this.gallines.payments$()]
      .filter((p) => p.isSettlement !== false)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  );

  getPersonName(p: PaymentDto): string {
    return p.fromName;
  }

  async onSubmit(): Promise<void> {
    const amount = parseFloat(this.newPayment.amount);
    if (
      isNaN(amount) ||
      amount <= 0 ||
      !this.newPayment.fromUserId ||
      !this.newPayment.toUserId
    ) {
      return;
    }

    this.addingPayment.set(true);
    try {
      if (
        await this.gallines.addPayment({
          fromUserId: this.newPayment.fromUserId,
          toUserId: this.newPayment.toUserId,
          amount,
          description: this.newPayment.description || undefined,
          isSettlement: true,
        })
      ) {
        this.newPayment.amount = '';
        this.newPayment.description = '';
        this.newPayment.toUserId = '';
        const currentUser = this.auth.user$();
        if (currentUser) this.newPayment.fromUserId = currentUser.id;
      }
    } finally {
      this.addingPayment.set(false);
    }
  }

  openPaymentDetail(p: PaymentDto): void {
    void this.movementDetail.openPayment(p);
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
