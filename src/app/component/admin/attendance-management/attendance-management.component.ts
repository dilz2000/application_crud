import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { UserData } from 'src/app/models/user-data';
import { AttendanceRecord, AttendanceFilter } from 'src/app/models/attendance';
import firebase from 'firebase/compat/app';

@Component({
  selector: 'app-attendance-management',
  templateUrl: './attendance-management.component.html',
  styleUrls: ['./attendance-management.component.css']
})
export class AttendanceManagementComponent implements OnInit {
  // Available grades and classes (same as in panel component)
  availableGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 
                     'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  availableClasses = ['Class A', 'Class B', 'Class C', 'Class D'];
  attendanceStatuses = ['present', 'absent', 'late', 'excused'];

  // Form for selecting grade, class and date to mark attendance
  selectionForm: FormGroup;

  // Form for filtering attendance records
  filterForm: FormGroup;

  // Students in selected grade and class
  students$: Observable<UserData[]>;

  // Attendance records based on filter
  attendanceRecords$: Observable<AttendanceRecord[]>;

  // Current user (admin)
  currentUserUid: string = 'admin-uid'; // This should be set from your auth service

  // Track if attendance has been marked for selected date/grade/class
  attendanceMarkedToday = false;
  
  // Track if we're in edit mode
  isEditMode = false;

  // Store existing attendance records for the selected date/grade/class
  existingAttendance: AttendanceRecord[] = [];

