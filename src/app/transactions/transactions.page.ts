import { Component, OnInit, inject, effect, signal, computed } from '@angular/core';
import { IonContent, IonIcon, IonItem, IonSelect, IonSelectOption, IonItemSliding, IonItemOptions, IonItemOption, IonSkeletonText, IonSpinner, ModalController, ViewWillEnter } from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { addOutline, peopleOutline, personOutline, trashOutline } from 'ionicons/icons';
import { GallinesService } from '../services/gallines.service';
import { AuthService } from '../services/auth.service';
import { User, TransactionDto } from '../services/api.service';
import { COLORS } from '../models';
import { SplitExpenseModalComponent, type SplitResult } from '../components/split-expense-modal/split-expense-modal.component';
import { MovementDetailService } from '../services/movement-detail.service';
import { SelectOnFocusDirective } from '../directives/select-on-focus.directive';

@Component({
  selector: 'app-transactions',
  templateUrl: 'transactions.page.html',
  styleUrls: ['transactions.page.scss'],
  imports: [HeaderComponent, IonContent, IonIcon, IonItem, IonSelect, IonSelectOption, IonItemSliding, IonItemOptions, IonItemOption, IonSkeletonText, IonSpinner, FormsModule, SelectOnFocusDirective],
})
export class TransactionsPage implements OnInit, ViewWillEnter {
  readonly COLORS = COLORS;
  newTransaction: {
    userId: string;
    amount: string;
    description: string;
  } = {
      userId: '',
      amount: '',
      description: '',
    };

  addingTransaction = signal(false);
  deletingTransactionId = signal<string | null>(null);
  processingSplit = signal(false);

  private readonly auth = inject(AuthService);

  constructor(
    public gallines: GallinesService,
    private modalCtrl: ModalController,
    private movementDetail: MovementDetailService
  ) {
    addIcons({ addOutline, peopleOutline, personOutline, trashOutline });

    // Assegurar que el userId per defecte és el de l'usuari loguejat quan es carreguen les dades
    effect(() => {
      const currentUser = this.auth.user$();
      const users = this.gallines.users$();

      if (currentUser && users.length > 0) {
        this.applyDefaultUser();
      }
    });
  }

  ngOnInit(): void {
    this.applyDefaultUser();
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('transactions');
    this.applyDefaultUser();
  }

  private applyDefaultUser(): void {
    const currentUser = this.auth.user$();
    if (!currentUser) return;

    const users = this.gallines.users$();
    if (users.length > 0) {
      const exists = users.find((u: User) => u.id === currentUser.id);
      this.newTransaction.userId = exists ? currentUser.id : users[0].id;
    } else {
      this.newTransaction.userId = currentUser.id;
    }
  }

  readonly sortedTransactions = computed(() =>
    [...this.gallines.transactions$()]
      .filter((t) => t.type === 'expense' && !t.paymentGroupId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  );

  getPersonName(t: TransactionDto): string {
    if (t.user) return t.user.displayName || t.user.email;
    if (t.userId) return this.gallines.getMemberName(t.userId);
    if (t.clientName) return t.clientName;
    return 'Desconegut';
  }

  openTransactionDetail(t: TransactionDto): void {
    void this.movementDetail.openTransaction(t);
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

  async openSplitExpenseModal(): Promise<void> {
    const initialAmount = parseFloat(this.newTransaction.amount) || 0;
    const currentUser = this.auth.user$();

    const modal = await this.modalCtrl.create({
      component: SplitExpenseModalComponent,
      componentProps: {
        participants: this.gallines.users$().map((u: User) => ({
          id: u.id,
          name: u.displayName || u.email,
        })),
        initialAmount,
        initialPayerId: currentUser?.id ?? this.newTransaction.userId,
      },
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92,
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<SplitResult>();

    if (role === 'confirm' && data) {
      await this.processSplitExpense(data);
    }
  }

  async processSplitExpense(splitResult: SplitResult): Promise<void> {
    this.processingSplit.set(true);
    try {
      let success = true;
      const description =
        splitResult.description || 'Despesa compartida';
      const splitGroupId = crypto.randomUUID();

      const totalPaid = splitResult.payers.reduce((sum, p) => sum + p.amount, 0);
      const primaryPayer = [...splitResult.payers].sort(
        (a, b) => b.amount - a.amount
      )[0];

      if (primaryPayer && totalPaid > 0) {
        const created = await this.gallines.addTransaction({
          type: 'expense',
          userId: primaryPayer.memberId,
          amount: totalPaid,
          description,
          splitGroupId,
        });
        if (!created) success = false;
      }

      const balances = new Map<string, number>();

      for (const payer of splitResult.payers) {
        balances.set(
          payer.memberId,
          (balances.get(payer.memberId) ?? 0) + payer.amount
        );
      }

      for (const beneficiary of splitResult.beneficiaries) {
        balances.set(
          beneficiary.memberId,
          (balances.get(beneficiary.memberId) ?? 0) - beneficiary.owes
        );
      }

      const creditors: { memberId: string; amount: number }[] = [];
      const debtors: { memberId: string; amount: number }[] = [];

      for (const [memberId, net] of balances) {
        if (net > 0.01) creditors.push({ memberId, amount: net });
        else if (net < -0.01) debtors.push({ memberId, amount: -net });
      }

      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      let ci = 0;
      let di = 0;

      while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const amount = Math.min(creditor.amount, debtor.amount);

        if (amount > 0.01) {
          const paid = await this.gallines.addPayment({
            fromUserId: debtor.memberId,
            toUserId: creditor.memberId,
            amount: Math.round(amount * 100) / 100,
            description,
            isSettlement: false,
            splitGroupId,
          });
          if (!paid) success = false;

          creditor.amount -= amount;
          debtor.amount -= amount;
        }

        if (creditor.amount < 0.01) ci++;
        if (debtor.amount < 0.01) di++;
      }

      if (success) {
        this.newTransaction.amount = '';
        this.newTransaction.description = '';
        this.applyDefaultUser();
      }
    } finally {
      this.processingSplit.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    const amount = parseFloat(this.newTransaction.amount);
    if (isNaN(amount) || !this.newTransaction.userId) return;

    this.addingTransaction.set(true);
    try {
      if (
        await this.gallines.addTransaction({
          type: 'expense',
          userId: this.newTransaction.userId,
          amount,
          description: this.newTransaction.description || undefined,
        })
      ) {
        this.newTransaction.amount = '';
        this.newTransaction.description = '';
        this.applyDefaultUser();
      }
    } finally {
      this.addingTransaction.set(false);
    }
  }
}
