import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { Test } from 'src/app/models/test';

@Component({
  selector: 'app-test-management',
  templateUrl: './test-management.component.html',
  styleUrls: ['./test-management.component.css']
})
export class TestManagementComponent implements OnInit, OnDestroy {
  testForm: FormGroup;
  tests$: Observable<Test[]>;
  availableClasses = ['Class A', 'Class B', 'Class C', 'Class D'];
  availableGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  selectedStatusFilter: string = '';
  editingTest: Test | null = null;
  statusOptions = ['upcoming', 'ongoing', 'completed'];
  private statusUpdateSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore
  ) {
    this.testForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      classId: ['', [Validators.required]],
      gradeId: ['', [Validators.required]],
      date: ['', [Validators.required]],
      status: [{ value: '', disabled: true }, [Validators.required]]
    });
    this.tests$ = this.firestore.collection<Test>('tests').valueChanges({ idField: 'id' });
    
    // Watch for date changes to auto-update status
    this.testForm.get('date')?.valueChanges.subscribe(date => {
      if (date) {
        this.updateStatusBasedOnDate(date);
      }
    });
  }

  ngOnInit(): void {
    // Initialize with all tests
    this.filterTestsByStatus('');
    
    // Set up an interval to check and update statuses every hour
    this.statusUpdateSubscription = interval(60 * 60 * 1000).pipe(
      startWith(0), // Run immediately on startup
      switchMap(() => {
        // Update all test statuses based on current date
        return this.updateAllTestStatuses();
      })
    ).subscribe();
  }

  ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.statusUpdateSubscription) {
      this.statusUpdateSubscription.unsubscribe();
    }
  }

  /**
   * Updates a test's status based on its date compared to the current date
   */
  updateStatusBasedOnDate(dateInput: string | Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    let testDate: Date;
    if (typeof dateInput === 'string') {
      testDate = new Date(dateInput);
    } else {
      testDate = new Date(dateInput);
    }
    testDate.setHours(0, 0, 0, 0); // Reset time for accurate comparison

    let status: string;

    if (testDate < today) {
      // Test date is in the past
      status = 'completed';
    } else if (testDate.getTime() === today.getTime()) {
      // Test date is today
      status = 'ongoing';
    } else {
      // Test date is in the future
      status = 'upcoming';
    }

    // Update the form control
    this.testForm.get('status')?.setValue(status);
  }

  /**
   * Updates statuses of all tests in the database based on current date
   */
  updateAllTestStatuses(): Observable<any> {
    return this.firestore.collection<Test>('tests').valueChanges({ idField: 'id' }).pipe(
      switchMap(tests => {
        const batch = this.firestore.firestore.batch();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let updatesMade = false;
        
        tests.forEach(test => {
          if (!test.id) return;
          
          const testDate = new Date(test.date);
          testDate.setHours(0, 0, 0, 0);
          
          let newStatus: string | null = null;
          
          if (testDate < today && test.status !== 'completed') {
            newStatus = 'completed';
          } else if (testDate.getTime() === today.getTime() && test.status !== 'ongoing') {
            newStatus = 'ongoing';
          } else if (testDate > today && test.status !== 'upcoming') {
            newStatus = 'upcoming';
          }
          
          if (newStatus) {
            updatesMade = true;
            const docRef = this.firestore.firestore.collection('tests').doc(test.id);
            batch.update(docRef, { status: newStatus });
          }
        });
        
        if (updatesMade) {
          return new Observable<void>(observer => {
            batch.commit()
              .then(() => {
                console.log('Test statuses updated successfully');
                observer.next();
                observer.complete();
              })
              .catch(error => {
                console.error('Error updating test statuses:', error);
                observer.error(error);
              });
          });
        } else {
          return new Observable<void>(observer => {
            observer.next();
            observer.complete();
          });
        }
      })
    );
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

  addTest(): void {
    if (this.testForm.invalid) {
      return;
    }

    // Get the value from the disabled status control
    const statusValue = this.testForm.get('status')?.value;

    const test: Test = {
      name: this.testForm.value.name,
      description: this.testForm.value.description,
      classId: this.testForm.value.classId,
      className: this.testForm.value.classId,
      gradeId: this.testForm.value.gradeId,
      gradeName: this.testForm.value.gradeId,
      date: this.testForm.value.date,
      status: statusValue,
      subjects: [] // Initially no subjects
    };

    if (this.editingTest && this.editingTest.id) {
      // Update existing test
      this.firestore.collection('tests').doc(this.editingTest.id).update(test)
        .then(() => {
          console.log('Test updated successfully');
          this.resetForm();
        })
        .catch(error => {
          console.error('Error updating test:', error);
        });
    } else {
      // Add new test
      this.firestore.collection('tests').add(test)
        .then(() => {
          console.log('Test added successfully');
          this.resetForm();
        })
        .catch(error => {
          console.error('Error adding test:', error);
        });
    }

  }

  editTest(test: Test): void {
    this.editingTest = test;
    this.testForm.patchValue({
      name: test.name,
      description: test.description || '',
      classId: test.classId,
      gradeId: test.gradeId || '',
      date: test.date,
      status: test.status
    });
    
    // Ensure status is still correct based on date
    this.updateStatusBasedOnDate(test.date);
  }

  deleteTest(id: string): void {
    if (confirm('Are you sure you want to delete this test?')) {
      this.firestore.collection('tests').doc(id).delete()
        .then(() => {
          console.log('Test deleted successfully');
        })
        .catch(error => {
          console.error('Error deleting test:', error);
        });
    }
  }

  resetForm(): void {
    this.testForm.reset();
    this.editingTest = null;
  }
}