  formatDateToInput(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore
  ) {
    // Initialize forms
    this.selectionForm = this.fb.group({
      date: [new Date(), Validators.required],
      grade: ['', Validators.required],
      class: ['', Validators.required]
    });

    const today = new Date();

    this.filterForm = this.fb.group({
      startDate: [this.formatDateToInput(today)],
      endDate: [this.formatDateToInput(today)],
      grade: [''],
      class: [''],
      studentId: [''],
      status: ['']
    });

    // Initialize observables
    this.students$ = this.selectionForm.valueChanges.pipe(
      startWith(this.selectionForm.value),
      switchMap(form => {
        const grade = form.grade;
        const classValue = form.class;
        
        if (!grade || !classValue) return [];
        
        return this.firestore.collection<UserData>('users', ref => 
          ref.where('roles.user', '==', true)
             .where('grade', '==', grade)
             .where('class', '==', classValue)
        ).valueChanges({ idField: 'docId' });
      })
    );

    this.attendanceRecords$ = this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      switchMap(filter => this.getFilteredAttendanceRecords(filter))
    );
  }

  ngOnInit(): void {
    // Check for attendance records whenever selection changes
    this.selectionForm.valueChanges.subscribe(value => {
      this.checkExistingAttendance();
    });
    
    // Check initially
    this.checkExistingAttendance();
  }

  // Check if attendance has been marked for the selected date/grade/class
  checkExistingAttendance(): void {
    const selection = this.selectionForm.value;
    if (!selection.date || !selection.grade || !selection.class) return;

    // Format date as YYYY-MM-DD for consistent comparisons
    const selectedDate = this.formatDate(selection.date);

    this.firestore.collection<AttendanceRecord>('attendance', ref => 
      ref.where('date', '==', selectedDate)
         .where('grade', '==', selection.grade)
         .where('class', '==', selection.class)
    ).valueChanges({ idField: 'id' })
    .subscribe(records => {
      this.existingAttendance = records;
      this.attendanceMarkedToday = records.length > 0;
      
      if (this.attendanceMarkedToday && !this.isEditMode) {
        // Pre-populate forms with existing data if editing
        console.log('Attendance already marked for this date, grade, and class');
      }
    });
  }

  // Format date as YYYY-MM-DD
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // Get filtered attendance records
  getFilteredAttendanceRecords(filter: AttendanceFilter): Observable<AttendanceRecord[]> {
    return this.firestore.collection<AttendanceRecord>('attendance', ref => {
      let query: firebase.firestore.Query = ref;
      
      // Apply date range filter
      if (filter.startDate) {
        const startDateStr = this.formatDate(filter.startDate);
        query = query.where('date', '>=', startDateStr);
      }
      
      if (filter.endDate) {
        const endDateStr = this.formatDate(filter.endDate);
        query = query.where('date', '<=', endDateStr);
      }
      
      // Apply other filters if provided
      if (filter.grade) {
        query = query.where('grade', '==', filter.grade);
      }
      
      if (filter.class) {
        query = query.where('class', '==', filter.class);
      }
      
      if (filter.status) {
        query = query.where('status', '==', filter.status);
      }
      
      // Limit and order results
      return query.orderBy('date', 'desc').limit(100);
    }).valueChanges({ idField: 'id' }).pipe(
      map(records => {
        // If student ID filter is applied, filter results in memory
        if (filter.studentId) {
          return records.filter(record => {
            const searchTerm = filter.studentId!.toLowerCase();
            return record.studentId.toLowerCase().includes(searchTerm) || 
                   record.studentName.toLowerCase().includes(searchTerm);
          });
        }
        return records;
      })
    );
  }

  // Toggle edit mode
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  // Mark or update attendance for all students
  saveAttendance(students: UserData[]): void {
    const selection = this.selectionForm.value;
    const formattedDate = this.formatDate(selection.date);
    const batch = this.firestore.firestore.batch();
    
    students.forEach(student => {
      // Get status and notes using the element IDs
      const statusInput = document.getElementById(`status-${student.docId}`) as HTMLSelectElement;
      const status = statusInput ? statusInput.value as 'present' | 'absent' | 'late' | 'excused' : 'absent';
      
      const notesInput = document.getElementById(`notes-${student.docId}`) as HTMLInputElement;
      const notes = notesInput ? notesInput.value : '';
      
      // Rest of your method remains the same...
      const existingRecord = this.existingAttendance.find(record => record.studentId === student.sid);
      
      const attendanceData: Omit<AttendanceRecord, 'id'> = {
        date: formattedDate,
        grade: selection.grade,
        class: selection.class,
        studentId: student.sid || '',
        studentName: student.name || '',
        status: status,
        notes: notes,
        createdBy: this.currentUserUid,
        createdAt: existingRecord ? existingRecord.createdAt : new Date(),
        updatedAt: new Date()
      };
      
      if (existingRecord) {
        const docRef = this.firestore.collection('attendance').doc(existingRecord.id).ref;
        batch.update(docRef, attendanceData);
      } else {
        const docRef = this.firestore.collection('attendance').doc().ref;
        batch.set(docRef, attendanceData);
      }
    });
    
    batch.commit()
      .then(() => {
        console.log('Attendance saved successfully');
        this.checkExistingAttendance();
        if (this.isEditMode) this.toggleEditMode();
      })
      .catch(error => {
        console.error('Error saving attendance:', error);
      });
  }

  // Export attendance data to CSV
  exportAttendance(): void {
    // Use a local subscription instead of using a pipe in the template
    this.attendanceRecords$.subscribe(records => {
      if (records.length === 0) {
        alert('No records to export');
        return;
      }
      
      // Create CSV content
      let csv = 'Date,Grade,Class,Student ID,Student Name,Status,Notes\n';
      
      records.forEach(record => {
        csv += `${record.date},${record.grade},${record.class},${record.studentId},${record.studentName},${record.status},${record.notes || ''}\n`;
      });
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `attendance-export-${new Date().toISOString()}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // Add these methods to your component class

// Helper method to get student's attendance status
getStudentStatus(studentId: string): string {
  const record = this.existingAttendance.find(a => a.studentId === studentId);
  return record?.status || 'present';
}

// Helper method to get student's notes
getStudentNotes(studentId: string): string {
  const record = this.existingAttendance.find(a => a.studentId === studentId);
  return record?.notes || '';
}

// Helper methods for statistics
getPresentCount(records: AttendanceRecord[]): number {
  return records.filter(r => r.status === 'present').length || 0;
}

getAbsentCount(records: AttendanceRecord[]): number {
  return records.filter(r => r.status === 'absent').length || 0;
}

getLateCount(records: AttendanceRecord[]): number {
  return records.filter(r => r.status === 'late').length || 0;
}

getExcusedCount(records: AttendanceRecord[]): number {
  return records.filter(r => r.status === 'excused').length || 0;
}

  // Reset filter form
resetFilters(): void {
  const todayStr = this.formatDateToInput(new Date());
  this.filterForm.reset({
    startDate: todayStr,
    endDate: todayStr,
    grade: '',
    class: '',
    studentId: '',
    status: ''
  });
}

  
}