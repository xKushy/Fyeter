import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBtl0-XaZO-iYCpUuPvLrNYdv-0PeQbsKM",
    authDomain: "eternity-bbab1.firebaseapp.com",
    projectId: "eternity-bbab1",
    storageBucket: "eternity-bbab1.appspot.com",
    messagingSenderId: "795703593856",
    appId: "1:795703593856:web:938fec7825250cdc66cf65",
    measurementId: "G-1Y3R582RXZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    const newProfilePicInput = document.getElementById('newProfilePic');
    const newProfilePicImage = document.getElementById('newProfilePicImage');

    // Adicionar evento de clique à imagem
    newProfilePicImage.addEventListener('click', () => {
        newProfilePicInput.click(); // Acionar o clique no input file ao clicar na imagem
    });

    const editProfileForm = document.getElementById('editProfileForm');
    const newBioInput = document.getElementById('newBio');

    let currentUser = null;

    // Check if user is logged in
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
        } else {
            // Redirect to login page if user is not logged in
            window.location.href = 'login.html';
        }
    });

    // Add submit event listener to the edit profile form
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission behavior

        const newBio = newBioInput.value; // Get the value of the new bio
        const newProfilePic = newProfilePicInput.files[0]; // Get the selected profile picture file

        try {
            // Upload new profile picture if selected
            let profilePicUrl = currentUser.photoURL; // Default to current profile picture URL
            if (newProfilePic) {
                const storageRef = ref(storage, `profile_pics/${currentUser.uid}/${newProfilePic.name}`);
                await uploadBytes(storageRef, newProfilePic);
                profilePicUrl = await getDownloadURL(storageRef);
            }

            // Update user data in Firestore
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                await updateDoc(userDocRef, {
                    bio: newBio,
                    profilePicUrl: profilePicUrl
                });
            } else {
                console.error('User document not found');
            }

            // Redirect to profile page after successful update
            window.location.href = 'profile.html';
        } catch (error) {
            console.error('Error updating profile:', error);
            // Handle error
        }
    });
});
