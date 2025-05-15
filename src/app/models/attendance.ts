// src/app/models/attendance.ts

export interface AttendanceRecord {
    id?: string;           // Firestore document ID
    date: Date | string;   // Date of attendance
    grade: string;         // Grade (e.g., 'Grade 1')
    class: string;         // Class (e.g., 'Class A')
    studentId: string;     // Student ID 
    studentName: string;   // Student name for easier retrieval
    status: 'present' | 'absent' | 'late' | 'excused'; // Attendance status
    notes?: string;        // Optional notes about absence/late arrival
    createdBy: string;     // UID of admin who created the record
    createdAt: Date;       // Timestamp of creation
    updatedAt?: Date;      // Timestamp of last update
  }
  
  export interface AttendanceFilter {
    startDate?: Date;
    endDate?: Date;
    grade?: string;
    class?: string;
    studentId?: string;
    status?: 'present' | 'absent' | 'late' | 'excused';
  }