import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { FormControl, FormGroup, FormArray, Validators, FormBuilder } from '@angular/forms';
import { TeacherData } from 'src/app/models/teacher-data';

@Component({
  selector: 'app-staff-management',
  templateUrl: './staff-management.component.html',
  styleUrls: ['./staff-management.component.css']
})
export class StaffManagementComponent implements OnInit {
  teachers$: Observable<TeacherData[]>;
  searchTeacher = new FormControl('');
  showAddTeacherModal = false;
  
  // Form for adding a new teacher
  teacherForm = new FormGroup({
    name: new FormControl('', Validators.required),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
    address: new FormControl('', Validators.required),
    subjects: new FormArray([]),
    joiningDate: new FormControl('', Validators.required)
  });

  constructor(private firestore: AngularFirestore, private fb: FormBuilder) {
    // Fetch all teachers
    this.teachers$ = this.firestore.collection<TeacherData>('teachers')
      .valueChanges({ idField: 'docId' })
      .pipe(startWith([]));
  }

  ngOnInit(): void {
    // Add one subject field by default
    this.addSubjectField();
  }

  // Filter teachers based on search query
  filterTeachers(teachers: TeacherData[] | null | undefined, query: string | null | undefined): TeacherData[] {
    if (!teachers) return [];
    const searchQuery = (query ?? '').trim().toLowerCase();

    if (!searchQuery) return teachers;

    return teachers.filter(teacher =>
      (teacher.name?.toLowerCase() || '').includes(searchQuery) ||
      (teacher.phone?.toLowerCase() || '').includes(searchQuery) ||
      (teacher.address?.toLowerCase() || '').includes(searchQuery)
    );
  }

  // Open add teacher modal
  openAddTeacherModal(): void {
    this.resetForm();
    this.showAddTeacherModal = true;
  }

  // Close add teacher modal
  closeAddTeacherModal(): void {
    this.showAddTeacherModal = false;
  }

  // Reset form
  resetForm(): void {
    this.teacherForm.reset();
    // Clear subjects FormArray
    const subjectsArray = this.teacherForm.get('subjects') as FormArray;
    while (subjectsArray.length !== 0) {
      subjectsArray.removeAt(0);
    }
    // Add at least one subject field
    this.addSubjectField();
  }

  // Get subjects form array
  get subjectsFormArray(): FormArray {
    return this.teacherForm.get('subjects') as FormArray;
  }

  // Add subject field
  addSubjectField(): void {
    const subjectsArray = this.teacherForm.get('subjects') as FormArray;
    subjectsArray.push(new FormControl('', Validators.required));
  }

  // Remove subject field
  removeSubjectField(index: number): void {
    const subjectsArray = this.teacherForm.get('subjects') as FormArray;
    if (subjectsArray.length > 1) {
      subjectsArray.removeAt(index);
    }
  }

  // Get subject values
  getSubjects(): string[] {
    const subjects: string[] = [];
    const subjectsArray = this.teacherForm.get('subjects') as FormArray;
    
    subjectsArray.controls.forEach((control) => {
      const value = control.value.trim();
      if (value) {
        subjects.push(value);
      }
    });
    
    return subjects;
  }

  // Generate teacher ID
  generateTeacherID(): string {
    const prefix = 'TCH';
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    
    return `${prefix}-${year}-${randomNum}`;
  }

  // Add new teacher
  addTeacher(): void {
    if (this.teacherForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.teacherForm.controls).forEach(key => {
        const control = this.teacherForm.get(key);
        control?.markAsTouched();
      });
      
      // Mark all subject fields as touched
      const subjectsArray = this.teacherForm.get('subjects') as FormArray;
      subjectsArray.controls.forEach(control => {
        control.markAsTouched();
      });
      
      return;
    }

    const subjects = this.getSubjects();
    
    // Check if at least one subject is provided
    if (subjects.length === 0) {
      alert('Please add at least one subject');
      return;
    }

    const teacherData: TeacherData = {
      tid: this.generateTeacherID(),
      name: this.teacherForm.get('name')?.value || '',
      phone: this.teacherForm.get('phone')?.value || '',
      address: this.teacherForm.get('address')?.value || '',
      subjects: subjects,
      joiningDate: this.teacherForm.get('joiningDate')?.value || ''
    };

    // Add new teacher to Firestore
    this.firestore.collection('teachers').add(teacherData)
      .then(() => {
        console.log('Teacher added successfully');
        this.closeAddTeacherModal();
      })
      .catch(error => {
        console.error('Error adding teacher:', error);
      });
  }

  // Delete teacher
  deleteTeacher(docId: string): void {
    if (confirm('Are you sure you want to delete this teacher?')) {
      this.firestore.collection('teachers').doc(docId).delete()
        .then(() => {
          console.log('Teacher deleted successfully');
        })
        .catch(error => {
          console.error('Error deleting teacher:', error);
        });
    }
  }
}