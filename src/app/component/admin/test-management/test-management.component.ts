import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Test } from 'src/app/models/test';

@Component({
  selector: 'app-test-management',
  templateUrl: './test-management.component.html',
  styleUrls: ['./test-management.component.css']
})
export class TestManagementComponent implements OnInit {
  testForm: FormGroup;
  tests$: Observable<Test[]>;
  availableClasses = ['Class A', 'Class B', 'Class C', 'Class D'];
  availableGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13' ];
  selectedStatusFilter: string = '';
  editingTest: Test | null = null;
  statusOptions = ['upcoming', 'ongoing', 'completed'];
  
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
      status: ['upcoming', [Validators.required]]
    });
    this.tests$ = this.firestore.collection<Test>('tests').valueChanges({ idField: 'id' });
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
  
  addTest(): void {
    if (this.testForm.invalid) {
      return;
    }
    
    const test: Test = {
      name: this.testForm.value.name,
      description: this.testForm.value.description,
      classId: this.testForm.value.classId,
      className: this.testForm.value.classId,
      gradeId: this.testForm.value.gradeId,
      gradeName: this.testForm.value.gradeId,
      date: this.testForm.value.date,
      status: this.testForm.value.status,
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
    this.testForm.reset({
      status: 'upcoming'
    });
    this.editingTest = null;
  }
}