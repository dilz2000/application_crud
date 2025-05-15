import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestManagementComponent } from './test-management.component';

describe('TestManagementComponent', () => {
  let component: TestManagementComponent;
  let fixture: ComponentFixture<TestManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestManagementComponent]
    });
    fixture = TestBed.createComponent(TestManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
