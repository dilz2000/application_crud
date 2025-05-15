// admin-dashboard.component.ts
import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent {
  users$: Observable<any[]>;

  constructor(private firestore: AngularFirestore) {
    this.users$ = this.firestore.collection('users', ref =>
      ref.orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'uid' });
  }

  promoteToAdmin(uid: string): void {
    this.firestore.collection('users').doc(uid).update({
      'roles.admin': true
    });
  }

  demoteFromAdmin(uid: string): void {
    this.firestore.collection('users').doc(uid).update({
      'roles.admin': false
    });
  }
}