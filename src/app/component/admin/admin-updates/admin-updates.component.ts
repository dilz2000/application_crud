import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

interface UpdateItem {
  id?: string;
  title: string;
  description: string;
  content?: string;
  date?: string;
  validUntil?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-admin-updates',
  templateUrl: './admin-updates.component.html',
  styleUrls: ['./admin-updates.component.css']
})
export class AdminUpdatesComponent implements OnInit {
  activeTab = new FormControl('news');
  news$: Observable<UpdateItem[]>;
  offers$: Observable<UpdateItem[]>;

  // Form data
  newsForm: FormGroup;
  offerForm: FormGroup;
  
  // For image handling
  imageFile: File | null = null;
  imagePreview: string | null = null;
  
  // For edit mode
  editMode = false;
  currentItemId: string | null | undefined = null;

  // ImgBB API key
  private readonly IMGBB_API_KEY = '97c30984e171c48da6935866b7c4a261';

  constructor(private firestore: AngularFirestore, private http: HttpClient) {
    // Initialize Firestore collections
    this.news$ = this.firestore.collection<UpdateItem>('news', ref => 
      ref.orderBy('date', 'desc')
    ).valueChanges({ idField: 'id' });
    
    this.offers$ = this.firestore.collection<UpdateItem>('offers', ref => 
      ref.orderBy('validUntil', 'desc')
    ).valueChanges({ idField: 'id' });

    // Initialize forms
    this.newsForm = new FormGroup({
      title: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      content: new FormControl(''),
      date: new FormControl(this.formatDate(new Date()))
    });

    this.offerForm = new FormGroup({
      title: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      validUntil: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
  }

  // Format date for date input field (YYYY-MM-DD)
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Handle image input changes
  handleImageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      const reader = new FileReader();
      
      reader.onloadend = () => {
        this.imagePreview = reader.result as string;
      };
      
      reader.readAsDataURL(file);
    }
  }

  // Function to upload the image to ImgBB
  uploadImageToImgBB(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post(
      `https://api.imgbb.com/1/upload?key=${this.IMGBB_API_KEY}`,
      formData
    );
  }

  // Reset forms and state
  resetForms(): void {
    this.newsForm.reset({
      date: this.formatDate(new Date())
    });
    this.offerForm.reset();
    this.imageFile = null;
    this.imagePreview = null;
    this.editMode = false;
    this.currentItemId = null;
  }

  // Add or Update News Item
  saveNews(): void {
    if (!this.newsForm.valid) {
      alert('Please fill in all required fields');
      return;
    }

    const newNews: UpdateItem = {
      title: this.newsForm.value.title,
      description: this.newsForm.value.description,
      content: this.newsForm.value.content || '',
      date: new Date(this.newsForm.value.date).toLocaleDateString("en-US", { 
        month: "long", day: "numeric", year: "numeric" 
      }),
      imageUrl: ''
    };

    const saveNewsItem = (item: UpdateItem) => {
      if (this.editMode && this.currentItemId) {
        this.firestore.collection('news').doc(this.currentItemId).update(item)
          .then(() => {
            this.resetForms();
            alert('News item updated successfully!');
          })
          .catch(error => {
            console.error('Error updating news item:', error);
            alert('Error updating news item');
          });
      } else {
        this.firestore.collection('news').add(item)
          .then(() => {
            this.resetForms();
            alert('News item added successfully!');
          })
          .catch(error => {
            console.error('Error adding news item:', error);
            alert('Error adding news item');
          });
      }
    };

    if (this.imageFile) {
      this.uploadImageToImgBB(this.imageFile).subscribe({
        next: (response) => {
          if (response?.data?.url) {
            newNews.imageUrl = response.data.url;
            saveNewsItem(newNews);
          } else {
            alert('Image upload failed');
          }
        },
        error: (error) => {
          console.error('Error uploading image:', error);
          alert('Error uploading image');
        }
      });
    } else if (this.editMode && !this.imagePreview) {
      // Keep existing image URL if in edit mode and no new image selected
      this.firestore.collection('news').doc(this.currentItemId!).get().subscribe(doc => {
        if (doc.exists) {
          const data = doc.data() as UpdateItem;
          newNews.imageUrl = data.imageUrl || '';
          saveNewsItem(newNews);
        }
      });
    } else {
      saveNewsItem(newNews);
    }
  }

