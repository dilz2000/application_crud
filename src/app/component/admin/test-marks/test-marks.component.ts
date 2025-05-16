import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Test } from 'src/app/models/test';
import { Subject } from 'src/app/models/subject';
import { UserData } from 'src/app/models/user-data';
import { TestMark } from 'src/app/models/test-mark';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-test-marks',
  templateUrl: './test-marks.component.html',
  styleUrls: ['./test-marks.component.css']
})
export class TestMarksComponent implements OnInit {
  tests$: Observable<Test[]>;
  availableSubjects$: Observable<Subject[]>;
  students$: Observable<UserData[]>;
  testMarks$: Observable<TestMark[]>;

  selectedTest: Test | null = null;
  selectedSubject: Subject | null = null;
  selectedStudent: UserData | null = null;

  filteredMarks: TestMark[] = [];
  markedCount: number = 0;
  averagePercentage: number = 0;

  markForm: FormGroup;
  loading = false;

  constructor(
    private firestore: AngularFirestore,
    private fb: FormBuilder
  ) {
    this.tests$ = this.firestore.collection<Test>('tests').valueChanges({ idField: 'id' });

    this.markForm = this.fb.group({
      marks: ['', [Validators.required, Validators.min(0)]],
      maximumMarks: [100, [Validators.required, Validators.min(1)]],
      remarks: ['']
    });

    this.availableSubjects$ = of([]);
    this.students$ = of([]);
    this.testMarks$ = of([]);
  }

  ngOnInit(): void {
    // Initialize the subscription for test marks
    this.testMarks$.subscribe(marks => {
      this.updateFilteredMarksAndAverage(marks);
    });
  }

  // New method to update filtered marks and average
  updateFilteredMarksAndAverage(marks: TestMark[]): void {
    if (this.selectedSubject) {
      this.filteredMarks = marks.filter(m => m.subjectId === this.selectedSubject?.id);
      this.markedCount = this.filteredMarks.length;

      if (this.markedCount > 0) {
        const total = this.filteredMarks.reduce((sum, mark) => sum + (mark.marks / mark.maximumMarks * 100), 0);
        this.averagePercentage = total / this.markedCount;
      } else {
        this.averagePercentage = 0;
      }
    }
  }

  selectTest(test: Test): void {
    this.loading = true;
    this.selectedTest = test;
    this.selectedSubject = null;
    this.selectedStudent = null;
    this.filteredMarks = [];
    this.markedCount = 0;
    this.averagePercentage = 0;

    // Load marks for this test
    this.testMarks$ = this.firestore.collection<TestMark>('testMarks', 
      ref => ref.where('testId', '==', test.id))
      .valueChanges({ idField: 'id' })
      .pipe(
        tap(marks => {
          // This will update filteredMarks and averages when marks change
          this.updateFilteredMarksAndAverage(marks);
        })
      );

    // Check if test has subjects
    if (!test.id || !test.subjects || test.subjects.length === 0) {
      console.warn('Test has no subjects assigned');
      this.availableSubjects$ = of([]);
      this.loading = false;
      return;
    }

    // Process subjects in batches (Firestore 'in' limit is 10)
    if (test.subjects.length > 0) {
      const subjectBatches = [];
      for (let i = 0; i < test.subjects.length; i += 10) {
        const batch = test.subjects.slice(i, i + 10);
        subjectBatches.push(batch);
      }

      // Ensure we have valid subject IDs
      if (subjectBatches.length > 0) {
        // Combine results from all batches
        this.availableSubjects$ = combineLatest(
          subjectBatches.map(batch => 
            this.firestore.collection<Subject>('subjects', 
              ref => ref.where(firebase.firestore.FieldPath.documentId(), 'in', batch))
              .valueChanges({ idField: 'id' })
          )
        ).pipe(
          map(batches => {
            const allSubjects = batches.flat();
            console.log(`Found ${allSubjects.length} subjects for test:`, allSubjects);
            return allSubjects;
          })
        );
      } else {
        this.availableSubjects$ = of([]);
      }
    } else {
      this.availableSubjects$ = of([]);
    }

    this.loading = false;
  }

