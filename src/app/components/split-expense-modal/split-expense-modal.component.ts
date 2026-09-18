import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonContent,
  IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkOutline } from 'ionicons/icons';
import { COLORS } from '../../models';
import { SelectOnFocusDirective } from '../../directives/select-on-focus.directive';

export type SplitMode = 'equal' | 'shares' | 'percentages' | 'amounts';

export interface Member {
  id: string;
  name: string;
}

export interface PayerEntry {
  memberId: string;
  amount: number;
}

export interface BeneficiaryEntry {
  memberId: string;
  owes: number;
}

export interface SplitResult {
  payers: PayerEntry[];
  beneficiaries: BeneficiaryEntry[];
  mode: SplitMode;
  totalAmount: number;
  description?: string;
}

interface PayerRow {
  member: Member;
  amount: number;
}

interface BeneficiaryRow {
  member: Member;
  owes: number;
  shares: number;
  percentage: number;
  active: boolean;
}

@Component({
  selector: 'app-split-expense-modal',
  templateUrl: './split-expense-modal.component.html',
  styleUrls: ['./split-expense-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    IonHeader,
    IonContent,
    IonIcon,
    SelectOnFocusDirective,
  ],
})
export class SplitExpenseModalComponent implements OnInit {
  @Input() participants: Member[] = [];
  @Input() initialAmount = 0;
  @Input() initialPayerId = '';

