import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkOutline } from 'ionicons/icons';
import { COLORS } from '../../models';

export type SplitMode = 'equal' | 'shares' | 'amounts' | 'percentages';

export interface Member {
  id: string;
  name: string;
}

export interface MemberSplit {
  member: Member;
  paid: number;
  owes: number;
  shares?: number;
  percentage?: number;
}

export interface SplitResult {
  splits: MemberSplit[];
  mode: SplitMode;
  totalAmount: number;
  description?: string;
}

@Component({
  selector: 'app-split-expense-modal',
  templateUrl: './split-expense-modal.component.html',
  styleUrls: ['./split-expense-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
})
export class SplitExpenseModalComponent implements OnInit {
  @Input() participants: Member[] = [];
  @Input() initialAmount = 0;

  readonly COLORS = COLORS;
  splitMode: SplitMode = 'equal';
  splits: MemberSplit[] = [];
  totalAmount = 0;
  description = '';

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline, checkmarkOutline });
  }

  ngOnInit(): void {
    this.totalAmount = this.initialAmount;
    this.initializeSplits();
  }

  onTotalAmountChange(): void {
    this.recalculate();
  }

  initializeSplits(): void {
    this.splits = this.participants.map((p) => ({
      member: p,
      paid: 0,
      owes: 0,
      shares: 1,
      percentage: 0,
    }));
    this.recalculate();
  }

  onModeChange(): void {
    this.recalculate();
  }

  toggleMember(split: MemberSplit): void {
    if (split.owes > 0) {
      split.owes = 0;
      split.shares = 0;
      split.percentage = 0;
    } else {
      split.shares = 1;
      this.recalculate();
    }
  }

  onSharesChange(): void {
    this.recalculate();
  }

  onAmountsChange(): void {
    // No recalcular automàticament en mode amounts
  }

  onPercentagesChange(): void {
    this.recalculate();
  }

  onPaidChange(): void {
    // No cal recalcular
  }

  recalculate(): void {
    const activeSplits = this.splits.filter((s) => {
      if (this.splitMode === 'equal' || this.splitMode === 'shares') {
        return (s.shares ?? 0) > 0;
      }
      if (this.splitMode === 'percentages') {
        return (s.percentage ?? 0) > 0;
      }
      return s.owes > 0;
    });

    if (activeSplits.length === 0) return;

    switch (this.splitMode) {
      case 'equal':
        const equalAmount = this.totalAmount / activeSplits.length;
        activeSplits.forEach((s) => (s.owes = equalAmount));
        this.splits.filter((s) => !activeSplits.includes(s)).forEach((s) => (s.owes = 0));
        break;

      case 'shares':
        const totalShares = activeSplits.reduce((sum, s) => sum + (s.shares ?? 0), 0);
        if (totalShares > 0) {
          activeSplits.forEach((s) => {
            s.owes = (this.totalAmount * (s.shares ?? 0)) / totalShares;
          });
        }
        this.splits.filter((s) => !activeSplits.includes(s)).forEach((s) => (s.owes = 0));
        break;

      case 'percentages':
        activeSplits.forEach((s) => {
          s.owes = (this.totalAmount * (s.percentage ?? 0)) / 100;
        });
        this.splits.filter((s) => !activeSplits.includes(s)).forEach((s) => (s.owes = 0));
        break;

      case 'amounts':
        // Els amounts es gestionen manualment
        break;
    }
  }

  get totalPaid(): number {
    return this.splits.reduce((sum, s) => sum + (s.paid ?? 0), 0);
  }

  get totalOwed(): number {
    return this.splits.reduce((sum, s) => sum + (s.owes ?? 0), 0);
  }

  get totalShares(): number {
    return this.splits.reduce((sum, s) => sum + (s.shares ?? 0), 0);
  }

  get totalPercentage(): number {
    return this.splits.reduce((sum, s) => sum + (s.percentage ?? 0), 0);
  }

  get isValid(): boolean {
    if (this.totalAmount <= 0) return false;
    const hasMembers = this.splits.some((s) => s.owes > 0);
    const paidMatchesTotal = Math.abs(this.totalPaid - this.totalAmount) < 0.02;
    const owedMatchesTotal = Math.abs(this.totalOwed - this.totalAmount) < 0.02;

    return hasMembers && paidMatchesTotal && owedMatchesTotal;
  }

  isPercentageValid(): boolean {
    return Math.abs(this.totalPercentage - 100) < 0.1;
  }

  isPaidValid(): boolean {
    return Math.abs(this.totalPaid - this.totalAmount) < 0.02;
  }

  isOwedValid(): boolean {
    return Math.abs(this.totalOwed - this.totalAmount) < 0.02;
  }

  get Math(): typeof Math {
    return Math;
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm(): void {
    if (!this.isValid) return;

    const result: SplitResult = {
      splits: this.splits.filter((s) => s.owes > 0),
      mode: this.splitMode,
      totalAmount: this.totalAmount,
      description: this.description || undefined,
    };

    this.modalCtrl.dismiss(result, 'confirm');
  }
}
