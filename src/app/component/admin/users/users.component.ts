import { Component, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { UserData } from 'src/app/models/user-data';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
  searchQuery = new FormControl('');
  yearInput: number = new Date().getFullYear(); // Default to current year
  users$: Observable<UserData[]>;  
  attendanceDates: string[] = [];  
  newDate: string = '';
  attendanceSummary: { [key: string]: number } = {};
  userAttendanceTotal: { [userId: string]: number } = {};
  isDropdownOpen: string | null = null;
  visibleStartIndex = 0; // Start index for showing dates
  maxVisibleDates = 10; // Show only 10 dates at once

  constructor(private firestore: AngularFirestore) {
    this.users$ = this.firestore.collection<UserData>('users', ref =>
      ref.where('roles.user', '==', true)
    ).valueChanges({ idField: 'uid' });

    this.firestore.collection('attendanceDates').doc('dates').valueChanges().subscribe((dates: any) => {
      if (dates?.dates) {
        this.attendanceDates = dates.dates.sort((a: string, b: string) => 
          new Date(a).getTime() - new Date(b).getTime()
        );
        this.calculateSummary();
      }
    });
  }

  // Get filtered attendance dates based on the year filter
  get filteredDates() {
    return this.attendanceDates.filter(date => 
      new Date(date).getFullYear() === this.yearInput
    );
  }

  toggleAttendance(user: UserData & { uid: string }, date: string) {
    this.firestore.collection('users').doc(user.uid).get().subscribe(doc => {
      if (doc.exists) {
        const userData = doc.data() as UserData;
        const currentStatus = userData?.attendance?.[date] || false;
        const attendancePath = `attendance.${date}`;

        this.firestore.collection('users').doc(user.uid).update({
          [attendancePath]: !currentStatus
        }).then(() => {
          console.log(`Attendance updated for ${user.uid} on ${date}: ${!currentStatus}`);
          this.calculateSummary();
        }).catch(error => {
          console.error('Error updating attendance:', error);
        });
      }
    });
  }

  modifyDate(date: string) {
    const newDate = prompt(`Modify date: ${date}`, date);
    if (newDate && newDate !== date) {
      this.attendanceDates = this.attendanceDates.map(d => (d === date ? newDate : d));

      this.firestore.collection('attendanceDates').doc('dates').set({
        dates: this.attendanceDates
      }, { merge: true });

      this.calculateSummary();
    }
  }

  deleteDate(date: string) {
    this.attendanceDates = this.attendanceDates.filter(d => d !== date);

    this.firestore.collection('attendanceDates').doc('dates').set({
      dates: this.attendanceDates
    }, { merge: true });

    this.calculateSummary();
  }

  addDate() {
    if (this.newDate && !this.attendanceDates.includes(this.newDate)) {
      this.attendanceDates = [...this.attendanceDates, this.newDate].sort((a, b) => a.localeCompare(b));

      this.firestore.collection('attendanceDates').doc('dates').set({
        dates: this.attendanceDates
      }, { merge: true });

      this.calculateSummary();
    }
  }



  // Get the visible dates (only 10 at a time)
  get visibleDates() {
    const datesForYear = this.filteredDates;
    return datesForYear.slice(this.visibleStartIndex, this.visibleStartIndex + this.maxVisibleDates);
  }

  scrollLeft() {
    if (this.visibleStartIndex > 0) {
      this.visibleStartIndex--;
    }
  }

  scrollRight() {
    if (this.visibleStartIndex + this.maxVisibleDates < this.filteredDates.length) {
      this.visibleStartIndex++;
    }
  }

  toggleDropdown(date: string, event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = this.isDropdownOpen === date ? null : date;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement) {
    if (!target.closest('.dropdown-container')) {
      this.isDropdownOpen = null;
    }
  }

  calculateSummary() {
    this.attendanceSummary = {};
    this.userAttendanceTotal = {};

    this.users$.subscribe(users => {
      this.attendanceDates.forEach(date => {
        this.attendanceSummary[date] = users.filter(user => user.attendance?.[date]).length;
      });

      users.forEach(user => {
        this.userAttendanceTotal[user.sid] = this.attendanceDates
          .filter(date => user.attendance?.[date])
          .length;
      });
    });
  }

  get totalAttendance() {
    return this.visibleDates.reduce((total, date) => total + (this.attendanceSummary[date] || 0), 0);
  }
}
