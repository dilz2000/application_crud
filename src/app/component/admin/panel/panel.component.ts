import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { UserData } from 'src/app/models/user-data'; // ✅ Using your existing UserData interface

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css']
})
export class PanelComponent {
  admins$: Observable<UserData[]>; 
  users$: Observable<UserData[]>; 
  pendingUsers$: Observable<UserData[]>; 

  searchUser = new FormControl('');
  searchPending = new FormControl('');
  searchAdmin = new FormControl(''); // ✅ Added search control for Admins

  // Grade and class configuration
  showApprovalModal = false;
  selectedUser: UserData | null = null;
  approvalForm = new FormGroup({
    grade: new FormControl('', Validators.required),
    class: new FormControl('', Validators.required),
    medium: new FormControl('', Validators.required)
  });

  // Available grades and classes
  availableGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  availableClasses = ['Class A', 'Class B', 'Class C', 'Class D'];
  availableMediums = ['Sinhala', 'English'];


  constructor(private firestore: AngularFirestore) {
    const allUsers$ = this.firestore.collection<UserData>('users').valueChanges({ idField: 'docId' });


    // ✅ Fetch only Admins
    this.admins$ = allUsers$.pipe(
      map(users => users.filter(user => user.roles?.admin === true)),
      startWith([])
    );

    // ✅ Fetch only Users (not admins)
    this.users$ = allUsers$.pipe(
      map(users => users.filter(user => user.roles?.user === true && !user.roles?.admin)),
      startWith([])
    );

    // ✅ Fetch only Pending Users
    this.pendingUsers$ = allUsers$.pipe(
      map(users => users.filter(user => user.status === 'pending')),
      startWith([])
    );
  }

  // ✅ Filter Users based on search query
  filterUsers(users: UserData[] | null | undefined, query: string | null | undefined): UserData[] {
    if (!users) return []; // ✅ Prevent null issues
    const searchQuery = (query ?? '').trim().toLowerCase(); // ✅ Ensure query is a string

    if (!searchQuery) return users; // ✅ If empty, return all users

    return users.filter(user =>
      (user.name?.toLowerCase() || '').includes(searchQuery) ||
      (user.email?.toLowerCase() || '').includes(searchQuery) ||
      (user.phone?.toLowerCase() || '').includes(searchQuery)
    );
  }

  // Open approval modal
  openApprovalModal(user: UserData): void {
    this.selectedUser = user;
    this.showApprovalModal = true;
    
    // Reset form values
    this.approvalForm.reset();
  }

  // Close approval modal
  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedUser = null;
  }

  // Submit approval with grade and class
  submitApproval(): void {
    if (!this.selectedUser || !this.approvalForm.valid) {
      return;
    }

    const gradeValue = this.approvalForm.get('grade')?.value;
    const classValue = this.approvalForm.get('class')?.value;
    const mediumValue = this.approvalForm.get('medium')?.value;

    // Declare studentId outside the if block
  let studentId: string | undefined;

  // Check if both values are valid
  if (gradeValue && classValue && mediumValue) {
    studentId = this.selectedUser.sid || this.generateStudentID(gradeValue, classValue, mediumValue);
  } else {
    // Handle the case where one or both values are missing
    console.error('Grade, class or medium value is missing');
    return; // Exit the function if values are missing
  }
  
  // Use document ID (docId) from Firebase instead of sid for document operations
  const docId = this.selectedUser.docId; // Make sure you have this field

    this.firestore.collection('users').doc(docId).update({
      status: 'active',
      'roles.user': true,
      grade: gradeValue,
      class: classValue,
      medium: mediumValue,
      sid: studentId
    }).then(() => {
      console.log(`User ${this.selectedUser?.name} approved and assigned to ${gradeValue}, ${classValue}, ${mediumValue}`);
      this.closeApprovalModal();
    }).catch(error => {
      console.error("Error approving user:", error);
    });
  }

  // ✅ Approve User
  approveUser(sid: string): void {
    this.firestore.collection('users').doc(sid).update({
      status: 'active',
      'roles.user': true
    });
  }

  // ✅ Promote/Demote User
  toggleAdmin(sid: string, isAdmin: boolean): void {
    this.firestore.collection('users').doc(sid).update({
      'roles.admin': !isAdmin
    });
  }

  // Helper method to generate a student ID
generateStudentID(grade: string, className: string, medium: string): string {
  // Example format: G12C3-2025-xxxx (Grade 12, Class 3, Year 2025, Random number)
  const gradeNum = grade.replace(/\D/g, '');
  const classLetter = className.replace(/\D/g, '');
  const mediumCode = medium === 'Sinhala' ? 'S' : 'E';
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  
  return `G${gradeNum}C${classLetter}-${mediumCode}-${year}-${randomNum}`;
}

  // ✅ Edit Student ID
  // ✅ Update Student ID and Ensure UI Reflects the Change
  updateStudentID(event: Event, user: UserData & { uid?: string }): void {
    const inputElement = event.target as HTMLInputElement;
    const newStudentID = inputElement.value.trim();
  
    if (!newStudentID || newStudentID === user.sid) return; // ✅ Prevent unnecessary updates
  
    if (!user.uid) {
      console.error("Error: User UID is missing, cannot update Firestore.");
      return; // ✅ Prevent errors if `uid` is missing
    }
  
    this.firestore.collection('users').doc(user.uid).update({
      sid: newStudentID  // ✅ Store the new Student ID inside the document
    }).then(() => {
      console.log(`Student ID updated for ${user.name}: ${newStudentID}`);
    }).catch(error => {
      console.error("Error updating Student ID:", error);
    });
  }


  // ✅ Delete User
  deleteUser(sid: string): void {
    if (confirm("Are you sure you want to delete this user?")) {
      this.firestore.collection('users').doc(sid).delete();
    }
  }
}





// import { Component } from '@angular/core';
// import { AngularFirestore } from '@angular/fire/compat/firestore';
// import { Observable } from 'rxjs';

// @Component({
//   selector: 'app-panel',
//   templateUrl: './panel.component.html',
//   styleUrls: ['./panel.component.css']
// })
// export class PanelComponent {
//   users$: Observable<any[]>;

//   constructor(private firestore: AngularFirestore) {
//     this.users$ = this.firestore.collection('users').valueChanges({ idField: 'uid' });
//   }

//   // ✅ Approve User - Enables other buttons
//   approveUser(uid: string): void {
//     this.firestore.collection('users').doc(uid).update({
//       status: 'active',
//       'roles.user': true
//     }).then(() => {
//       console.log(`User ${uid} approved`);
//     }).catch(error => {
//       console.error("Error approving user:", error);
//     });
//   }

//   // ✅ Promote/Demote User to Admin
//   toggleAdmin(uid: string, isAdmin: boolean): void {
//     this.firestore.collection('users').doc(uid).update({
//       'roles.admin': !isAdmin
//     }).then(() => {
//       console.log(`User ${uid} admin status changed to: ${!isAdmin}`);
//     }).catch(error => {
//       console.error("Error toggling admin:", error);
//     });
//   }

//   // ✅ Delete User from Database
//   deleteUser(uid: string): void {
//     if (confirm("Are you sure you want to delete this user?")) {
//       this.firestore.collection('users').doc(uid).delete().then(() => {
//         console.log(`User ${uid} deleted`);
//       }).catch(error => {
//         console.error("Error deleting user:", error);
//       });
//     }
//   }
// }




