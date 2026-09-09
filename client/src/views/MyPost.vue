<template>
  <Layout>
    <Nav />
    <div class="my-posts-page">
      <section class="surface post-list-panel">
      <h1 class="section-title">My posts</h1>
      <p class="section-subtitle">Check the status of the items you posted.</p>
      <div>
        <h2 class="sr-only">Posts</h2>
        <ul class="post-list">
          <li v-for="post in posts" :key="post.id" class="item-row">
            <span><strong class="block">{{ post.title }}</strong><span class="status" :class="post.status">{{ post.status }}</span><span v-if="post.exchangeEnded" class="status exchange-completed">Exchange completed</span></span>
            <div class="item-actions"><button @click="showPostDetails(post.id)" class="button-secondary">Details</button>
            <button v-if="post.status === 'noneApprove'" @click="deletePost(post.id)" class="button-danger">Delete</button></div>
          </li>
        </ul>
        <p v-if="postError" role="alert">{{ postError }} <button @click="getPosts(userId)">Retry</button></p>
      </div>
      </section>
    </div>
  </Layout>
</template>

<script>
import Layout from "../components/Layout.vue";
import axios, { assetUrl } from "../api";
import Swal from "sweetalert2";
import Nav from "../components/Nav.vue";

export default {
  components: {
    Layout,
    Nav,
  },
  data() {
    return {
      posts: [],
      offset: 0, hasNext: false, loadingPosts: false, postError: "",
      userId: "", // Added userId data property
    };
  },
  mounted() {
    const user = JSON.parse(localStorage.getItem("user")); // Parse the JSON object
    if (user && user.id) {
      this.userId = user.id; // Assign the user ID to the data property
      this.getPosts(this.userId);
    }
  },
  methods: {
    async getPosts(userId) {
      this.loadingPosts = true; this.postError = "";
      try {
        const response = await axios.get("/posts", { params: { userId, offset: this.offset, limit: 20 } });
        this.posts = response.data; this.hasNext = response.data.length === 20;
      } catch (error) {
        this.postError = "Unable to load posts. Please try again.";
      } finally { this.loadingPosts = false; }
    },
    async deletePost(postId) {
      try {
        const confirmed = await Swal.fire({
          title: "Delete Post",
          text: "Are you sure you want to delete this post?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Delete",
          cancelButtonText: "Cancel",
        });

        if (confirmed.isConfirmed) {
          await axios.delete(`/posts/${postId}/${this.userId}`); // Use the userId data property
          this.posts = this.posts.filter(post => post.id !== postId);
          Swal.fire({
            title: "Post Deleted",
            icon: "success",
          });
        }
      } catch (error) {
        console.error("Error deleting post:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to delete post",
          icon: "error",
        });
      }
    },
    async showPostDetails(postId) {
      const selectedPost = this.posts.find((post) => post.id === postId);
      if (selectedPost) {
        const imageUrls = await this.postImageUrls(selectedPost);
        const title = this.escapeHtml(selectedPost.title || "Untitled item");
        const detail = this.escapeHtml(selectedPost.detail || "No description added yet.").replace(/\n/g, "<br>");
        const status = this.escapeHtml(this.statusLabel(selectedPost.status));
        Swal.fire({
          title: "Item details",
          html: `
            ${imageUrls.length ? `<div class="exchange-post-gallery"><img class="exchange-post-detail-image" src="${imageUrls[0]}" alt="Image 1 for ${title}">${imageUrls.length > 1 ? `<div class="exchange-post-thumbnails">${imageUrls.map((url, index) => `<button type="button" class="exchange-post-thumbnail${index === 0 ? ' is-active' : ''}" data-image="${url}" aria-label="View image ${index + 1}"><img src="${url}" alt="Image ${index + 1}"></button>`).join("")}</div>` : ""}</div>` : '<div class="exchange-post-image-placeholder" aria-hidden="true">✦</div>'}
            <div class="exchange-post-detail-content">
              <span class="exchange-post-status exchange-post-status--${this.statusClass(selectedPost.status)}">${status}</span>
              <h2>${title}</h2>
              <p>${detail}</p>
            </div>`,
          showCloseButton: true,
          confirmButtonText: "Done",
          buttonsStyling: false,
          customClass: {
            popup: "exchange-post-modal",
            title: "exchange-post-modal-label",
            htmlContainer: "exchange-post-modal-body",
            confirmButton: "exchange-post-modal-confirm",
            closeButton: "exchange-post-modal-close",
          },
          didOpen: () => this.bindGalleryEvents(),
        });
      }
    },
    escapeHtml(value) {
      return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
    },
    statusLabel(status) {
      return ({ approve: "Approved", pending: "Pending review", noneApprove: "Not approved" })[status] || "Unknown status";
    },
    statusClass(status) {
      return ({ approve: "approved", pending: "pending", noneApprove: "not-approved" })[status] || "unknown";
    },
    async postImageUrls(post) {
      if (post.Images?.length) return post.Images.map(image => assetUrl(`/api/posts/${encodeURIComponent(post.id)}/images/${encodeURIComponent(image.id)}`));
      const legacyUrl = assetUrl(`/api/posts/${encodeURIComponent(post.id)}/image`);
      return await this.postImageExists(legacyUrl) ? [legacyUrl] : [];
    },
    bindGalleryEvents() {
      const modal = Swal.getHtmlContainer();
      const mainImage = modal?.querySelector(".exchange-post-detail-image");
      modal?.querySelectorAll(".exchange-post-thumbnail").forEach(button => button.addEventListener("click", () => {
        mainImage.src = button.dataset.image;
        modal.querySelectorAll(".exchange-post-thumbnail").forEach(item => item.classList.toggle("is-active", item === button));
      }));
    },
    postImageExists(url) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = url;
      });
    },
    getStatusClass(status) {
      if (status === "approve") {
        return "text-green-500";
      } else if (status === "noneApprove") {
        return "text-red-500";
      } else {
        return "";
      }
    },
  },
};
</script>

<style scoped>
/* General */
.container {
  font-family: Arial, sans-serif;
  max-width: 800px;
}

h1,
h2 {
  color: #1E4F79;
}

button {
  transition: background 0.3s ease-in-out;
}

button:hover {
  cursor: pointer;
}

/* Posts section */
ul.post-list {
  display: block;
}

li.flex.items-center.mb-2 {
  justify-content: space-between;
  padding: 10px;
  border-radius: 5px;
  margin-right: 10px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

button.bg-blue-500 {
  background: #1E4F79;
}

button.bg-blue-500:hover {
  background: #325d92;
}

button.bg-green-500 {
  background: #47D49D;
}

button.bg-green-500:hover {
  background: #5ED6A9;
}

button.bg-red-500 {
  background: #FF5A5A;
}

button.bg-red-500:hover {
  background: #FF7878;
}

.text-green-500 {
  color: #47D49D;
}

.text-red-500 {
  color: #FF5A5A;
}

:global(.post-detail-image) {
  max-width: min(420px, 80vw);
  max-height: 300px;
  object-fit: contain;
}
</style>
