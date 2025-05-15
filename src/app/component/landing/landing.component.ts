import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

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
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  activeTab: 'news' | 'offers' = 'news';
  news$: Observable<UpdateItem[]>;
  offers$: Observable<UpdateItem[]>;
  
  constructor(private firestore: AngularFirestore) {
    // Fetch news items, ordered by date (most recent first), limit to 3
    this.news$ = this.firestore.collection<UpdateItem>('news', ref => 
      ref.orderBy('date', 'desc').limit(3)
    ).valueChanges({ idField: 'id' });
    
    // Fetch offers, ordered by validUntil date, limit to 3
    this.offers$ = this.firestore.collection<UpdateItem>('offers', ref => 
      ref.orderBy('validUntil', 'desc').limit(3)
    ).valueChanges({ idField: 'id' });
  }

  ngOnInit(): void {
  }
  
  // Switch between news and offers tabs
  setActiveTab(tab: 'news' | 'offers'): void {
    this.activeTab = tab;
  }
}
