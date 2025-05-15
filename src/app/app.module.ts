import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AngularFireModule } from '@angular/fire/compat'
import { environment } from 'src/environments/environment.development';
import { LoginComponent } from './component/login/login.component';
import { RegisterComponent } from './component/register/register.component';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ForgotPasswordComponent } from './component/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from './component/verify-email/verify-email.component';
import { HeaderComponent } from './header/header.component';
import { AngularFirestore, AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AdminDashboardComponent } from './component/admin-dashboard/admin-dashboard.component';
import { UserManagementComponent } from './component/user-management/user-management.component';
import { AngularFireFunctionsModule } from '@angular/fire/compat/functions';
import { CommonModule } from '@angular/common';
import { PaymentConfirmationDialogComponent } from './component/shared/payment-confirmation-dialog/payment-confirmation-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button'; 
import { MatInputModule } from '@angular/material/input'; 
import { NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { LandingComponent } from './component/landing/landing.component';
import { StudentDashboardComponent } from './component/student-dashboard/student-dashboard.component';
import { MarkFilterPipe } from './mark-filter.pipe';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    ForgotPasswordComponent,
    VerifyEmailComponent,
    HeaderComponent,
    AdminDashboardComponent,
    UserManagementComponent,
    PaymentConfirmationDialogComponent,
    LandingComponent,
    StudentDashboardComponent,
    MarkFilterPipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule.enablePersistence(),
    FormsModule,
    AngularFirestoreModule,
    AngularFireFunctionsModule,
    ReactiveFormsModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    NgbModule,
    NgbDropdownModule
    
  ],
  providers: [AngularFirestore],
  bootstrap: [AppComponent]
})
export class AppModule { }
