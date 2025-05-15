declare var bootstrap: any;

import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormControl } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html'
})
export class PaymentsComponent {
  searchQuery = new FormControl('');
  selectedYear = new Date().getFullYear();
  months = ['January', 'February', 'March', 'April', 'May', 'June', 
           'July', 'August', 'September', 'October', 'November', 'December'];
  users$ = this.firestore.collection('users', ref => 
    ref.where('roles.user', '==', true)).valueChanges({ idField: 'uid' });

  selectedUser: any = null;
  selectedMonth: string = '';

  constructor(private firestore: AngularFirestore, private modalService: NgbModal) {}

  // Open Payment Confirmation Dialog
  openPaymentDialog(user: any, month: string) {
    this.selectedUser = user;
    this.selectedMonth = month;
    const modalElement = document.getElementById('paymentModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Confirm and Update Payment Status
  confirmPaymentUpdate() {
    if (!this.selectedUser || !this.selectedMonth) return;
  
    const paymentPath = `payments.${this.selectedYear}.${this.selectedMonth}`;
    const newStatus = !this.selectedUser.payments?.[this.selectedYear]?.[this.selectedMonth];
  
    this.firestore.collection('users').doc(this.selectedUser.uid).update({
      [paymentPath]: newStatus
    }).then(() => {
      console.log(`✅ Payment status updated for ${this.selectedUser.name} (${this.selectedMonth}): ${newStatus ? 'Paid' : 'Unpaid'}`);
      this.closeModal(); // ✅ Close the modal after successful update
    }).catch(error => {
      console.error('❌ Error updating payment status:', error);
    });
  }

  closeModal() {
    const modalElement = document.getElementById('paymentModal');
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement); // ✅ Get existing modal instance
      if (modalInstance) {
        modalInstance.hide(); // ✅ Properly close the modal
      }
    }
  }
  
  
}
