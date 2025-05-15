import { Component } from '@angular/core';
import { AuthService } from 'src/app/shared/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;

  constructor(private auth: AuthService) { }

  login() {
    if (this.loading) return;

    if (!this.email) {
      alert('Please enter email');
      return;
    }

    if (!this.validateEmail(this.email)) {
      alert('Please enter a valid email');
      return;
    }

    if (!this.password) {
      alert('Please enter password');
      return;
    }

    this.loading = true;
    this.auth.login(this.email, this.password)
      .subscribe({
        next: () => {
          this.loading = false;
          this.email = '';
          this.password = '';
        },
        error: (error) => {
          this.loading = false;
          alert(`Login failed: ${error.message}`);
        }
      });
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}