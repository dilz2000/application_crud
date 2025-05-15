// src/app/models/test-mark.ts
export interface TestMark {
    id?: string;
    testId: string;
    studentId: string;
    studentName?: string;
    subjectId: string;
    subjectName?: string;
    marks: number;
    maximumMarks: number;
    remarks?: string;
    date: Date | string;
  }