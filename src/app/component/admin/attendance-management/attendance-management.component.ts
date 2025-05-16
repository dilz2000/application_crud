import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, startWith, switchMap, catchError, tap } from 'rxjs/operators';
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

  // Track if we're loading data
  loading = false;

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

    this.filterForm = this.fb.group({
      startDate: [new Date()],
      endDate: [new Date()],
      grade: [''],
      class: [''],
      studentId: [''],
      status: ['']
    });

    // Initialize students observable
    this.students$ = this.selectionForm.valueChanges.pipe(
      startWith(this.selectionForm.value),
      switchMap(form => {
        const grade = form.grade;
        const classValue = form.class;
        
        if (!grade || !classValue) {
        return of([]);
      }

      console.log('Querying students with:', { grade, class: classValue });
      
      console.log(`Querying students with grade: "${grade}" and class: "${classValue}"`);

      
      return this.firestore.collection<UserData>('users', ref => 
        ref.where('roles.user', '==', true)
           .where('grade', '==', grade)
           .where('classId', '==', classValue)
      ).valueChanges({ idField: 'docId' }).pipe(
        tap(students => console.log('Found students:', students.length)),
        catchError(error => {
          console.error('Error loading students:', error);
          return of([]);
        })
      );
    })
  );

    // Initialize attendance records observable
    this.attendanceRecords$ = this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      switchMap(filter => this.getFilteredAttendanceRecords(filter)),
      catchError(error => {
        console.error('Error fetching attendance records:', error);
        return of([]);
      })
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
    if (!selection.date || !selection.grade || !selection.class) {
      this.attendanceMarkedToday = false;
      this.existingAttendance = [];
      return;
    }

    // Format date as YYYY-MM-DD for consistent comparisons
    const selectedDate = this.formatDate(selection.date);
    
    this.loading = true;
    
    this.firestore.collection<AttendanceRecord>('attendance', ref => 
      ref.where('date', '==', selectedDate)
         .where('grade', '==', selection.grade)
         .where('class', '==', selection.class)
    ).valueChanges({ idField: 'id' })
    .pipe(
      catchError(error => {
        console.error('Error checking existing attendance:', error);
        return of([]);
      })
    )
    .subscribe(records => {
      this.loading = false;
      this.existingAttendance = records;
      this.attendanceMarkedToday = records.length > 0;
      
      if (this.attendanceMarkedToday && !this.isEditMode) {
        console.log('Attendance already marked for this date, grade, and class');
      }
    });
  }

  // Format date as YYYY-MM-DD
  formatDate(date: Date | string): string {
  if (!date) return '';
  
  let d: Date;
  if (typeof date === 'string') {
    // Handle string date input
    d = new Date(date);
  } else {
    // Handle Date object
    d = date;
  }
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }
  
  // Format as YYYY-MM-DD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

  // Get filtered attendance records
  getFilteredAttendanceRecords(filter: AttendanceFilter): Observable<AttendanceRecord[]> {
  // If no filters are set, return empty array to prevent unnecessary queries
  if (!filter.startDate && !filter.endDate && !filter.grade && !filter.class && !filter.status && !filter.studentId) {
    return of([]);
  }
  
  try {
    // Strategy: Use a single field filter on Firestore side and handle the rest in memory
    // This avoids complex composite index requirements
    let queryRef: firebase.firestore.Query<AttendanceRecord> = this.firestore.collection<AttendanceRecord>('attendance').ref;
    let appliedFirestoreFilter = false;
    
    // Apply a single Firestore filter (to avoid complex index requirements)
    if (filter.grade) {
      queryRef = queryRef.where('grade', '==', filter.grade);
      appliedFirestoreFilter = true;
    } else if (filter.class) {
      queryRef = queryRef.where('class', '==', filter.class);
      appliedFirestoreFilter = true;
    } else if (filter.status) {
      queryRef = queryRef.where('status', '==', filter.status);
      appliedFirestoreFilter = true;
    } else if (filter.startDate) {
      const startDateStr = this.formatDate(filter.startDate);
      queryRef = queryRef.where('date', '>=', startDateStr);
      appliedFirestoreFilter = true;
    }
    
    // If no specific filter is applied, we can still order by date
    queryRef = queryRef.orderBy('date', 'desc');
    
    // Limit results for performance
    queryRef = queryRef.limit(500);
    
    console.log('Applied Firestore filter:', appliedFirestoreFilter);
    
    // Execute query and apply remaining filters in memory
    return from(queryRef.get().then(snapshot => {
      console.log('Retrieved records:', snapshot.size);
      let records: AttendanceRecord[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as AttendanceRecord;
        records.push({ ...data, id: doc.id });
      });
      
      // Apply all filters in memory
      return records.filter(record => {
        // Initialize as true and add conditions
        let matches = true;
        
        // Apply grade filter if it wasn't applied in Firestore
        if (matches && filter.grade && !appliedFirestoreFilter) {
          matches = record.grade === filter.grade;
        }
        
        // Apply class filter if it wasn't applied in Firestore
        if (matches && filter.class && !appliedFirestoreFilter) {
          matches = record.class === filter.class;
        }
        
        // Apply status filter if it wasn't applied in Firestore
        if (matches && filter.status && !appliedFirestoreFilter) {
          matches = record.status === filter.status;
        }
        
        // Apply start date filter if it wasn't applied in Firestore
        if (matches && filter.startDate && !appliedFirestoreFilter) {
          const startDateStr = this.formatDate(filter.startDate);
          const recordDate = typeof record.date === 'string' ? record.date : this.formatDate(record.date);
          matches = recordDate >= startDateStr;
        }
        
        // Apply end date filter (always in memory)
        if (matches && filter.endDate) {
          const endDateStr = this.formatDate(filter.endDate);
          const recordDate = typeof record.date === 'string' ? record.date : this.formatDate(record.date);
          matches = recordDate <= endDateStr;
        }
        
        // Apply student search filter (always in memory)
        if (matches && filter.studentId && filter.studentId.trim() !== '') {
          const searchTerm = filter.studentId.toLowerCase().trim();
          matches = 
            (!!record.studentId && record.studentId.toLowerCase().includes(searchTerm)) || 
            (!!record.studentName && record.studentName.toLowerCase().includes(searchTerm)) ? true : false;
        }
        
        return matches;
      });
    })).pipe(
      catchError(error => {
        console.error('Error filtering attendance records:', error);
        // If there's an index error, suggest creating an index
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.warn('This query requires an index. Please create the suggested index in the Firebase console.');
          // You might want to display this message to the user
        }
        return of([]);
      })
    );
  } catch (error) {
    console.error('Unexpected error in getFilteredAttendanceRecords:', error);
    return of([]);
  }
}

  // Toggle edit mode
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  // Mark or update attendance for all students
  saveAttendance(students: UserData[]): void {
    if (!this.selectionForm.valid) {
      alert('Please select grade, class and date first');
      return;
    }
    
    const selection = this.selectionForm.value;
    const formattedDate = this.formatDate(selection.date);
    const batch = this.firestore.firestore.batch();
    
    students.forEach(student => {
      // Get status and notes using the element IDs
      const statusInput = document.getElementById(`status-${student.docId}`) as HTMLSelectElement;
      const status = statusInput ? statusInput.value as 'present' | 'absent' | 'late' | 'excused' : 'absent';
      
      const notesInput = document.getElementById(`notes-${student.docId}`) as HTMLInputElement;
      const notes = notesInput ? notesInput.value : '';
      
      // Find existing record for this student on this date
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
        alert('Error saving attendance. Please try again.');
      });
  }

  // Export attendance data to CSV
  exportAttendance(): void {
    this.loading = true;
    
    // Get current filter values
    const filter = this.filterForm.value;
    
    // Get filtered records
    this.getFilteredAttendanceRecords(filter).subscribe({
      next: (records) => {
        this.loading = false;
        
        if (records.length === 0) {
          alert('No records to export');
          return;
        }

        // Create CSV content
        let csv = 'Date,Grade,Class,Student ID,Student Name,Status,Notes\n';
        
        records.forEach(record => {
          // Escape fields to handle commas, quotes, etc. in the data
          const escapeCsvField = (field: string) => {
            if (!field) return '';
            // If field contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
            if (field.includes('"') || field.includes(',') || field.includes('\n')) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          };
          
          csv += `${escapeCsvField(this.formatDate(record.date))},${escapeCsvField(record.grade)},${escapeCsvField(record.class)},` +
                 `${escapeCsvField(record.studentId)},${escapeCsvField(record.studentName)},` +
                 `${escapeCsvField(record.status)},${escapeCsvField(record.notes || '')}\n`;
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `attendance-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error exporting attendance:', error);
        alert('Error exporting attendance. Please try again.');
      }
    });
  }

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
    this.filterForm.reset({
      startDate: new Date(),
      endDate: new Date(),
      grade: '',
      class: '',
      studentId: '',
      status: ''
    });
  }
}
// Converts a Promise to an Observable
function from<T>(promise: Promise<T>): Observable<T> {
  return new Observable<T>(subscriber => {
    promise
      .then(value => {
        if (!subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
        }
      })
      .catch(err => {
        if (!subscriber.closed) {
          subscriber.error(err);
        }
      });
  });
}
