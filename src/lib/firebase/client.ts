import { initializeFirebase } from '@/firebase';

const { firebaseApp: app, auth, firestore: db } = initializeFirebase();

export { app, auth, db };
