import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { UserData } from '../models/user-data';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(public functions: AngularFireFunctions,private fireauth : AngularFireAuth, private router : Router,  private firestore: AngularFirestore ) { }
  
  getCurrentUser(): Observable<firebase.User | null> {
    return this.fireauth.authState;
  }
  
  getCurrentUserName(): Promise<string | null> {
    return this.fireauth.currentUser.then(user => user?.displayName || null);
  }

  //login method
  login(email: string, password: string): Observable<void> {
    return from(this.fireauth.signInWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        if (!user) throw new Error('Login failed');
  
        // Check email verification
        if (!user.emailVerified) {
          await user.sendEmailVerification();
          this.router.navigate(['/verify-email']);
          return;
        }
  
        // Check admin status
        const doc = await this.firestore.collection('users').doc(user.uid).get().toPromise();
        const userData = doc?.data() as { roles?: { admin?: boolean } };
        const isAdmin = userData?.roles?.admin || false;
  
        // Redirect based on role
        const redirectRoute = isAdmin ? '/admin/panel' : '/student-dashboard';
        this.router.navigate([redirectRoute]);
      }));
  }

  // auth.service.ts
  getCurrentUserData(): Observable<UserData | null> {
    return this.fireauth.authState.pipe(
      switchMap(user => {
        if (!user) return of(null);
        return this.firestore.collection('users').doc<UserData>(user.uid).valueChanges().pipe(
          map(data => data || null) // Ensure null instead of undefined
        );
      })
    );
  }

// auth.service.ts
isAdmin(): Observable<boolean> {
  return this.getCurrentUser().pipe(
    switchMap(user => {
      if (!user) return of(false);
      return this.firestore.collection('users').doc(user.uid).valueChanges().pipe(
        map((userData: any) => userData?.roles?.admin || false)
      );
    })
  );
}
  

  // register method
  // Add to AuthService
  register(name: string, email: string, phone: string, password: string): Promise<void> {
    return this.fireauth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        if (!userCredential.user) {
          throw new Error('User creation failed');
        }
        
        const userId = userCredential.user.uid;
        
        // Store user data in Firestore
        return this.firestore.collection<UserData>('users').doc(userId).set({
          sid: '',
          name: name,
          email: email,
          phone: phone,
          status: 'pending',
          roles: {
            user: false,
            admin : false 
          },
          //createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          return userCredential.user!.updateProfile({ // Non-null assertion
            displayName: name
          });
        }).then(() => {
          this.sendEmailForVerification(userCredential.user!);
          alert('Registration successful!');
          this.router.navigate(['/login']);
        });
      })
      .catch(error => {
        alert(`Registration failed: ${error.message}`);
        this.router.navigate(['/register']);
        throw error;
      });
  }

  // sign out
  logout() {
    this.fireauth.signOut().then( () => {
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }, err => {
      alert(err.message);
    })
  }

  //forgot password
  forgotPassword(email : string) {
    this.fireauth.sendPasswordResetEmail(email).then(() => {
      this.router.navigate(['/verify-email']);
    }, err => {
      alert('Something went wrong');
    })
}

  //email verification
  sendEmailForVerification(user : any){
    user.sendEmailVerification().then((res : any) => {
        this.router.navigate(['/verify-email']);
    }, (err : any) => {
      alert('Something went wrong when sending verification email')
    })
  }


}
