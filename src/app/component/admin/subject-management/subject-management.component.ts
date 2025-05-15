import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Subject } from 'src/app/models/subject';

@Component({
  selector: 'app-subject-management',
  templateUrl: './subject-management.component.html',
  styleUrls: ['./subject-management.component.css']
})
export class SubjectManagementComponent implements OnInit {
  subjectForm: FormGroup;
  subjects$: Observable<Subject[]>;
  availableGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
  selectedGradeFilter: string = '';
  editingSubject: Subject | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore
  ) {
    this.subjectForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      gradeLevel: ['', [Validators.required]]
    });

    this.subjects$ = this.firestore.collection<Subject>('subjects').valueChanges({ idField: 'id' });
  }

  ngOnInit(): void {
    // Initialize with all subjects
    this.filterSubjectsByGrade('');
  }

  filterSubjectsByGrade(grade: string): void {
    this.selectedGradeFilter = grade;
    
    if (grade) {
      this.subjects$ = this.firestore.collection<Subject>('subjects', 
        ref => ref.where('gradeLevel', '==', grade))
        .valueChanges({ idField: 'id' });
    } else {
      this.subjects$ = this.firestore.collection<Subject>('subjects')
        .valueChanges({ idField: 'id' });
    }
  }

  addSubject(): void {
    if (this.subjectForm.invalid) {
      return;
    }

    const subject: Subject = {
      name: this.subjectForm.value.name,
      code: this.subjectForm.value.code,
      gradeLevel: this.subjectForm.value.gradeLevel
    };

    if (this.editingSubject && this.editingSubject.id) {
      // Update existing subject
      this.firestore.collection('subjects').doc(this.editingSubject.id).update(subject)
        .then(() => {
          console.log('Subject updated successfully');
          this.resetForm();
        })
        .catch(error => {
          console.error('Error updating subject:', error);
        });
    } else {
      // Add new subject
      this.firestore.collection('subjects').add(subject)
        .then(() => {
          console.log('Subject added successfully');
          this.resetForm();
        })
        .catch(error => {
          console.error('Error adding subject:', error);
        });
    }
  }

  editSubject(subject: Subject): void {
    this.editingSubject = subject;
    this.subjectForm.patchValue({
      name: subject.name,
      code: subject.code,
      gradeLevel: subject.gradeLevel
    });
  }

  deleteSubject(id: string): void {
    if (confirm('Are you sure you want to delete this subject?')) {
      this.firestore.collection('subjects').doc(id).delete()
        .then(() => {
          console.log('Subject deleted successfully');
        })
        .catch(error => {
          console.error('Error deleting subject:', error);
        });
    }
  }

  resetForm(): void {
    this.subjectForm.reset();
    this.editingSubject = null;
  }
}