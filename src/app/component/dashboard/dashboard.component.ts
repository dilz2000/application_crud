import { Component, OnInit, ElementRef, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface UserData {
  uid: string;
  name: string;
  grade?: string;
  subject?: string;
  class?: string;
  attendance?: { [date: string]: boolean };
  payments?: { [year: string]: { [month: string]: string } };
  testResults?: { [testName: string]: number };
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user$: Observable<UserData | null> = of(null);
  attendanceDates: string[] = [];
  testResults: { [test: string]: number } = {};
  testNames: string[] = [];
  months: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  attendanceYear: number = new Date().getFullYear();
  paymentYear: number = new Date().getFullYear();
  currentUserId: string = '';

  constructor(private firestore: AngularFirestore, private auth: AngularFireAuth) {}

  ngOnInit(): void {
    this.auth.user.pipe(
      switchMap(user => {
        if (user) {
          this.currentUserId = user.uid;
          return this.firestore.collection<UserData>('users').doc(user.uid).valueChanges();
        }
        return of(null);
      })
    ).subscribe(user => {
      if (user) {
        this.user$ = of(user);
        this.loadAttendance(user);
        this.loadPayments(user);
        this.loadTestResults();
      }
    });
  }

  // Load Attendance Data
  loadAttendance(user: UserData) {
    if (user?.attendance) {
      this.attendanceDates = Object.keys(user.attendance).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
    }
  }

  // Get attendance dates for the selected year (but allow scrolling for all)
  get filteredAttendanceDates() {
    return this.attendanceDates.filter(date => 
      new Date(date).getFullYear() === this.attendanceYear
    );
  }

  // Load Payment Data
  loadPayments(user: UserData) {
    if (user?.payments && user.payments[this.paymentYear]) {
      console.log("Loaded payment data for", this.paymentYear, user.payments[this.paymentYear]);
    }
  }

  // Load Test Results from Firestore
  loadTestResults() {
    if (!this.currentUserId) return;
    this.firestore.collection('tests', ref => ref.where('userId', '==', this.currentUserId))
      .valueChanges()
      .subscribe((tests: any[]) => {
        if (tests.length > 0) {
          this.testResults = tests[0]?.scores || {};
          this.testNames = Object.keys(this.testResults).sort();
        }
      });
  }

  // Update the year filter manually
  updateYearFilter(type: 'attendance' | 'payments', year: number) {
    if (type === 'attendance') {
      this.attendanceYear = year;
    } else {
      this.paymentYear = year;
    }
  }

  // Logout function
  logout() {
    this.auth.signOut().then(() => {
      window.location.href = '/login';
    });
  }
}
