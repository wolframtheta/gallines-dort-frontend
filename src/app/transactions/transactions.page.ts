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

@Component({
  selector: 'app-transactions',
  templateUrl: 'transactions.page.html',
  styleUrls: ['transactions.page.scss'],
  imports: [HeaderComponent, IonContent, IonIcon, IonItem, IonSelect, IonSelectOption, IonItemSliding, IonItemOptions, IonItemOption, IonSkeletonText, IonSpinner, FormsModule],
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
    private modalCtrl: ModalController
  ) {
    addIcons({ addOutline, peopleOutline, personOutline, trashOutline });

    // Assegurar que el userId per defecte és el de l'usuari loguejat quan es carreguen les dades
    effect(() => {
      const currentUser = this.auth.user$();
      const users = this.gallines.users$();

      if (currentUser && users.length > 0 && !this.newTransaction.userId) {
        // Verifiquem que l'usuari loguejat realment existeix a la llista (per seguretat)
        const exists = users.find((u: User) => u.id === currentUser.id);
        if (exists) {
          this.newTransaction.userId = currentUser.id;
        } else if (!this.newTransaction.userId && users.length > 0) {
          this.newTransaction.userId = users[0].id;
        }
      }
    });
  }

  ngOnInit(): void {
    const currentUser = this.auth.user$();
    if (currentUser) {
      this.newTransaction.userId = currentUser.id;
    }
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('transactions');
  }

  readonly sortedTransactions = computed(() =>
    [...this.gallines.transactions$()]
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

    const modal = await this.modalCtrl.create({
      component: SplitExpenseModalComponent,
      componentProps: {
        participants: this.gallines.users$().map((u: User) => ({ id: u.id, name: u.displayName || u.email })),
        initialAmount,
      },
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
      for (const split of splitResult.splits) {
        const netAmount = split.owes - split.paid;
        if (Math.abs(netAmount) > 0.01) {
          const result = await this.gallines.addTransaction({
            type: 'expense',
            userId: split.member.id,
            amount: netAmount,
            description: splitResult.description || 'Despesa compartida',
          });
          if (!result) success = false;
        }
      }
      if (success) {
        this.newTransaction.amount = '';
        this.newTransaction.description = '';
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
      }
    } finally {
      this.addingTransaction.set(false);
    }
  }
}
