import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Auth
  register(email: string, password: string, displayName?: string) {
    return this.http.post<AuthResponse>(`${API}/auth/register`, {
      email,
      password,
      displayName,
    });
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { email, password });
  }

  refresh(refreshToken: string) {
    return this.http.post<AuthResponse>(`${API}/auth/refresh`, { refreshToken });
  }

  logout(refreshToken?: string) {
    return this.http.post(`${API}/auth/logout`, { refreshToken });
  }

  // Users
  getUsers() {
    return this.http.get<User[]>(`${API}/users`);
  }

  // Transactions
  getTransactions() {
    return this.http.get<TransactionDto[]>(`${API}/transactions`);
  }

  addTransaction(dto: {
    type: 'expense' | 'income';
    amount: number;
    description: string;
    date: string;
    userId?: string;
    clientName?: string;
    orderId?: string;
  }) {
    return this.http.post<TransactionDto>(`${API}/transactions`, dto);
  }

  deleteTransaction(transactionId: string) {
    return this.http.delete(
      `${API}/transactions/${transactionId}`
    );
  }

  // Balance
  getBalance() {
    return this.http.get<BalanceResponse>(`${API}/balance`);
  }

  // Orders (Comandes)
  getOrders() {
    return this.http.get<OrderDto[]>(`${API}/orders`);
  }

  createOrder(dto: CreateOrderDto) {
    return this.http.post<OrderDto>(`${API}/orders`, dto);
  }

  updateOrder(orderId: string, dto: UpdateOrderDto) {
    return this.http.patch<OrderDto>(
      `${API}/orders/${orderId}`,
      dto
    );
  }

  deleteOrder(orderId: string) {
    return this.http.delete(`${API}/orders/${orderId}`);
  }

  // Subscriptions
  getSubscriptions() {
    return this.http.get<SubscriptionDto[]>(`${API}/subscriptions`);
  }

  createSubscription(dto: CreateSubscriptionDto) {
    return this.http.post<SubscriptionDto>(`${API}/subscriptions`, dto);
  }

  updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    return this.http.patch<SubscriptionDto>(`${API}/subscriptions/${id}`, dto);
  }

  deleteSubscription(id: string) {
    return this.http.delete(`${API}/subscriptions/${id}`);
  }

  generateWeeklyOrders() {
    return this.http.post<OrderDto[]>(`${API}/subscriptions/generate-weekly-orders`, {});
  }

  chargeMonth(subscriptionId: string, year?: number, month?: number) {
    let url = `${API}/subscriptions/${subscriptionId}/charge-month`;
    const params: string[] = [];
    if (year != null) params.push(`year=${year}`);
    if (month != null) params.push(`month=${month}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.post<{ orders: OrderDto[]; amount: number }>(url, {});
  }
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export interface OrderDto {
  id: string;
  clientName: string;
  mitgesDotzenes: number;
  paid: boolean;
  delivered: boolean;
  subscriptionId?: string;
  createdAt: string;
}

export interface SubscriptionDto {
  id: string;
  clientName: string;
  mitgesDotzenes: number;
  amountPerMonth?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionDto {
  clientName: string;
  mitgesDotzenes: number;
  amountPerMonth?: number;
}

export interface UpdateSubscriptionDto {
  clientName?: string;
  mitgesDotzenes?: number;
  amountPerMonth?: number | null;
  active?: boolean;
}

export interface CreateOrderDto {
  clientName: string;
  mitgesDotzenes: number;
  createdAt?: string;
}

export interface UpdateOrderDto {
  paid?: boolean;
  delivered?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface TransactionDto {
  id: string;
  userId?: string;
  user?: User;
  clientName?: string;
  orderId?: string;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface BalanceResponse {
  totalExpenses: number;
  totalIncome: number;
  globalBalance: number;
  fairShare: number;
  settlement: SettlementRow[];
  transfers: TransferDto[];
}

export interface SettlementRow {
  person: string;
  personId: string;
  paid: number;
  held: number;
  netContribution: number;
  diff: number;
  fairShare: number;
}

export interface TransferDto {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}
