import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from '../admin-layout/admin-layout.component';
import { PanelComponent } from '../panel/panel.component';
import { UsersComponent } from '../users/users.component';
import { ProfileComponent } from '../profile/profile.component';
import { PaymentsComponent } from '../payments/payments.component';
import { MarksComponent } from '../marks/marks.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { AdminUpdatesComponent } from '../admin-updates/admin-updates.component';
import { TestComponent } from '../test/test.component';
import { SubjectManagementComponent } from '../subject-management/subject-management.component';
import { StudentSubjectsComponent } from '../student-subjects/student-subjects.component';
import { TestManagementComponent } from '../test-management/test-management.component';
import { TestSubjectsComponent } from '../test-subjects/test-subjects.component';
import { TestMarksComponent } from '../test-marks/test-marks.component';
import { AttendanceManagementComponent } from '../attendance-management/attendance-management.component';
import { StaffManagementComponent } from '../staff-management/staff-management.component';


const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [RoleGuard, AuthGuard],
    data: { requiredRole: 'admin' },
    children: [
      { path: 'panel', component: PanelComponent },
      { path: 'users', component: UsersComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'payments', component: PaymentsComponent },
      { path: 'marks', component: MarksComponent },
      { path: 'admin-updates', component: AdminUpdatesComponent },
      { path: 'test', component: TestComponent },
      { path: 'subjects', component: SubjectManagementComponent },
      { path: 'studentSub', component: StudentSubjectsComponent },
      { path: 'tests', component: TestManagementComponent },
      { path: 'testSub', component: TestSubjectsComponent },
      { path: 'testMarks', component: TestMarksComponent },
      { path: 'attend', component: AttendanceManagementComponent },
      { path: 'teacher', component: StaffManagementComponent },
      { path: '', redirectTo: 'panel', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }