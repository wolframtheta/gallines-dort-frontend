import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./transactions/transactions.page').then(
            (m) => m.TransactionsPage
          ),
      },
      {
        path: 'balance',
        loadComponent: () =>
          import('./balance/balance.page').then((m) => m.BalancePage),
      },
      {
        path: 'comandes',
        loadComponent: () =>
          import('./comandes/comandes.page').then((m) => m.ComandesPage),
      },
      {
        path: 'subscripcions',
        loadComponent: () =>
          import('./subscripcions/subscripcions.page').then((m) => m.SubscripcionsPage),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./members/members.page').then((m) => m.MembersPage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'tabs/dashboard',
    pathMatch: 'full',
  },
];
