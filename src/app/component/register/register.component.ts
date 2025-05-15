import { Component } from '@angular/core';
import { AuthService } from 'src/app/shared/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  phone: string = '';
  password: string = '';
  confirmPassword: string = '';

  constructor(private auth: AuthService) {}

  register() {
    if (!this.validateForm()) {
      return;
    }

    this.auth.register(this.name, this.email, this.phone, this.password)
      .then(() => {
        this.resetForm();
      })
      .catch(error => {
        // Error handling already done in service
      });
  }

  private validateForm(): boolean {
    if (!this.name) {
      alert('Please enter your full name');
      return false;
    }

    if (!this.email) {
      alert('Please enter your email');
      return false;
    }

    if (!this.phone) {
      alert('Please enter your phone number');
      return false;
    }

    if (!this.validateEmail(this.email)) {
      alert('Please enter a valid email address');
      return false;
    }

    if (!this.password) {
      alert('Please enter a password');
      return false;
    }

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return false;
    }

    return true;
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private resetForm(): void {
    this.name = '';
    this.email = '';
    this.phone = '';
    this.password = '';
    this.confirmPassword = '';
  }
}