export interface Test {
    id?: string;
    name: string;
    description?: string;
    classId: string;
    className?: string;
    gradeId: string;
    gradeName?: string;
    date: Date | string;
    subjects: string[]; // Array of subject IDs included in the test
    status: 'upcoming' | 'ongoing' | 'completed';
  }