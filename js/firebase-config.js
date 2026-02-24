const firebaseConfig = {
  apiKey: "AIzaSyBvCSeB2sHE3XiP-I3esvKwazFTlZRFeCc",
  authDomain: "control-gastos-eded8.firebaseapp.com",
  projectId: "control-gastos-eded8",
  storageBucket: "control-gastos-eded8.firebasestorage.app",
  messagingSenderId: "483282533382",
  appId: "1:483282533382:web:4bfcdcc9375b411c4f9787"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Activar persistencia offline
db.enablePersistence()
  .catch(err => console.log('Error activando persistencia:', err));