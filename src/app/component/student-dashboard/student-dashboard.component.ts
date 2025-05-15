import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { UserData } from 'src/app/models/user-data';
import { Test } from 'src/app/models/test';
import { TestMark } from 'src/app/models/test-mark';
import { Subject } from 'src/app/models/subject';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  currentUser$: Observable<UserData | null>;
  userSubjects$: Observable<Subject[]>;
  userTests$: Observable<Test[]>;
  userMarks$: Observable<TestMark[]>;
  
  // For attendance calculations
  attendanceData: { date: string; status: boolean }[] = [];
  attendanceRate: number = 0;
  daysPresent: number = 0;
  totalDays: number = 0;
  
  // For test performance
  selectedSubjectFilter: string = '';
  selectedTestFilter: string = '';
  
  loading: boolean = true;
  
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
      }),
      tap(userData => {
        if (userData && userData.attendance) {
          this.processAttendanceData(userData.attendance);
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
                ref => ref.where('id', 'in', batch))
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

  ngOnInit(): void {
    // Set loading to false once data is loaded
    combineLatest([
      this.currentUser$,
      this.userSubjects$,
      this.userTests$,
      this.userMarks$
    ]).subscribe(() => {
      this.loading = false;
    });
  }

  processAttendanceData(attendance: { [date: string]: boolean }): void {
    this.attendanceData = Object.entries(attendance).map(([date, status]) => {
      return { date, status };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    this.totalDays = this.attendanceData.length;
    this.daysPresent = this.attendanceData.filter(day => day.status).length;
    this.attendanceRate = this.totalDays > 0 ? (this.daysPresent / this.totalDays) * 100 : 0;
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
}