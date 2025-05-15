import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {
  transform(items: any[] | null, searchText: string | null): any[] {
    if (!items) return [];
    
    // Always filter out admins first
    const nonAdminUsers = items.filter(user => !user.roles?.admin);

    if (!searchText) return nonAdminUsers;

    const lowerSearchText = searchText.toLowerCase();
    
    return nonAdminUsers.filter(user => {
      const nameMatches = user.name?.toLowerCase().includes(lowerSearchText);
      const emailMatches = user.email?.toLowerCase().includes(lowerSearchText);
      return nameMatches || emailMatches;
    });
  }
}