  // Add or Update Offer Item
  saveOffer(): void {
    if (!this.offerForm.valid) {
      alert('Please fill in all required fields');
      return;
    }

    const newOffer: UpdateItem = {
      title: this.offerForm.value.title,
      description: this.offerForm.value.description,
      validUntil: new Date(this.offerForm.value.validUntil).toLocaleDateString("en-US", { 
        month: "long", day: "numeric", year: "numeric" 
      }),
      imageUrl: ''
    };

    const saveOfferItem = (item: UpdateItem) => {
      if (this.editMode && this.currentItemId) {
        this.firestore.collection('offers').doc(this.currentItemId).update(item)
          .then(() => {
            this.resetForms();
            alert('Offer item updated successfully!');
          })
          .catch(error => {
            console.error('Error updating offer item:', error);
            alert('Error updating offer item');
          });
      } else {
        this.firestore.collection('offers').add(item)
          .then(() => {
            this.resetForms();
            alert('Offer item added successfully!');
          })
          .catch(error => {
            console.error('Error adding offer item:', error);
            alert('Error adding offer item');
          });
      }
    };

    if (this.imageFile) {
      this.uploadImageToImgBB(this.imageFile).subscribe({
        next: (response) => {
          if (response?.data?.url) {
            newOffer.imageUrl = response.data.url;
            saveOfferItem(newOffer);
          } else {
            alert('Image upload failed');
          }
        },
        error: (error) => {
          console.error('Error uploading image:', error);
          alert('Error uploading image');
        }
      });
    } else if (this.editMode && !this.imagePreview) {
      // Keep existing image URL if in edit mode and no new image selected
      this.firestore.collection('offers').doc(this.currentItemId!).get().subscribe(doc => {
        if (doc.exists) {
          const data = doc.data() as UpdateItem;
          newOffer.imageUrl = data.imageUrl || '';
          saveOfferItem(newOffer);
        }
      });
    } else {
      saveOfferItem(newOffer);
    }
  }

  // Edit News Item
  editNews(item: UpdateItem): void {
    this.editMode = true;
    this.currentItemId = item.id;
    
    // Parse date from string format to date input format
    const dateParts = item.date?.split(' ') || [];
    let dateObj = new Date();
    if (dateParts.length >= 3) {
      const month = new Date(Date.parse(`${dateParts[0]} 1, 2000`)).getMonth();
      const day = parseInt(dateParts[1].replace(',', ''));
      const year = parseInt(dateParts[2]);
      dateObj = new Date(year, month, day);
    }

    this.newsForm.patchValue({
      title: item.title,
      description: item.description,
      content: item.content || '',
      date: this.formatDate(dateObj)
    });

    this.imagePreview = item.imageUrl || null;
    this.activeTab.setValue('news');
  }

  // Edit Offer Item
  editOffer(item: UpdateItem): void {
    this.editMode = true;
    this.currentItemId = item.id;
    
    // Parse date from string format to date input format
    const dateParts = item.validUntil?.split(' ') || [];
    let dateObj = new Date();
    if (dateParts.length >= 3) {
      const month = new Date(Date.parse(`${dateParts[0]} 1, 2000`)).getMonth();
      const day = parseInt(dateParts[1].replace(',', ''));
      const year = parseInt(dateParts[2]);
      dateObj = new Date(year, month, day);
    }

    this.offerForm.patchValue({
      title: item.title,
      description: item.description,
      validUntil: this.formatDate(dateObj)
    });

    this.imagePreview = item.imageUrl || null;
    this.activeTab.setValue('offers');
  }

  // Delete News Item
  deleteNews(id: string | undefined): void {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this news item?')) {
      this.firestore.collection('news').doc(id).delete()
        .then(() => {
          alert('News item deleted successfully!');
        })
        .catch(error => {
          console.error('Error deleting news item:', error);
          alert('Error deleting news item');
        });
    }
  }

  // Delete Offer Item
  deleteOffer(id: string | undefined): void {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this offer?')) {
      this.firestore.collection('offers').doc(id).delete()
        .then(() => {
          alert('Offer deleted successfully!');
        })
        .catch(error => {
          console.error('Error deleting offer:', error);
          alert('Error deleting offer');
        });
    }
  }

  // Cancel editing and reset forms
  cancelEdit(): void {
    this.resetForms();
  }
}