  readonly COLORS = COLORS;
  readonly splitModes: { value: SplitMode; label: string }[] = [
    { value: 'equal', label: 'Igual' },
    { value: 'shares', label: 'Parts' },
    { value: 'percentages', label: '%' },
    { value: 'amounts', label: 'Import' },
  ];
  splitMode: SplitMode = 'equal';
  payers: PayerRow[] = [];
  beneficiaries: BeneficiaryRow[] = [];
  totalAmount = 0;
  description = '';
  private payersManuallyEdited = false;
  private amountLockedIds = new Set<string>();

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline, checkmarkOutline });
  }

  ngOnInit(): void {
    this.totalAmount = this.initialAmount;
    this.initializeRows();
    this.applyDefaultPayer();
  }

  private initializeRows(): void {
    this.payers = this.participants.map((p) => ({
      member: p,
      amount: 0,
    }));
    this.beneficiaries = this.participants.map((p) => ({
      member: p,
      owes: 0,
      shares: 1,
      percentage: 0,
      active: true,
    }));
    this.recalculateBeneficiaries();
  }

  onTotalAmountChange(): void {
    if (!this.payersManuallyEdited) {
      this.applyDefaultPayer();
    } else {
      this.recalculateBeneficiaries();
    }
  }

  onPayerAmountChange(): void {
    this.payersManuallyEdited = true;
    this.totalAmount = this.totalPaid;
    this.recalculateBeneficiaries();
  }

  private applyDefaultPayer(): void {
    if (!this.initialPayerId) return;

    for (const row of this.payers) {
      row.amount = 0;
    }
    const payer = this.payers.find((p) => p.member.id === this.initialPayerId);
    if (payer && this.totalAmount > 0) {
      payer.amount = this.totalAmount;
    }
    this.recalculateBeneficiaries();
  }

  setSplitMode(mode: SplitMode): void {
    if (this.splitMode === mode) return;
    this.splitMode = mode;
    this.onModeChange();
  }

  onModeChange(): void {
    this.amountLockedIds.clear();

    for (const row of this.beneficiaries) {
      if (!row.active) {
        row.owes = 0;
        continue;
      }
      row.percentage = 0;
      row.owes = 0;
      if (this.splitMode !== 'shares') {
        row.shares = 1;
      }
    }

    if (this.splitMode === 'percentages') {
      this.redistributePercentages();
    } else {
      this.recalculateBeneficiaries();
    }
  }

  toggleBeneficiary(row: BeneficiaryRow): void {
    row.active = !row.active;
    if (!row.active) {
      row.owes = 0;
      row.shares = 0;
      row.percentage = 0;
      this.amountLockedIds.delete(row.member.id);
    } else {
      row.shares = 1;
      if (this.splitMode === 'percentages') {
        this.redistributePercentages();
        return;
      }
    }

    if (this.splitMode === 'amounts') {
      this.redistributeAmounts();
    } else {
      this.recalculateBeneficiaries();
    }
  }

  onSharesChange(): void {
    this.recalculateBeneficiaries();
  }

  onPercentagesChange(): void {
    this.recalculateBeneficiaries();
  }

  onBeneficiaryAmountChange(row: BeneficiaryRow): void {
    if (!row.active || this.splitMode !== 'amounts') return;
    this.amountLockedIds.add(row.member.id);
    this.redistributeAmounts();
  }

  private getActiveBeneficiaries(): BeneficiaryRow[] {
    return this.beneficiaries.filter((b) => b.active);
  }

  private redistributePercentages(): void {
    const active = this.getActiveBeneficiaries();
    if (active.length === 0) return;

    const equalPct = 100 / active.length;
    for (const row of this.beneficiaries) {
      row.percentage = row.active ? equalPct : 0;
    }
    this.recalculateBeneficiaries();
  }

  recalculateBeneficiaries(): void {
    const active = this.getActiveBeneficiaries();

    if (active.length === 0) {
      this.beneficiaries.forEach((b) => (b.owes = 0));
      return;
    }

    switch (this.splitMode) {
      case 'equal': {
        const equalAmount = this.totalAmount / active.length;
        this.beneficiaries.forEach((b) => {
          b.owes = b.active ? equalAmount : 0;
        });
        break;
      }

      case 'shares': {
        const totalShares = active.reduce((sum, b) => sum + b.shares, 0);
        this.beneficiaries.forEach((b) => {
          if (!b.active) {
            b.owes = 0;
            return;
          }
          b.owes =
            totalShares > 0
              ? (this.totalAmount * b.shares) / totalShares
              : 0;
        });
        break;
      }

      case 'percentages': {
        this.beneficiaries.forEach((b) => {
          b.owes = b.active
            ? (this.totalAmount * b.percentage) / 100
            : 0;
        });
        break;
      }

      case 'amounts':
        this.redistributeAmounts();
        break;
    }
  }

  private redistributeAmounts(): void {
    const active = this.getActiveBeneficiaries();

    this.beneficiaries
      .filter((b) => !b.active)
      .forEach((b) => (b.owes = 0));

    if (active.length === 0) {
      return;
    }

    for (const id of [...this.amountLockedIds]) {
      if (!active.some((b) => b.member.id === id)) {
        this.amountLockedIds.delete(id);
      }
    }

    if (this.amountLockedIds.size === 0) {
      this.assignEqualAmounts(active, this.totalAmount);
      return;
    }

    const locked = active.filter((b) => this.amountLockedIds.has(b.member.id));
    const unlocked = active.filter((b) => !this.amountLockedIds.has(b.member.id));
    const lockedSum = locked.reduce((sum, b) => sum + (b.owes ?? 0), 0);
    const remaining = Math.max(0, this.totalAmount - lockedSum);

    if (unlocked.length === 0) {
      return;
    }

    this.assignEqualAmounts(unlocked, remaining);
  }

  private assignEqualAmounts(rows: BeneficiaryRow[], total: number): void {
    if (rows.length === 0) return;

    if (rows.length === 1) {
      rows[0].owes = Math.round(total * 100) / 100;
      return;
    }

    const perPerson = total / rows.length;
    let assigned = 0;

    for (let i = 0; i < rows.length - 1; i++) {
      rows[i].owes = Math.round(perPerson * 100) / 100;
      assigned += rows[i].owes;
    }

    rows[rows.length - 1].owes = Math.round((total - assigned) * 100) / 100;
  }

  get totalPaid(): number {
    return this.payers.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get totalAssigned(): number {
    return this.beneficiaries.reduce((sum, b) => sum + (b.owes ?? 0), 0);
  }

  get totalShares(): number {
    return this.getActiveBeneficiaries().reduce((sum, b) => sum + b.shares, 0);
  }

  get totalPercentage(): number {
    return this.getActiveBeneficiaries().reduce(
      (sum, b) => sum + b.percentage,
      0
    );
  }

  get isValid(): boolean {
    if (this.totalAmount <= 0) return false;
    if (!this.payers.some((p) => (p.amount ?? 0) > 0)) return false;
    if (!this.beneficiaries.some((b) => b.active && b.owes > 0)) return false;
    if (!this.isPaidValid() || !this.isAssignedValid()) return false;
    if (this.splitMode === 'percentages' && !this.isPercentageValid()) {
      return false;
    }
    return true;
  }

  get validationMessage(): string {
    if (this.totalAmount <= 0) return 'Introdueix un import vàlid.';
    if (!this.payers.some((p) => (p.amount ?? 0) > 0)) {
      return 'Indica qui ha pagat.';
    }
    if (!this.beneficiaries.some((b) => b.active && b.owes > 0)) {
      return 'Selecciona almenys una persona a «Per qui és».';
    }
    if (!this.isPaidValid()) {
      return 'El total pagat ha de coincidir amb l\'import.';
    }
    if (!this.isAssignedValid()) {
      return 'El total assignat ha de coincidir amb l\'import.';
    }
    if (this.splitMode === 'percentages' && !this.isPercentageValid()) {
      return 'Els percentatges han de sumar 100%.';
    }
    return '';
  }

  isPercentageValid(): boolean {
    return Math.abs(this.totalPercentage - 100) < 0.1;
  }

  isPaidValid(): boolean {
    return Math.abs(this.totalPaid - this.totalAmount) < 0.02;
  }

  isAssignedValid(): boolean {
    return Math.abs(this.totalAssigned - this.totalAmount) < 0.02;
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm(): void {
    if (!this.isValid) return;

    const result: SplitResult = {
      payers: this.payers
        .filter((p) => (p.amount ?? 0) > 0.01)
        .map((p) => ({ memberId: p.member.id, amount: p.amount })),
      beneficiaries: this.beneficiaries
        .filter((b) => b.active && b.owes > 0.01)
        .map((b) => ({ memberId: b.member.id, owes: b.owes })),
      mode: this.splitMode,
      totalAmount: this.totalAmount,
      description: this.description.trim() || undefined,
    };

    this.modalCtrl.dismiss(result, 'confirm');
  }
}