  selectSubject(subject: Subject): void {
    this.loading = true;
    this.selectedSubject = subject;
    this.selectedStudent = null;

    if (!this.selectedTest?.gradeId || !subject.id) {
      this.loading = false;
      return;
    }

    this.students$ = this.firestore.collection<UserData>('users', 
      ref => ref.where('grade', '==', this.selectedTest?.gradeId)
               .where('subjects', 'array-contains', subject.id)
               .where('status', '==', 'active'))
      .valueChanges({ idField: 'docId' });

    // When a new subject is selected, update the filtered marks and average
    this.testMarks$.subscribe(marks => {
      this.updateFilteredMarksAndAverage(marks);
    });

    this.loading = false;
  }

  selectStudent(student: UserData): void {
    if (!student.docId) return;

    this.selectedStudent = student;

    if (!this.selectedTest?.id || !this.selectedSubject?.id) return;

    this.testMarks$.pipe(
      map(marks => marks.find(m => 
        m.studentId === student.docId && 
        m.subjectId === this.selectedSubject?.id &&
        m.testId === this.selectedTest?.id))
    ).subscribe(existingMark => {
      if (existingMark) {
        this.markForm.patchValue({
          marks: existingMark.marks,
          maximumMarks: existingMark.maximumMarks,
          remarks: existingMark.remarks || ''
        });
      } else {
        this.markForm.reset({
          marks: '',
          maximumMarks: 100,
          remarks: ''
        });
      }
    });
  }

  saveMarks(): void {
  if (this.markForm.invalid || !this.selectedStudent?.docId ||
  !this.selectedSubject?.id || !this.selectedTest?.id) {
    return;
  }

  const markData: TestMark = {
    testId: this.selectedTest.id,
    studentId: this.selectedStudent.docId,
    studentName: this.selectedStudent.name || '',
    subjectId: this.selectedSubject.id,
    subjectName: this.selectedSubject.name,
    marks: this.markForm.value.marks,
    maximumMarks: this.markForm.value.maximumMarks,
    remarks: this.markForm.value.remarks,
    date: new Date().toISOString()
  };

  // First, check if we already have existing marks for this student-subject-test combo
  this.firestore.collection<TestMark>('testMarks', ref => 
    ref.where('testId', '==', this.selectedTest!.id)
       .where('studentId', '==', this.selectedStudent!.docId)
       .where('subjectId', '==', this.selectedSubject!.id)
  ).get().subscribe(snapshot => {
    if (!snapshot.empty) {
      // Update existing mark
      const existingDoc = snapshot.docs[0];
      this.firestore.collection('testMarks').doc(existingDoc.id).update(markData)
        .then(() => {
          console.log('Mark updated successfully');
          this.resetMarkForm();
        })
        .catch(error => {
          console.error('Error updating mark:', error);
        });
    } else {
      // Add new mark
      this.firestore.collection('testMarks').add(markData)
        .then(() => {
          console.log('Mark added successfully');
          this.resetMarkForm();
        })
        .catch(error => {
          console.error('Error adding mark:', error);
        });
    }
  });
}

  resetMarkForm(): void {
    this.markForm.reset({
      marks: '',
      maximumMarks: 100,
      remarks: ''
    });
    this.selectedStudent = null;
  }

  clearSelection(): void {
    this.selectedTest = null;
    this.selectedSubject = null;
    this.selectedStudent = null;
    this.filteredMarks = [];
    this.markedCount = 0;
    this.averagePercentage = 0;
  }

  getMarksForStudent(student: UserData, marks: TestMark[]): TestMark | null {
    if (!this.selectedSubject?.id || !student.docId) return null;
    return marks.find(m =>
      m.studentId === student.docId &&
      m.subjectId === this.selectedSubject?.id) || null;
  }

  getPercentage(mark: TestMark): number {
    return (mark.marks / mark.maximumMarks) * 100;
  }

  // Updated method that properly calculates the average
  getAveragePercentage(marks: TestMark[]): number {
    if (!this.selectedSubject?.id) return 0;

    const subjectMarks = marks.filter(m => m.subjectId === this.selectedSubject?.id);
    if (subjectMarks.length === 0) return 0;

    const total = subjectMarks.reduce((sum, mark) => sum + this.getPercentage(mark), 0);
    return total / subjectMarks.length;
  }
}