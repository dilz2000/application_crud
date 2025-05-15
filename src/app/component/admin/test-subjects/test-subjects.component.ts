import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Test } from 'src/app/models/test';
import { Subject } from 'src/app/models/subject';

@Component({
  selector: 'app-test-subjects',
  templateUrl: './test-subjects.component.html',
  styleUrls: ['./test-subjects.component.css']
})
export class TestSubjectsComponent implements OnInit {
  tests$: Observable<Test[]>;
  availableSubjects: Subject[] = [];
  testSubjects: Subject[] = [];
  selectedTest: Test | null = null;
  loading = false;
  statusOptions = ['upcoming', 'ongoing', 'completed'];
  selectedStatusFilter: string = '';
  
  constructor(
    private firestore: AngularFirestore
  ) {
    // Initialize with all tests
    this.tests$ = this.firestore.collection<Test>('tests')
      .valueChanges({ idField: 'id' });
  }

  ngOnInit(): void {
    // Initialize with all tests
    this.filterTestsByStatus('');
  }

  filterTestsByStatus(status: string): void {
    this.selectedStatusFilter = status;
    
    if (status) {
      this.tests$ = this.firestore.collection<Test>('tests', 
        ref => ref.where('status', '==', status))
        .valueChanges({ idField: 'id' });
    } else {
      this.tests$ = this.firestore.collection<Test>('tests')
        .valueChanges({ idField: 'id' });
    }
  }

  selectTest(test: Test): void {
    this.loading = true;
    this.selectedTest = test;
    
    // Initialize arrays
    this.testSubjects = [];
    this.availableSubjects = [];
    
    // Initialize subjects array if it doesn't exist
    if (!test.subjects) {
      test.subjects = [];
    }
    
    // Get all subjects for this grade level
    this.firestore.collection<Subject>('subjects', 
      ref => ref.where('gradeLevel', '==', test.gradeId))
      .valueChanges({ idField: 'id' })
      .subscribe(allSubjects => {
        // Sort subjects into test subjects and available subjects
        allSubjects.forEach(subject => {
          if (subject.id && test.subjects.includes(subject.id)) {
            this.testSubjects.push(subject);
          } else {
            this.availableSubjects.push(subject);
          }
        });
        this.loading = false;
      });
  }

  addSubjectToTest(subject: Subject): void {
    // Guard clause with non-null assertion or early return
    if (!this.selectedTest?.id || !subject.id) return;

    console.log(`Attempting to add subject ${subject.id} (${subject.name}) to test ${this.selectedTest.id}`);
    
    const testId = this.selectedTest.id; // Store this to ensure it's not null later
    const subjectId = subject.id;
    
    // Get current test data
    this.firestore.doc<Test>(`tests/${testId}`).get().subscribe(doc => {
      if (doc.exists) {
        const test = { id: doc.id, ...doc.data() } as Test;
        
        // Initialize subjects array if it doesn't exist
        if (!test.subjects) {
          test.subjects = [];
        }
        
        // Add subject ID to test's subjects array
        test.subjects.push(subjectId);
        
        // Update test in firestore - use stored testId to avoid null issues
        this.firestore.doc(`tests/${testId}`).update({
          subjects: test.subjects
        }).then(() => {
          console.log(`Subject ${subject.id} successfully added to test`);
          // Update local arrays
          this.testSubjects.push(subject);
          this.availableSubjects = this.availableSubjects.filter(s => s.id !== subject.id);
          
          // Update selected test - check again to satisfy TypeScript
          if (this.selectedTest) {
            this.selectedTest.subjects = test.subjects;
          }
        }).catch(error => {
          console.error('Error adding subject to test:', error);
        });
      }
    });
  }
  
  removeSubjectFromTest(subject: Subject): void {
    // Guard clause with non-null assertion or early return
    if (!this.selectedTest?.id || !subject.id) return;
    
    const testId = this.selectedTest.id; // Store this to ensure it's not null later
    const subjectId = subject.id;
    
    // Get current test data
    this.firestore.doc<Test>(`tests/${testId}`).get().subscribe(doc => {
      if (doc.exists) {
        const test = { id: doc.id, ...doc.data() } as Test;
        
        // Remove subject ID from test's subjects array
        test.subjects = test.subjects.filter(id => id !== subjectId);
        
        // Update test in firestore - use stored testId to avoid null issues
        this.firestore.doc(`tests/${testId}`).update({
          subjects: test.subjects
        }).then(() => {
          console.log('Subject removed from test successfully');
          // Update local arrays
          this.availableSubjects.push(subject);
          this.testSubjects = this.testSubjects.filter(s => s.id !== subject.id);
          
          // Update selected test - check again to satisfy TypeScript
          if (this.selectedTest) {
            this.selectedTest.subjects = test.subjects;
          }
        }).catch(error => {
          console.error('Error removing subject from test:', error);
        });
      }
    });
  }

  clearSelection(): void {
    this.selectedTest = null;
    this.testSubjects = [];
    this.availableSubjects = [];
  }
}