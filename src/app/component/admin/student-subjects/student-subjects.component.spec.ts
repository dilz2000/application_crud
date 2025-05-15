import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentSubjectsComponent } from './student-subjects.component';

describe('StudentSubjectsComponent', () => {
  let component: StudentSubjectsComponent;
  let fixture: ComponentFixture<StudentSubjectsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StudentSubjectsComponent]
    });
    fixture = TestBed.createComponent(StudentSubjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
