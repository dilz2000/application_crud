import { Pipe, PipeTransform } from '@angular/core';
import { TestMark } from './models/test-mark';

@Pipe({
  name: 'markFilter'
})
export class MarkFilterPipe implements PipeTransform {
  transform(marks: TestMark[], subjectId: string, testId: string): TestMark[] {
    if (!marks) return [];

    let filteredMarks = [...marks];

    if (subjectId) {
      filteredMarks = filteredMarks.filter(mark => mark.subjectId == subjectId);
    }
    
    if (testId) {
      filteredMarks = filteredMarks.filter(mark => mark.testId == testId);
    }

    return filteredMarks;
    
  }
}