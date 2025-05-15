import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: any;

  constructor(
    private auth: AuthService,
    private firestore: AngularFirestore,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    this.auth.getCurrentUser().subscribe(user => {
      if (user) {
        this.firestore.collection('users').doc(user.uid).get()
          .subscribe(doc => {
            this.currentUser = doc.data();
            this.profileForm.patchValue(this.currentUser);
          });
      }
    });
  }

  updateProfile() {
    if (this.profileForm.valid) {
      this.auth.getCurrentUser().subscribe(user => {
        if (user) {
          this.firestore.collection('users').doc(user.uid)
            .update(this.profileForm.value)
            .then(() => alert('Profile updated successfully'))
            .catch(error => alert('Error updating profile: ' + error));
        }
      });
    }
  }
}
