import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './component/login/login.component';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { RegisterComponent } from './component/register/register.component';
import { ForgotPasswordComponent } from './component/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from './component/verify-email/verify-email.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminDashboardComponent } from './component/admin-dashboard/admin-dashboard.component';
import { RoleGuard } from './guards/role.guard';
import { LandingComponent } from './component/landing/landing.component';
import { StudentDashboardComponent } from './component/student-dashboard/student-dashboard.component';


const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' }, // Change to landing
  { path: 'landing', component: LandingComponent }, // Add landing route
  {path: 'login', component : LoginComponent},
  {path: 'admin-dashboard', component : AdminDashboardComponent, canActivate: [AuthGuard, RoleGuard], data: {requiredRole: 'admin'}},
  {path: 'dashboard', component : DashboardComponent, canActivate: [AuthGuard]},
  {path: 'student-dashboard', component : StudentDashboardComponent, canActivate: [AuthGuard]},
  {path: 'register', component : RegisterComponent},
  {path: 'forgot-password', component : ForgotPasswordComponent},
  {path: 'verify-email', component : VerifyEmailComponent},
  {
    path: 'admin',
    loadChildren: () => import('./component/admin/admin/admin.module').then(m => m.AdminModule),
    canActivate: [RoleGuard, AuthGuard],
    data: { requiredRole: 'admin' }
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
