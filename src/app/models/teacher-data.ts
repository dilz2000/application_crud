// src/app/models/teacher-data.ts
export interface TeacherData {
    docId?: string;
    tid?: string;  // Teacher ID
    name: string;
    phone: string;
    address: string;
    subjects: string[];
    joiningDate: string;
  }