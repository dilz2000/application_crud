// src/app/models/user-data.ts
import firebase from 'firebase/compat/app';

export interface UserData {
  docId?: string;
  sid: string,
  name: string;
  email: string;
  phone: string;
  attendance?: { [date: string]: boolean };
  status: 'pending' | 'active' ;
  grade?: string;
  class?: string;
  medium?: string;
  subjects?: string[];
  roles: { 
    admin?: boolean;
    user?: boolean;
  };
  payments?: {
    [year: string]: {
      [month: string]: boolean;
    };
  };
  //createdAt: firebase.firestore.Timestamp | firebase.firestore.FieldValue;
}