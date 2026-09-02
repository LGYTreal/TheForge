import { getApp, getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDAlFSyDwP5MyaphPKT0_2Ys3Ol9PAe4ME",
  authDomain: "forge-projects.firebaseapp.com",
  databaseURL: "https://forge-projects-default-rtdb.firebaseio.com",
  projectId: "forge-projects",
  storageBucket: "forge-projects.firebasestorage.app",
  messagingSenderId: "524407852084",
  appId: "1:524407852084:web:b77f78df8a0c860f6ace61"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export default app;