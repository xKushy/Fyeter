// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, updateDoc, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Your web app's Firebase configuration
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
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const postForm = document.getElementById('postForm');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const authContainer = document.getElementById('authContainer');
  const postFormContainer = document.getElementById('postFormContainer');
  const postContainer = document.getElementById('postContainer');

  // Função para enviar notificação
  const sendNotification = (userId, notificationData) => {
    // Aqui você deve usar a biblioteca ou SDK do Firebase para enviar a notificação
    // Exemplo: admin.messaging().sendToDevice(userId, notificationData);
  }

  // Registro de Usuário
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const displayName = document.getElementById('registerName').value;

    // Criar usuário com e-mail e senha
    createUserWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        const user = userCredential.user;

        // Atualizar perfil com o displayName fornecido
        return updateProfile(user, {
          displayName: displayName
        });
      })
      .then(() => {
        // Criar um documento para o usuário na coleção "users"
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        setDoc(userDocRef, {
          displayName: displayName,
          email: email,
          createdAt: serverTimestamp(),
          profilePicUrl: '', // Adicione esta linha para armazenar a URL da imagem de perfil
          uid: auth.currentUser.uid // Salva o UID do usuário no documento
        });

        console.log('User registered with displayName:', displayName);
        alert('Registered successfully. Please log in.');
        window.location.href = 'feed.html';
      })
      .catch(error => {
        console.error('Error registering user:', error);
        alert('Error registering user: ' + error.message);
      });
  });

  // Login de Usuário
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        console.log('User logged in:', userCredential.user);
        window.location.href = 'feed.html';
      })
      .catch(error => {
        console.error('Error logging in user:', error);
        alert('Error logging in user: ' + error.message);
      });
  });

  // Estado de Autenticação
  onAuthStateChanged(auth, user => {
    if (user) {
      console.log('User is logged in:', user);

      // Verifica se o usuário já está cadastrado na coleção "users"
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then(docSnapshot => {
        if (docSnapshot.exists()) {
          console.log('User is already registered in the users collection');
        } else {
          // Se o usuário ainda não estiver cadastrado, adiciona-o à coleção "users"
          setDoc(userDocRef, {
            displayName: user.displayName || 'Anonymous',
            email: user.email,
            createdAt: serverTimestamp(),
            profilePicUrl: '', // Adicione esta linha para armazenar a URL da imagem de perfil
            uid: user.uid // Salva o UID do usuário no documento
          }).then(() => {
            console.log('User registered in the users collection');
          }).catch(error => {
            console.error('Error registering user in the users collection:', error);
          });
        }
      }).catch(error => {
        console.error('Error checking if user is registered in the users collection:', error);
      });

      authContainer.style.display = 'none';
      postFormContainer.style.display = 'block';
      loginButton.style.display = 'none';
      logoutButton.style.display = 'block';
      loadPosts();
    } else {
      console.log('No user is logged in');
      authContainer.style.display = 'block';
      postFormContainer.style.display = 'none';
      loginButton.style.display = 'block';
      logoutButton.style.display = 'none';
      postContainer.innerHTML = '';
    }
  });

  // Logout de Usuário
  logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
      console.log('User logged out');
      window.location.href = 'index.html';
    }).catch(error => {
      console.error('Error logging out:', error);
      alert('Error logging out: ' + error.message);
    });
  });

  // Upload de Imagens e Criação de Postagens
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('upload-file').files[0];
    const text = document.getElementById('post-caption').value;

    if (file && text) {
      // Verifica se o arquivo é uma imagem
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      // Redimensiona a imagem para um tamanho padrão
      const resizedImage = await resizeImage(file);

      const storageRef = ref(storage, `posts/${resizedImage.name}`);
      uploadBytes(storageRef, resizedImage)
        .then(() => {
          console.log('File uploaded');
          return getDownloadURL(storageRef);
        })
        .then(url => {
          return addDoc(collection(db, 'posts'), {
            imageUrl: url,
            caption: text,
            username: auth.currentUser.displayName,
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            likes: 0
          });
        })
        .then((docRef) => {
          console.log('Post created with ID:', docRef.id);

          // Enviar notificação para todos os usuários
          const notificationData = {
            notification: {
              title: 'New Post',
              body: `${auth.currentUser.displayName} just posted a new photo.`,
              click_action: 'https://yourapp.com/feed.html'
            }
          };
          sendNotificationToAllUsers(notificationData);

          window.location.href = 'feed.html';
        })
        .catch(error => {
          console.error('Error creating post:', error);
          alert('Error creating post: ' + error.message);
        });
    } else {
      alert('Please select a file and write a caption.');
    }
  });

  // Função para redimensionar a imagem
  async function resizeImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Define as dimensões padrão para redes sociais (por exemplo, 1200x1200 pixels)
          const maxWidth = 1200;
          const maxHeight = 1200;

          let width = img.width;
          let height = img.height;

          // Redimensiona a imagem proporcionalmente
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Desenha a imagem redimensionada no canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Converte o canvas de volta para um Blob
          canvas.toBlob((blob) => {
            const resizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            resolve(resizedFile);
          }, 'image/jpeg', 0.9);
        };
      };
      reader.readAsDataURL(file);
    });
  }

  // Enviar notificação para todos os usuários
  const sendNotificationToAllUsers = (notificationData) => {
    // Aqui você deve recuperar todos os IDs de usuário da coleção "users" e enviar uma notificação para cada um
    // Exemplo: db.collection('users').get().then(querySnapshot => {...});
    // Dentro do .then(), você deve iterar sobre querySnapshot.docs e enviar uma notificação para cada usuário
  }

  // Carregar Postagens
  function loadPosts() {
    const postsCollection = collection(db, 'posts');
    onSnapshot(postsCollection, (snapshot) => {
      postContainer.innerHTML = '';
      snapshot.forEach(doc => {
        const post = doc.data();
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
          <div class="post">
            <img src="${post.imageUrl}" alt="Post Image" class="post-image">
            <p class="post-caption">${post.caption}</p> <!-- Use 'caption' ao invés de 'text' -->
            <span>@${post.username}</span>
            <div class="post-actions">
              <button class="like-button">Like</button>
              <span class="like-count">${post.likes} likes</span>
            </div>
            <div class="comment-section">
              <h3>Comments</h3>
              <div class="comments" id="comments-${doc.id}"></div>
              <div class="comment-form">
                <textarea id="comment-input-${doc.id}" placeholder="Add a comment"></textarea>
                <button class="add-comment-button" data-post-id="${doc.id}">Post</button>
              </div>
            </div>
          </div>
        `;
        const likeButton = postElement.querySelector('.like-button');
        const likeCount = postElement.querySelector('.like-count');
        const addCommentButton = postElement.querySelector('.add-comment-button');
        
        likeButton.addEventListener('click', () => {
          const postRef = doc(db, 'posts', doc.id);
          getDoc(postRef).then((docSnap) => {
            if (docSnap.exists()) {
              const currentLikes = docSnap.data().likes || 0;
              updateDoc(postRef, { likes: currentLikes + 1 });
              likeCount.textContent = `${currentLikes + 1} likes`;
            }
          });
        });

        addCommentButton.addEventListener('click', () => {
          const commentInput = document.getElementById(`comment-input-${doc.id}`);
          const commentText = commentInput.value;
          if (commentText.trim()) {
            const postRef = doc(db, 'posts', doc.id);
            const commentsCollection = collection(postRef, 'comments');
            addDoc(commentsCollection, {
              text: commentText,
              username: auth.currentUser.displayName,
              createdAt: serverTimestamp()
            }).then(() => {
              commentInput.value = '';
              loadComments(doc.id);
            }).catch(error => {
              console.error('Error adding comment:', error);
            });
          }
        });

        postContainer.appendChild(postElement);
        loadComments(doc.id);
      });
    });
  }

  // Carregar Comentários
  function loadComments(postId) {
    const postRef = doc(db, 'posts', postId);
    const commentsCollection = collection(postRef, 'comments');
    const commentsContainer = document.getElementById(`comments-${postId}`);
    onSnapshot(commentsCollection, (snapshot) => {
      commentsContainer.innerHTML = '';
      snapshot.forEach(doc => {
        const comment = doc.data();
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        commentElement.innerHTML = `
          <div class="comment-content">
            <span>@${comment.username}</span>
            <p>${comment.text}</p>
          </div>
        `;
        commentsContainer.appendChild(commentElement);
      });
    });
  }
});

