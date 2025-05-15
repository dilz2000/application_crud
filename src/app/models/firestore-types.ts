// src/app/models/firestore-types.ts
import firebase from 'firebase/compat/app';

export type ServerTimestamp = firebase.firestore.FieldValue;
export type Timestamp = firebase.firestore.Timestamp;

export interface UserDataWrite {
  name: string;
  email: string;
  createdAt: ServerTimestamp;
}

export interface UserDataRead {
  name: string;
  email: string;
  createdAt: Timestamp;
}