// Importa as funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBtl0-XaZO-iYCpUuPvLrNYdv-0PeQbsKM",
    authDomain: "eternity-bbab1.firebaseapp.com",
    projectId: "eternity-bbab1",
    storageBucket: "eternity-bbab1.appspot.com",
    messagingSenderId: "795703593856",
    appId: "1:795703593856:web:938fec7825250cdc66cf65",
    measurementId: "G-1Y3R582RXZ"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    const profilePic = document.getElementById('profilePic');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const bio = document.getElementById('bio');
    const postsContainer = document.getElementById('postsContainer');
    const postsCount = document.getElementById('postsCount');
    const editProfileForm = document.getElementById('editProfileForm');
    const newBioInput = document.getElementById('newBio');

    let currentUser = null;

    // Verifica se o usuário está logado
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            // Atualiza o nome de usuário na tela HTML
            if (username) {
                username.textContent = `@${user.displayName}`;
            }
            if (email) {
                email.textContent = user.email;
            }
            loadProfile(user.uid);
            loadPosts(user.uid);
        } else {
            // Redireciona para a página de login se o usuário não estiver logado
            window.location.href = 'index.html';
        }
    });

    // Carrega os dados do perfil do usuário
    async function loadProfile(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (bio) {
                    bio.textContent = userData.bio || '';
                }
                if (userData.profilePicUrl) {
                    profilePic.src = userData.profilePicUrl;
                } else {
                    // Exibe a imagem de espaço reservado se a foto de perfil não estiver definida
                    profilePic.src = '/assets/logo2.png';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
        }
    }

    // Carrega as publicações do usuário
    async function loadPosts(userId) {
        try {
            const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
            const querySnapshot = await getDocs(postsQuery);
            const posts = [];
            querySnapshot.forEach(doc => {
                posts.push(doc.data());
            });
            if (postsCount) {
                postsCount.textContent = `${posts.length} publicações`;
            }
            displayPosts(posts);
        } catch (error) {
            console.error('Erro ao carregar publicações:', error);
        }
    }

    // Exibe as publicações na página
    function displayPosts(posts) {
        if (postsContainer) {
            postsContainer.innerHTML = '';
            posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                const postImg = document.createElement('img');
                postImg.src = post.imageUrl;
                postImg.alt = 'Publicação';
                postElement.appendChild(postImg);
                postsContainer.appendChild(postElement);
            });
        }
    }

    // Adiciona evento de clique no botão de editar perfil
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            // Redireciona para a página de edição de perfil
            window.location.href = 'edit-profile.html';
        });
    }

    // Adiciona evento de envio do formulário de edição de perfil
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita o envio padrão do formulário

            // Obtém o valor do campo de biografia do formulário
            const newBio = newBioInput.value;

            // Atualiza a biografia no Firestore
            try {
                await updateDoc(doc(db, 'users', currentUser.uid), { bio: newBio });
                // Atualiza dinamicamente a biografia no perfil do usuário
                if (bio) {
                    bio.textContent = newBio;
                }
                console.log('Biografia atualizada com sucesso!');
            } catch (error) {
                console.error('Erro ao atualizar biografia:', error);
            }
        });
    }
});
