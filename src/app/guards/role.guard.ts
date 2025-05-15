// role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UserData } from '../models/user-data';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  // role.guard.ts
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredRole = route.data['requiredRole'] as keyof UserData['roles']; // Add type assertion
    
    return this.auth.getCurrentUserData().pipe(
      take(1),
      map(userData => {
        if (userData?.roles?.[requiredRole]) {
          return true;
        }
        return this.router.createUrlTree(['/unauthorized']);
      })
    );
  }
}