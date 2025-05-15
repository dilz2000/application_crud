import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffManagementComponent } from './staff-management.component';

describe('StaffManagementComponent', () => {
  let component: StaffManagementComponent;
  let fixture: ComponentFixture<StaffManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StaffManagementComponent]
    });
    fixture = TestBed.createComponent(StaffManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
