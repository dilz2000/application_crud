import { Component } from '@angular/core';
import { AuthService } from '../shared/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UserDataRead } from '../models/firestore-types';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  userName: string | null = null;

  constructor(
    private auth: AuthService,
    private firestore: AngularFirestore
  ) {
    this.auth.getCurrentUser().subscribe(user => {
      if (user) {
        const userId = user.uid;
        this.firestore.collection<UserDataRead>('users').doc(userId).get()
  .subscribe((doc) => {
    if (doc.exists) {
      const data = doc.data() as UserDataRead;
      this.userName = data.name;
      const createdAtDate = data.createdAt.toDate();
    }
  });
      } else {
        this.userName = null;
      }
    });
  }

  onLogout() {
    this.auth.logout();
  }
}