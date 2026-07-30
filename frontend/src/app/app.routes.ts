import { Routes } from '@angular/router';
import { authGuard, casaGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registo',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/registo.component').then((m) => m.RegistoComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: '',
    canActivate: [casaGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'despesas',
        loadComponent: () =>
          import('./features/despesas/despesas-list.component').then((m) => m.DespesasListComponent),
      },
      {
        path: 'despesas/nova',
        loadComponent: () =>
          import('./features/despesas/despesa-form.component').then((m) => m.DespesaFormComponent),
      },
      {
        path: 'despesas/:id',
        loadComponent: () =>
          import('./features/despesas/despesa-form.component').then((m) => m.DespesaFormComponent),
      },
      {
        path: 'acertos',
        loadComponent: () =>
          import('./features/acertos/acertos.component').then((m) => m.AcertosComponent),
      },
      {
        path: 'mais',
        loadComponent: () => import('./features/mais/mais.component').then((m) => m.MaisComponent),
      },
      {
        path: 'estatisticas',
        loadComponent: () =>
          import('./features/estatisticas/estatisticas.component').then((m) => m.EstatisticasComponent),
      },
      {
        path: 'habitantes',
        loadComponent: () =>
          import('./features/habitantes/habitantes.component').then((m) => m.HabitantesComponent),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/categorias/categorias.component').then((m) => m.CategoriasComponent),
      },
      {
        path: 'relatorios',
        loadComponent: () =>
          import('./features/relatorios/relatorios.component').then((m) => m.RelatoriosComponent),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/configuracoes/configuracoes.component').then(
            (m) => m.ConfiguracoesComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
