import { Injectable, inject, signal, computed } from '@angular/core';
import { lastValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ApiService,
  User,
  TransactionDto,
  BalanceResponse,
  SettlementRow,
  TransferDto,
  OrderDto,
  CreateOrderDto,
  UpdateOrderDto,
  SubscriptionDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  PaymentDto,
  CreatePaymentDto,
} from './api.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GallinesService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly _users = signal<User[]>([]);
  private readonly _transactions = signal<TransactionDto[]>([]);
  private readonly _balance = signal<BalanceResponse | null>(null);
  private readonly _orders = signal<OrderDto[]>([]);
  private readonly _subscriptions = signal<SubscriptionDto[]>([]);
  private readonly _payments = signal<PaymentDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly users$ = this._users.asReadonly();
  readonly transactions$ = this._transactions.asReadonly();
  readonly orders$ = this._orders.asReadonly();
  readonly subscriptions$ = this._subscriptions.asReadonly();
  readonly payments$ = this._payments.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly totalExpenses = computed(
    () => this._balance()?.totalExpenses ?? 0
  );
  readonly totalIncome = computed(() => this._balance()?.totalIncome ?? 0);
  readonly globalBalance = computed(
    () => this._balance()?.globalBalance ?? 0
  );
  readonly fairShare = computed(() => this._balance()?.fairShare ?? 0);
  readonly settlement = computed(
    (): SettlementRow[] => this._balance()?.settlement ?? []
  );
  readonly transfers = computed(
    (): TransferDto[] => this._balance()?.transfers ?? []
  );

  private wrap<T>(obs$: any) {
    return lastValueFrom(obs$.pipe(
      map((v: T) => ({ status: 'fulfilled' as const, value: v })),
      catchError((e: any) => of({ status: 'rejected' as const, reason: e }))
    ));
  }

  async load(refreshUsers = false): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [transactionsRes, balanceRes, ordersRes, paymentsRes] = (await Promise.all([
        this.wrap<TransactionDto[]>(this.api.getTransactions()),
        this.wrap<BalanceResponse>(this.api.getBalance()),
        this.wrap<OrderDto[]>(this.api.getOrders()),
        this.wrap<PaymentDto[]>(this.api.getPayments()),
      ])) as any[];

      if (transactionsRes.status === 'fulfilled') this._transactions.set(transactionsRes.value ?? []);
      if (balanceRes.status === 'fulfilled') this._balance.set(balanceRes.value ?? null);
      if (ordersRes.status === 'fulfilled') this._orders.set(ordersRes.value ?? []);
      if (paymentsRes.status === 'fulfilled') this._payments.set(paymentsRes.value ?? []);

      if (refreshUsers || this._users().length === 0) {
        try {
          const users = await lastValueFrom(this.api.getUsers());
          if (users) this._users.set(users);
        } catch (uErr) {
          console.error('GallinesService: Error carregant usuaris (404?):', uErr);
        }
      }
    } catch (e) {
      console.error('GallinesService: Error crític carregant dades:', e);
      this._error.set((e as Error).message ?? 'Error carregant dades');
    } finally {
      this._loading.set(false);
    }
  }

  /** Carrega només les dades necessàries per al tab indicat */
  async loadForTab(tab: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      switch (tab) {
        case 'dashboard':
          await this.loadBalanceAndTransactions();
          break;
        case 'comandes':
          await this.loadOrders();
          break;
        case 'subscripcions':
          await this.loadSubscriptions();
          break;
        case 'transactions':
          await this.loadTransactions();
          await this.loadPayments();
          if (this._users().length === 0) await this.loadUsers();
          break;
        case 'ingresos':
          await this.loadIngresos();
          break;
        case 'members':
          await this.load(true);
          break;
      }
    } finally {
      this._loading.set(false);
    }
  }

  /** Carrega només el balance (per al header) */
  async loadBalance(): Promise<void> {
    const res = (await this.wrap<BalanceResponse>(this.api.getBalance())) as any;
    if (res.status === 'fulfilled') this._balance.set(res.value ?? null);
  }

  private async loadBalanceAndTransactions(): Promise<void> {
    const [balanceRes, transactionsRes, paymentsRes] = (await Promise.all([
      this.wrap<BalanceResponse>(this.api.getBalance()),
      this.wrap<TransactionDto[]>(this.api.getTransactions()),
      this.wrap<PaymentDto[]>(this.api.getPayments()),
    ])) as any[];
    if (balanceRes.status === 'fulfilled') this._balance.set(balanceRes.value ?? null);
    if (transactionsRes.status === 'fulfilled') this._transactions.set(transactionsRes.value ?? []);
    if (paymentsRes.status === 'fulfilled') this._payments.set(paymentsRes.value ?? []);
    if (this._users().length === 0) await this.loadUsers();
  }

  private async loadOrders(): Promise<void> {
    const res = (await this.wrap<OrderDto[]>(this.api.getOrders())) as any;
    if (res.status === 'fulfilled') this._orders.set(res.value ?? []);
  }

  private async loadSubscriptions(): Promise<void> {
    const res = (await this.wrap<SubscriptionDto[]>(this.api.getSubscriptions())) as any;
    if (res.status === 'fulfilled') this._subscriptions.set(res.value ?? []);
  }

  private async loadUsers(): Promise<void> {
    try {
      const users = await lastValueFrom(this.api.getUsers());
      if (users) this._users.set(users);
    } catch (e) {
      console.error('GallinesService: Error carregant usuaris:', e);
    }
  }

  private async loadTransactions(): Promise<void> {
    const res = (await this.wrap<TransactionDto[]>(this.api.getTransactions())) as any;
    if (res.status === 'fulfilled') this._transactions.set(res.value ?? []);
  }

  private async loadPayments(): Promise<void> {
    const res = (await this.wrap<PaymentDto[]>(this.api.getPayments())) as any;
    if (res.status === 'fulfilled') this._payments.set(res.value ?? []);
  }

  private async loadIngresos(): Promise<void> {
    await this.loadPayments();
    if (this._users().length === 0) await this.loadUsers();
  }

  addTransaction(dto: {
    type: 'expense' | 'income';
    userId?: string;
    clientName?: string;
    amount: number;
    description?: string;
    splitGroupId?: string;
  }): Promise<boolean> {
    if (!dto.amount) return Promise.resolve(false);

    return lastValueFrom(
      this.api.addTransaction({
        userId: dto.userId,
        clientName: dto.clientName,
        type: dto.type,
        amount: dto.amount,
        description: dto.description ?? (dto.type === 'expense' ? 'Despesa' : 'Venda ous'),
        date: new Date().toISOString().split('T')[0],
        splitGroupId: dto.splitGroupId,
      })
    )
      .then(() => {
        void this.load(false);
        return true;
      })
      .catch(() => false);
  }

  deleteTransaction(transactionId: string): Promise<void> {
    return lastValueFrom(this.api.deleteTransaction(transactionId))
      .then(() => void this.load(false));
  }

  addPayment(dto: CreatePaymentDto): Promise<boolean> {
    if (!dto.amount || !dto.fromUserId || !dto.toUserId) return Promise.resolve(false);

    return lastValueFrom(
      this.api.addPayment({
        ...dto,
        date: dto.date ?? new Date().toISOString().split('T')[0],
      })
    )
      .then(() => {
        void this.load(false);
        return true;
      })
      .catch(() => false);
  }

  deletePayment(paymentGroupId: string): Promise<void> {
    return lastValueFrom(this.api.deletePayment(paymentGroupId))
      .then(() => void this.load(false));
  }

  getMemberName(id: string): string {
    const user = this._users().find((u: User) => u.id === id);
    if (user) return user.displayName || user.email;

    const authUser = this.auth.user$();
    if (authUser?.id === id) {
      return authUser.displayName || authUser.email;
    }

    return id;
  }

  createOrder(dto: CreateOrderDto): Promise<boolean> {
    if (!dto.clientName?.trim() || !dto.mitgesDotzenes) return Promise.resolve(false);

    return lastValueFrom(this.api.createOrder(dto))
      .then(() => {
        void this.load(false);
        return true;
      })
      .catch(() => false);
  }

  updateOrder(orderId: string, dto: UpdateOrderDto): Promise<boolean> {
    return lastValueFrom(this.api.updateOrder(orderId, dto))
      .then(() => {
        void this.load(false);
        return true;
      })
      .catch(() => false);
  }

  deleteOrder(orderId: string): Promise<void> {
    return lastValueFrom(this.api.deleteOrder(orderId))
      .then(() => void this.load(false));
  }

  createSubscription(dto: CreateSubscriptionDto): Promise<boolean> {
    if (!dto.clientName?.trim() || !dto.mitgesDotzenes) return Promise.resolve(false);
    return lastValueFrom(this.api.createSubscription(dto))
      .then(() => {
        void this.loadSubscriptions();
        void this.loadOrders();
        return true;
      })
      .catch(() => false);
  }

  updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<boolean> {
    return lastValueFrom(this.api.updateSubscription(id, dto))
      .then(() => {
        void this.loadSubscriptions();
        return true;
      })
      .catch(() => false);
  }

  deleteSubscription(id: string): Promise<void> {
    return lastValueFrom(this.api.deleteSubscription(id))
      .then(() => void this.loadSubscriptions());
  }

  generateWeeklyOrders(): Promise<OrderDto[] | null> {
    return lastValueFrom(this.api.generateWeeklyOrders())
      .then((orders) => {
        void this.loadOrders();
        void this.loadSubscriptions();
        return orders;
      })
      .catch(() => null);
  }

  chargeMonth(subscriptionId: string, year?: number, month?: number): Promise<{ orders: OrderDto[]; amount: number } | null> {
    return lastValueFrom(this.api.chargeMonth(subscriptionId, year, month))
      .then((res) => {
        void this.load(false);
        return res;
      })
      .catch(() => null);
  }
}
