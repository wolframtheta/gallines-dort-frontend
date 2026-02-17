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
} from './api.service';

@Injectable({ providedIn: 'root' })
export class GallinesService {
  private readonly api = inject(ApiService);

  private readonly _users = signal<User[]>([]);
  private readonly _transactions = signal<TransactionDto[]>([]);
  private readonly _balance = signal<BalanceResponse | null>(null);
  private readonly _orders = signal<OrderDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly users$ = this._users.asReadonly();
  readonly transactions$ = this._transactions.asReadonly();
  readonly orders$ = this._orders.asReadonly();
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
      const [transactionsRes, balanceRes, ordersRes] = (await Promise.all([
        this.wrap<TransactionDto[]>(this.api.getTransactions()),
        this.wrap<BalanceResponse>(this.api.getBalance()),
        this.wrap<OrderDto[]>(this.api.getOrders()),
      ])) as any[];

      if (transactionsRes.status === 'fulfilled') this._transactions.set(transactionsRes.value ?? []);
      if (balanceRes.status === 'fulfilled') this._balance.set(balanceRes.value ?? null);
      if (ordersRes.status === 'fulfilled') this._orders.set(ordersRes.value ?? []);

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
        case 'balance':
          await this.loadBalanceAndTransactions();
          break;
        case 'comandes':
          await this.loadOrders();
          break;
        case 'transactions':
          if (this._users().length === 0) await this.loadUsers();
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
    const [balanceRes, transactionsRes] = (await Promise.all([
      this.wrap<BalanceResponse>(this.api.getBalance()),
      this.wrap<TransactionDto[]>(this.api.getTransactions()),
    ])) as any[];
    if (balanceRes.status === 'fulfilled') this._balance.set(balanceRes.value ?? null);
    if (transactionsRes.status === 'fulfilled') this._transactions.set(transactionsRes.value ?? []);
  }

  private async loadOrders(): Promise<void> {
    const res = (await this.wrap<OrderDto[]>(this.api.getOrders())) as any;
    if (res.status === 'fulfilled') this._orders.set(res.value ?? []);
  }

  private async loadUsers(): Promise<void> {
    try {
      const users = await lastValueFrom(this.api.getUsers());
      if (users) this._users.set(users);
    } catch (e) {
      console.error('GallinesService: Error carregant usuaris:', e);
    }
  }

  addTransaction(dto: {
    type: 'expense' | 'income';
    userId?: string;
    clientName?: string;
    amount: number;
    description?: string;
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

  getMemberName(id: string): string {
    const user = this._users().find((u: User) => u.id === id);
    if (user) return user.displayName || user.email;
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
}
