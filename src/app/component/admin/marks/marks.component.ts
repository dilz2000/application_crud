import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormControl } from '@angular/forms';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

declare var bootstrap: any; // Fix for "Cannot find name 'bootstrap'"

@Component({
  selector: 'app-marks',
  templateUrl: './marks.component.html',
  styleUrls: ['./marks.component.css']
})
export class MarksComponent {
  // Search input
  searchQuery = new FormControl('');

  // Lists from Firestore
  testList$: Observable<any[]>; // Holds all tests
  userList$: Observable<any[]>; // Holds all users
  
  // Combined data for calculations
  combinedData$: Observable<{tests: any[], users: any[]}>; 

  // Modal data for creating a new test
  newTestName: string = '';

  // Modal data for editing a mark
  selectedUser: any = null;
  selectedTest: any = null;
  newMark: number | null = null;

  // Subject averages for each test
  testAverages: { [testId: string]: number } = {};
  
  // Overall subject average
  overallAverage: number = 0;

  constructor(private firestore: AngularFirestore) {
    // Load tests from Firestore (collection 'tests')
    this.testList$ = this.firestore.collection('tests').valueChanges({ idField: 'id' });

    // Load users from Firestore (collection 'users')
    this.userList$ = this.firestore.collection('users', ref => 
      ref.where('roles.user', '==', true)).valueChanges({ idField: 'uid' });
      
    // Combine both observables to calculate averages
    this.combinedData$ = combineLatest([
      this.testList$,
      this.userList$
    ]).pipe(
      map(([tests, users]) => {
        // Calculate test averages
        this.calculateTestAverages(tests, users);
        return { tests, users };
      })
    );
  }
  
  // Calculate average mark for a student across all tests
  calculateStudentAverage(user: any, tests: any[]): number {
    if (!user.testScores || !tests || tests.length === 0) return 0;
    
    let total = 0;
    let count = 0;
    
    tests.forEach(test => {
      const score = user.testScores[test.id];
      if (score !== undefined && score !== null) {
        total += parseFloat(score);
        count++;
      }
    });
    
    return count > 0 ? parseFloat((total / count).toFixed(2)) : 0;
  }
  
  // Calculate averages for each test and overall average
  calculateTestAverages(tests: any[], users: any[]): void {
    this.testAverages = {};
    let overallTotal = 0;
    let overallCount = 0;
    
    // Calculate average for each test
    tests.forEach(test => {
      let testTotal = 0;
      let testCount = 0;
      
      users.forEach(user => {
        const score = user.testScores?.[test.id];
        if (score !== undefined && score !== null) {
          testTotal += parseFloat(score);
          testCount++;
          
          // Add to overall total
          overallTotal += parseFloat(score);
          overallCount++;
        }
      });
      
      this.testAverages[test.id] = testCount > 0 ? parseFloat((testTotal / testCount).toFixed(2)) : 0;
    });
    
    // Calculate overall average
    this.overallAverage = overallCount > 0 ? parseFloat((overallTotal / overallCount).toFixed(2)) : 0;
  }

  // Open the modal to create a new test
  openAddTestDialog() {
    this.newTestName = '';
    this.openModal('addTestModal');
  }

  // Create a new test in Firestore
  createTest() {
    if (!this.newTestName.trim()) return;

    // Add a new document to 'tests' collection
    this.firestore.collection('tests').add({
      name: this.newTestName.trim()
    }).then(() => {
      console.log(`✅ New test created: ${this.newTestName}`);
      this.closeModal('addTestModal');
    }).catch(error => {
      console.error('❌ Error creating test:', error);
    });
  }

  // Open the modal to edit a user's mark
  openMarkDialog(user: any, test: any) {
    this.selectedUser = user;
    this.selectedTest = test;
    this.newMark = user.testScores?.[test.id] ?? null;

    this.openModal('markModal');
  }

  // Save updated mark to Firestore
  confirmMarkUpdate() {
    if (!this.selectedUser || !this.selectedTest || this.newMark === null) return;

    // Path: testScores.testDocID
    const path = `testScores.${this.selectedTest.id}`;
    this.firestore.collection('users').doc(this.selectedUser.uid).update({
      [path]: this.newMark
    }).then(() => {
      console.log(`✅ Updated mark for ${this.selectedUser.name} (${this.selectedTest.name}): ${this.newMark}`);
      this.closeModal('markModal');
    }).catch(error => {
      console.error('❌ Error updating mark:', error);
    });
  }

  // Utility: Open a Bootstrap modal by ID
  openModal(modalId: string) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  // Utility: Close a Bootstrap modal by ID
  closeModal(modalId: string) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      }
    }
  }
}