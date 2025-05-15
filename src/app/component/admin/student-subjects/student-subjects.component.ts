import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { UserData } from 'src/app/models/user-data';
import { Subject } from 'src/app/models/subject';

@Component({
  selector: 'app-student-subjects',
  templateUrl: './student-subjects.component.html',
  styleUrls: ['./student-subjects.component.css']
})
export class StudentSubjectsComponent implements OnInit {
  students$: Observable<UserData[]>;
  subjects$: Observable<Subject[]>;
  filteredSubjects$: Observable<Subject[]>;
  
  searchStudent = new FormControl('');
  selectedGrade = new FormControl('');
  selectedClass = new FormControl('');
  
  selectedStudent: UserData | null = null;
  studentSubjects: Subject[] = [];
  availableSubjects: Subject[] = [];
  
  availableGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  availableClasses = ['Class A', 'Class B', 'Class C', 'Class D'];

  constructor(private firestore: AngularFirestore) {
    // Get all active students
    this.students$ = this.firestore.collection<UserData>('users', 
      ref => ref.where('status', '==', 'active')
              .where('roles.user', '==', true))
      .valueChanges({ idField: 'docId' });
    
    // Get all subjects
    this.subjects$ = this.firestore.collection<Subject>('subjects')
      .valueChanges({ idField: 'id' });
    
    // Initialize filtered subjects
    this.filteredSubjects$ = this.subjects$;
  }

  ngOnInit(): void {
    // Set up filters for students based on grade and class
    this.setupFilters();
  }

  setupFilters(): void {
    // Filter students when grade or class changes
    combineLatest([
      this.students$,
      this.selectedGrade.valueChanges.pipe(startWith('')),
      this.selectedClass.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([students, grade, classValue]) => {
        return students.filter(student => {
          const matchesGrade = !grade || student.grade === grade;
          const matchesClass = !classValue || student.class === classValue;
          return matchesGrade && matchesClass;
        });
      })
    ).subscribe(filteredStudents => {
      this.students$ = new Observable(observer => observer.next(filteredStudents));
    });
  }

  filterStudents(students: UserData[] | null, query: string): UserData[] {
    if (!students) return [];
    
    const searchQuery = query.trim().toLowerCase();
    if (!searchQuery) return students;

    return students.filter(student => 
      (student.name?.toLowerCase() || '').includes(searchQuery) ||
      (student.sid?.toLowerCase() || '').includes(searchQuery) ||
      (student.email?.toLowerCase() || '').includes(searchQuery)
    );
  }

  selectStudent(student: UserData): void {
    this.selectedStudent = student;
    this.loadStudentSubjects(student);
  }

  loadStudentSubjects(student: UserData): void {
    // Reset current state first
    this.studentSubjects = [];
    
    if (!student.subjects || student.subjects.length === 0) {
      this.loadAvailableSubjects(student.grade || '');
      return;
    }
  
    // Get subject details for each subject ID individually instead of using 'in' query
    // which might be causing issues with how the data is structured
    const subjectQueries = student.subjects.map(subjectId => {
      return this.firestore.doc<Subject>(`subjects/${subjectId}`)
        .valueChanges()
        .pipe(map(subject => {
          if (subject) {
            return { ...subject, id: subjectId };
          }
          return null;
        }));
    });
  
    // Combine all subject queries
    combineLatest(subjectQueries).subscribe(subjectsArray => {
      // Filter out any null values and update studentSubjects
      this.studentSubjects = subjectsArray.filter(subject => subject !== null) as Subject[];
      this.loadAvailableSubjects(student.grade || '');
    });
  }

  loadAvailableSubjects(grade: string): void {
    this.firestore.collection<Subject>('subjects', 
      ref => ref.where('gradeLevel', '==', grade))
      .valueChanges({ idField: 'id' })
      .subscribe(subjects => {
        // Filter out subjects already assigned to the student
        const assignedIds = this.studentSubjects.map(s => s.id);
        this.availableSubjects = subjects.filter(s => !assignedIds.includes(s.id));
      });
  }

  assignSubject(subject: Subject): void {
    if (!this.selectedStudent || !this.selectedStudent.docId || !subject.id) return;
  
    const studentRef = this.firestore.collection('users').doc(this.selectedStudent.docId);
    
    // Get current subjects array or initialize empty array
    const currentSubjects = this.selectedStudent.subjects || [];
    
    // Add new subject ID if not already present
    if (!currentSubjects.includes(subject.id)) {
      const updatedSubjects = [...currentSubjects, subject.id];
      
      // Update Firestore
      studentRef.update({ subjects: updatedSubjects })
        .then(() => {
          console.log(`Subject ${subject.name} assigned to ${this.selectedStudent?.name}`);
          // Update local data
          if (this.selectedStudent) {
            this.selectedStudent.subjects = updatedSubjects;
            // Move subject from available to assigned list
            this.studentSubjects.push(subject);
            this.availableSubjects = this.availableSubjects.filter(s => s.id !== subject.id);
          }
        })
        .catch(error => {
          console.error('Error assigning subject:', error);
        });
    }
  }

  removeSubject(subject: Subject): void {
    if (!this.selectedStudent || !this.selectedStudent.docId || !subject.id) return;

    const studentRef = this.firestore.collection('users').doc(this.selectedStudent.docId);
    
    // Get current subjects array
    const currentSubjects = this.selectedStudent.subjects || [];
    
    // Remove subject ID
    const updatedSubjects = currentSubjects.filter(id => id !== subject.id);
    
    // Update Firestore
    studentRef.update({ subjects: updatedSubjects })
      .then(() => {
        console.log(`Subject ${subject.name} removed from ${this.selectedStudent?.name}`);
        // Update local data
        if (this.selectedStudent) {
          this.selectedStudent.subjects = updatedSubjects;
          this.studentSubjects = this.studentSubjects.filter(s => s.id !== subject.id);
          this.availableSubjects.push(subject);
        }
      })
      .catch(error => {
        console.error('Error removing subject:', error);
      });
  }
}