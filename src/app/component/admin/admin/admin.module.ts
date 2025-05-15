import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { MarksComponent } from '../marks/marks.component';
import { PaymentsComponent } from '../payments/payments.component';
import { UsersComponent } from '../users/users.component';
import { ProfileComponent } from '../profile/profile.component';
import { AdminLayoutComponent } from '../admin-layout/admin-layout.component';
import { PanelComponent } from '../panel/panel.component';
import { FilterPipe } from 'src/app/filter.pipe';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AdminUpdatesComponent } from '../admin-updates/admin-updates.component';
import { TestComponent } from '../test/test.component';
import { HttpClientModule } from '@angular/common/http';
import { SubjectManagementComponent } from '../subject-management/subject-management.component';
import { StudentSubjectsComponent } from '../student-subjects/student-subjects.component';
import { TestManagementComponent } from '../test-management/test-management.component';
import { TestMarksComponent } from '../test-marks/test-marks.component';
import { TestSubjectsComponent } from '../test-subjects/test-subjects.component';
import { AttendanceManagementComponent } from '../attendance-management/attendance-management.component';
import { StaffManagementComponent } from '../staff-management/staff-management.component';

@NgModule({
  declarations: [
    MarksComponent,
    PaymentsComponent,
    UsersComponent,
    ProfileComponent,
    AdminLayoutComponent,
    AdminUpdatesComponent,
    PanelComponent,
    TestComponent,
    SubjectManagementComponent,
    StudentSubjectsComponent,
    TestManagementComponent,
    TestMarksComponent,
    TestSubjectsComponent,
    AttendanceManagementComponent,
    StaffManagementComponent,
    FilterPipe

  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFirestoreModule,
    HttpClientModule
    
    
  ]
})
export class AdminModule { }
