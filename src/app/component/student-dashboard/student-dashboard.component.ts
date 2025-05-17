import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, combineLatest, of, Subscription } from 'rxjs';
import { map, switchMap, tap, finalize } from 'rxjs/operators';
import { UserData } from 'src/app/models/user-data';
import { Test } from 'src/app/models/test';
import { TestMark } from 'src/app/models/test-mark';
import { Subject } from 'src/app/models/subject';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { AttendanceRecord } from 'src/app/models/attendance';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  currentUser$: Observable<UserData | null>;
  userSubjects$: Observable<Subject[]>;
  userTests$: Observable<Test[]>;
  userMarks$: Observable<TestMark[]>;
  userAttendance$: Observable<AttendanceRecord[]>;
  userPayments$: Observable<{ [year: string]: { [month: string]: boolean } }>;

  months = ['January', 'February', 'March', 'April', 'May', 'June', 
          'July', 'August', 'September', 'October', 'November', 'December'];
  
  selectedMonth: string = '';
  selectedYear: number = new Date().getFullYear();

  availableYears: number[] = [];
  selectedPaymentYear: number = new Date().getFullYear();
  userPayments: { [year: string]: { [month: string]: boolean } } = {};
  

  // For attendance calculations
  attendanceData: { date: string; status: boolean }[] = [];
  attendanceRate: number = 0;
  daysPresent: number = 0;
  totalDays: number = 0;

  // For test performance
  selectedSubjectFilter: string = '';
  selectedTestFilter: string = '';

  loading: boolean = true;
  
  // Track subscriptions to clean up
  private subscriptions: Subscription[] = [];

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) {
    // Get current user's data
    this.currentUser$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.firestore.collection<UserData>('users',
            ref => ref.where('email', '==', user.email))
            .valueChanges({ idField: 'docId' }).pipe(
              map(users => users && users.length > 0 ? users[0] : null)
            );
        } else {
          return of(null);
        }
      })
    );

    this.userPayments$ = this.currentUser$.pipe(
      map(user => user?.payments || {})
    );

    // Get user attendance
    this.userAttendance$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user && user.sid) {
          return this.firestore.collection<AttendanceRecord>('attendance', ref => 
            ref.where('studentId', '==', user.sid)
              .orderBy('date', 'desc')
              .limit(100)
          ).valueChanges({ idField: 'id' });
        } else {
          return of([]);
        }
      })
    );

    // Get subjects assigned to the user
    this.userSubjects$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user && user.subjects && user.subjects.length > 0) {
          // Process subjects in batches (Firestore 'in' limit is 10)
          const subjectBatches = [];
          for (let i = 0; i < user.subjects.length; i += 10) {
            const batch = user.subjects.slice(i, i + 10);
            subjectBatches.push(batch);
          }
          
          return combineLatest(
            subjectBatches.map(batch => 
              this.firestore.collection<Subject>('subjects', 
                ref => ref.where(firebase.firestore.FieldPath.documentId(), 'in', batch))
                .valueChanges({ idField: 'id' })
            )
          ).pipe(
            map(batches => batches.flat())
          );
        } else {
          return of([]);
        }
      })
    );

    // Get tests for user's grade
    this.userTests$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user && user.grade) {
          return this.firestore.collection<Test>('tests', 
            ref => ref.where('gradeId', '==', user.grade))
            .valueChanges({ idField: 'id' });
        } else {
          return of([]);
        }
      })
    );

    // Get marks for the user
    this.userMarks$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user && user.docId) {
          return this.firestore.collection<TestMark>('testMarks', 
            ref => ref.where('studentId', '==', user.docId))
            .valueChanges({ idField: 'id' });
        } else {
          return of([]);
        }
      })
    );
  }

  ngOnInit() {
    // Setup a combined data loading subscriber to track loading state
    const loadingSubscription = combineLatest([
      this.currentUser$,
      this.userSubjects$,
      this.userTests$,
      this.userMarks$,
      this.userAttendance$
    ]).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: ([user, subjects, tests, marks, attendanceRecords]) => {
        if (attendanceRecords && attendanceRecords.length > 0) {
          // Transform attendance records for UI
          const attendanceMap: { [date: string]: boolean } = {};
          attendanceRecords.forEach(record => {
            let dateValue = record.date;
            
            // Convert Firestore Timestamp to JS Date if needed
            if (dateValue instanceof firebase.firestore.Timestamp) {
              dateValue = dateValue.toDate();
            }
            
            const dateKey = (dateValue instanceof Date) 
              ? dateValue.toISOString().split('T')[0] 
              : String(dateValue);
              
            attendanceMap[dateKey] = record.status === 'present';
          });
          
          this.processAttendanceData(attendanceMap);
        }
        
        // Set loading to false when data is loaded
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.loading = false;
      }
    });
    
    this.subscriptions.push(loadingSubscription);

    this.currentUser$.subscribe(user => {
  if (user?.payments) {
    this.userPayments = user.payments;
    this.availableYears = Object.keys(user.payments).map(y => +y).sort((a, b) => b - a); // Sort descending
    if (!this.availableYears.includes(this.selectedPaymentYear)) {
      this.selectedPaymentYear = this.availableYears[0] ?? new Date().getFullYear();
    }
  }
});

  }
  
  ngOnDestroy() {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  processAttendanceData(attendance: { [date: string]: boolean }): void {
    this.attendanceData = Object.entries(attendance)
      .map(([date, status]) => ({ date, status }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.totalDays = this.attendanceData.length;
    this.daysPresent = this.attendanceData.filter(day => day.status).length;
    this.attendanceRate = this.totalDays > 0 ? (this.daysPresent / this.totalDays) * 100 : 0;
  
    this.updateAvailableYears();
  }

  filterMarksBySubject(subject: string): void {
    this.selectedSubjectFilter = subject;
    this.selectedTestFilter = '';
  }

  filterMarksByTest(test: string): void {
    this.selectedTestFilter = test;
  }

  clearFilters(): void {
    this.selectedSubjectFilter = '';
    this.selectedTestFilter = '';
  }

  getPercentage(mark: TestMark): number {
    return (mark.marks / mark.maximumMarks) * 100;
  }

  getAverageMarks(marks: TestMark[], subjectId?: string): number {
    let filteredMarks = marks;

    if (subjectId) {
      filteredMarks = marks.filter(mark => mark.subjectId === subjectId);
    }

    if (filteredMarks.length === 0) return 0;

    const total = filteredMarks.reduce((sum, mark) => sum + this.getPercentage(mark), 0);
    return total / filteredMarks.length;
  }

  getSubjectName(subjectId: string, subjects: Subject[]): string {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Unknown Subject';
  }

  getTestName(testId: string, tests: Test[]): string {
    const test = tests.find(t => t.id === testId);
    return test ? test.name : 'Unknown Test';
  }

  getLatestTests(tests: Test[], count: number = 3): Test[] {
    return [...tests].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    }).slice(0, count);
  }

  getCurrentMonthAttendance(): { present: number, absent: number } {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthData = this.attendanceData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    });

    const present = monthData.filter(day => day.status).length;
    const absent = monthData.filter(day => !day.status).length;

    return { present, absent };
  }

  getFilteredAttendanceData(): { date: string, status: boolean }[] {
  return this.attendanceData.filter(item => {
    const date = new Date(item.date);
    const monthMatch = this.selectedMonth ? date.getMonth() === this.months.indexOf(this.selectedMonth) : true;
    const yearMatch = date.getFullYear() === this.selectedYear;
    return monthMatch && yearMatch;
  });
}


getMonthStats(): { present: number, absent: number } {
  const filtered = this.getFilteredAttendanceData();
  return {
    present: filtered.filter(day => day.status).length,
    absent: filtered.filter(day => !day.status).length
  };
}

updateAvailableYears(): void {
  const years = this.attendanceData.map(item => new Date(item.date).getFullYear());
  this.availableYears = Array.from(new Set(years)).sort((a, b) => b - a); // descending
}


}