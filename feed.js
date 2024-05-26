import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, increment, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
  const postsContainer = document.getElementById('postsContainer');
  let userLikes = JSON.parse(localStorage.getItem('userLikes')) || [];

  onAuthStateChanged(auth, user => {
    if (user) {
      loadPosts(user.uid);
    } else {
      alert('You need to be logged in to view the feed');
      window.location.href = 'index.html';
    }
  });

  async function loadPosts(userId) {
    const postsCollection = collection(db, 'posts');
    const postsQuery = query(postsCollection, orderBy('createdAt', 'desc'));

    onSnapshot(postsQuery, (snapshot) => {
      postsContainer.innerHTML = '';
      snapshot.forEach(async postDoc => {
        const post = postDoc.data();
        const postElement = document.createElement('div');
        postElement.classList.add('post-container');

        // Busca os dados do autor da postagem
        const userDoc = await getDoc(doc(db, 'users', post.userId));
        const userData = userDoc.data();

        const commentsCount = await getCommentsCount(postDoc.id);

        postElement.innerHTML = `
          <div class="post">
            <h3>Foto</h3>
            <div class="author">
              @${post.username}
            </div>
            <img src="${post.imageUrl}" alt="Post Image" class="post-image">
            <p class="post-caption">${post.caption}</p>
            <div class="interactions">
              <div class="interaction-icons">
                <img src="assets/curtida.png" alt="Like" class="like-icon">
                <span class="like-count">${post.likes || 0}</span>
                <img src="assets/comentario.png" alt="Comment" class="comment-icon">
                <span class="comment-count">${commentsCount}</span>
                <img src="assets/delete.png" alt="Delete" class="delete-icon">
              </div>
            </div>
          </div>
        `;

        if (userData && userData.profilePicUrl) {
          const authorPic = document.createElement('img');
          authorPic.src = userData.profilePicUrl;
          authorPic.alt = 'Author Profile Picture';
          postElement.querySelector('.author').prepend(authorPic);
        } else {
          // Se o autor não tiver uma imagem de perfil, use uma imagem padrão
          const defaultAuthorPic = document.createElement('img');
          defaultAuthorPic.src = 'assets/logo2.png';
          defaultAuthorPic.alt = 'Default Profile Picture';
          postElement.querySelector('.author').prepend(defaultAuthorPic);
        }

        postsContainer.appendChild(postElement);

        const likeIcon = postElement.querySelector('.like-icon');
        const likeCountElement = postElement.querySelector('.like-count');

        if (userLikes.includes(postDoc.id)) {
          likeIcon.classList.add('clicked');
          likeCountElement.classList.add('clicked');
        }

        likeIcon.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!userLikes.includes(postDoc.id)) {
            await incrementLikes(postDoc.id);
            userLikes.push(postDoc.id);
            localStorage.setItem('userLikes', JSON.stringify(userLikes));
            // Atualiza o contador de likes no DOM sem recarregar a página
            likeCountElement.textContent = parseInt(likeCountElement.textContent) + 1;
            // Adiciona a classe para efeito de neon rosa
            likeIcon.classList.add('clicked');
            likeCountElement.classList.add('clicked');
          } else {
            alert('You have already liked this post.');
          }
        });

        const deleteIcon = postElement.querySelector('.delete-icon');
        deleteIcon.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const postUserId = post.userId;
          if (userId === postUserId) {
            await deletePost(postDoc.id);
            postsContainer.removeChild(postElement); // Remove o post do DOM sem recarregar a página
          } else {
            alert("You can only delete your own posts.");
          }
        });

        const commentIcon = postElement.querySelector('.comment-icon');
        commentIcon.addEventListener('click', () => {
          openCommentModal(postDoc.id, userId);
        });
      });
    });
  }

  async function deletePost(postId) {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
  }

  async function incrementLikes(postId) {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      likes: increment(1)
    });
  }

  async function getCommentsCount(postId) {
    const commentsCollection = collection(db, `posts/${postId}/comments`);
    const commentsSnapshot = await getDocs(commentsCollection);
    return commentsSnapshot.size;
  }

  function openCommentModal(postId, userId) {
    const commentModal = document.createElement('div');
    commentModal.classList.add('comment-modal');
    commentModal.innerHTML = `
      <div class="comment-modal-content">
        <span class="close">&times;</span>
        <div class="comments-container">
          <h2>Comentários</h2>
          <div class="comments-list" id="comments-${postId}"></div>
          <textarea id="comment-input-${postId}" placeholder="Escreva um comentário..."></textarea>
          <button id="submit-comment-${postId}">Comentar</button>
        </div>
      </div>
    `;
    document.body.appendChild(commentModal);

    const closeBtn = commentModal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(commentModal);
    });

    const submitCommentBtn = commentModal.querySelector(`#submit-comment-${postId}`);
    submitCommentBtn.addEventListener('click', () => {
      submitComment(postId, userId);
    });

    loadComments(postId);
  }

  async function loadComments(postId) {
    const commentsContainer = document.getElementById(`comments-${postId}`);
    const commentsCollection = collection(db, `posts/${postId}/comments`);
    const commentsQuery = query(commentsCollection, orderBy('createdAt', 'asc'));
  
    // Verifica se já existem comentários carregados
    if (commentsContainer.dataset.loaded === 'true') {
      return; // Se sim, não carrega novamente
    }
  
    onSnapshot(commentsQuery, async (snapshot) => {
      commentsContainer.innerHTML = '';
      snapshot.forEach(async (commentDoc) => {
        const comment = commentDoc.data();
        const userDoc = await getDoc(doc(db, 'users', comment.userId));
        const userData = userDoc.data();
  
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
  
        const commentUserPic = document.createElement('img');
        commentUserPic.src = userData?.profilePicUrl || 'assets/logo2.png';
        commentUserPic.alt = 'Commenter Profile Picture';
  
        const commentContent = document.createElement('div');
        commentContent.innerText = `@${userData?.displayName || 'Anonymous'}: ${comment.text}`;
  
        commentElement.appendChild(commentUserPic);
        commentElement.appendChild(commentContent);
  
        commentsContainer.appendChild(commentElement);
      });
  
      // Define o atributo 'data-loaded' como true para indicar que os comentários foram carregados
      commentsContainer.dataset.loaded = 'true';
    });
  }
  

  async function submitComment(postId, userId) {
    const commentInput = document.getElementById(`comment-input-${postId}`);
    const commentText = commentInput.value;

    if (commentText.trim() === '') {
      alert('O comentário não pode estar vazio.');
      return;
    }

    const commentsCollection = collection(db, `posts/${postId}/comments`);
    await addDoc(commentsCollection, {
      userId,
      text: commentText,
      createdAt: serverTimestamp()
    });

    commentInput.value = ''; // Limpa o campo de texto após enviar o comentário
    loadComments(postId); // Recarrega os comentários para incluir o novo comentário
  }
});


