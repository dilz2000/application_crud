// user-management.component.ts
import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent {
  users: Observable<any[]>;
  searchEmail: string = '';

  constructor(private firestore: AngularFirestore) {
    this.users = this.firestore.collection('users').valueChanges({ idField: 'id' });
  }

  promoteToAdmin(userId: string) {
    this.firestore.collection('users').doc(userId).update({
      'roles.admin': true
    });
  }

  demoteFromAdmin(userId: string) {
    this.firestore.collection('users').doc(userId).update({
      'roles.admin': false
    });
  }

  searchUser() {
    this.users = this.firestore.collection('users', ref =>
      ref.where('email', '==', this.searchEmail)
    ).valueChanges({ idField: 'id' });
  }
}