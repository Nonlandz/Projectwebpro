<template>
  <Layout>
    <Nav />
    <div class="admin-page">
      <section class="surface admin-panel">
        <h1 class="section-title">Moderation</h1>
        <p class="section-subtitle">Review posts and manage categories.</p>
        <div class="flex gap-2">
          <input v-model="tagName" placeholder="New category" @keyup.enter="addTag" />
          <button @click="addTag" class="button-primary whitespace-nowrap">Add category</button>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          <span v-for="tag in tags" :key="tag.id" class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
            {{ tag.name }}<button @click="deleteTag(tag.id)" class="material-icons-outlined text-base text-slate-500 hover:text-red-600" :aria-label="`Delete ${tag.name}`">close</button>
          </span>
        </div>
      </section>

      <section class="surface admin-panel mt-5">
        <h2 class="section-title text-xl">Category requests</h2>
        <button class="button-secondary mt-2" @click="loadCategoryRequests">Refresh requests</button>
        <p v-if="categoryError" role="alert">{{ categoryError }}</p>
        <p v-if="!categoryRequests.length && !categoryError" class="section-subtitle">No pending requests.</p>
        <ul>
          <li v-for="request in categoryRequests" :key="request.id" class="item-row">
            <div><strong>{{ request.name }}</strong><p class="text-sm text-slate-500">Requested by {{ request.User?.UserInfo?.firstName || 'Member' }} {{ request.User?.UserInfo?.lastName || '' }}</p></div>
            <div class="item-actions">
              <button class="button-primary" :disabled="reviewingCategory === request.id" @click="reviewCategory(request, 'approved')">Approve</button>
              <button class="button-secondary" :disabled="reviewingCategory === request.id" @click="reviewCategory(request, 'rejected')">Reject</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="surface admin-panel mt-5">
        <div class="flex items-baseline justify-between gap-4"><h2 class="section-title text-xl">Posts</h2><span class="text-sm text-slate-500">{{ posts.length }} shown</span></div>
        <ul class="post-list">
          <li v-for="post in posts" :key="post.id" class="item-row">
            <span><strong class="block">{{ post.title }}</strong><span class="status" :class="post.status">{{ post.status }}</span><span v-if="post.exchangeEnded" class="status exchange-completed">Exchange completed</span></span>
            <div class="item-actions">
            <template v-if="post.status === 'pending'">
              <button @click="approvePost(post.id)" class="button-primary">Approve</button><button @click="noneApprovePost(post.id)" class="button-secondary">Reject</button>
            </template>
            <template v-else-if="post.status === 'approve'">
              <button @click="noneApprovePost(post.id)" class="button-secondary">Reject</button>
            </template>
            <template v-else>
              <button @click="approvePost(post.id)" class="button-primary">Approve</button>
            </template>
            <button @click="showPostDetails(post)" class="button-secondary">Details</button>
            </div>
          </li>
        </ul>
        <p v-if="postError" role="alert">{{ postError }} <button @click="getPosts()">Retry</button></p>
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
      tagName: "",
      tags: [],
      categoryRequests: [], categoryError: '', reviewingCategory: null,
      posts: [],
      offset: 0, hasNext: false, loadingPosts: false, postError: "",
      selectedPost: null, // Track the selected post
    };
  },
  mounted() {
    this.checkAdmin();
    this.getTags();
    this.loadCategoryRequests();
    this.getPosts();
  },
  methods: {
    async loadCategoryRequests() {
      try { this.categoryError = ''; const { data } = await axios.get('/tags/requests'); this.categoryRequests = data; }
      catch { this.categoryError = 'Unable to load requests. Please refresh.'; }
    },
    async reviewCategory(request, status) {
      if (this.reviewingCategory) return;
      this.reviewingCategory = request.id;
      try {
        await axios.put(`/tags/requests/${request.id}`, { status });
        await Promise.all([this.loadCategoryRequests(), this.getTags()]);
      } catch (error) { this.categoryError = error.response?.data?.message || 'Unable to review request.'; }
      finally { this.reviewingCategory = null; }
    },
    async addTag() {
      try {
        const response = await axios.post("/tags/", {
          name: this.tagName,
        });

        const newTag = response.data;
        console.log("New tag created:", newTag);

        this.tagName = ""; // Reset the input field

        this.showAlertWithSwal("success", "Tag added successfully");
        this.getTags(); // Refresh the tag list
      } catch (error) {
        console.error("Error adding tag:", error);

        this.showAlertWithSwal("error", "Failed to add tag");
      }
    },
    async deleteTag(tagId) {
      try {
        await axios.delete(`/tags/${tagId}`);
        this.tags = this.tags.filter((tag) => tag.id !== tagId);

        this.showAlertWithSwal("success", "Tag deleted successfully");
      } catch (error) {
        console.error("Error deleting tag:", error);

        this.showAlertWithSwal("error", "Failed to delete tag");
      }
    },
    showAlertWithSwal(type, text) {
      Swal.fire({
        icon: type,
        text: text,
        timer: 3000,
        showConfirmButton: false,
      });
    },
    checkAdmin() {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user || user.role !== "admin") {
        // Redirect to home page if user is not an admin
        this.$router.push("/");
      }
    },
    async getTags() {
      try {
        const response = await axios.get("/tags");
        this.tags = response.data;
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    },    async getPosts() {
      this.loadingPosts = true; this.postError = "";
      try {
        const response = await axios.get("/posts", { params: { scope: "admin", offset: this.offset, limit: 20 } });
        this.posts = response.data; this.hasNext = response.data.length === 20;
      } catch (error) {
        this.postError = "Unable to load posts. Please try again.";
      } finally { this.loadingPosts = false; }
    },
    async approvePost(postId) {
      try {
        await axios.put(`/posts/${postId}`, { status: "approve" });
        const index = this.posts.findIndex((post) => post.id === postId);
        if (index !== -1) {
          this.posts[index].status = "approve";
        }
        this.showAlertWithSwal("success", "Post approved successfully");
      } catch (error) {
        console.error("Error approving post:", error);
        this.showAlertWithSwal("error", "Failed to approve post");
      }
    },
    async noneApprovePost(postId) {
      try {
        await axios.put(`/posts/${postId}`, { status: "noneApprove" });
        const index = this.posts.findIndex((post) => post.id === postId);
        if (index !== -1) {
          this.posts[index].status = "noneApprove";
        }
        this.showAlertWithSwal("success", "Post none approved successfully");
      } catch (error) {
        console.error("Error none approving post:", error);
        this.showAlertWithSwal("error", "Failed to none approve post");
      }
    },
    async showPostDetails(post) {
      this.selectedPost = post;
      const imageUrls = await this.postImageUrls(post);
      const title = this.escapeHtml(post.title || "Untitled item");
      const detail = this.escapeHtml(post.detail || "No description added yet.").replace(/\n/g, "<br>");
      const status = this.escapeHtml(this.statusLabel(post.status));

      Swal.fire({
        title: "Item details",
        html: `
          ${imageUrls.length ? `<div class="exchange-post-gallery"><img class="exchange-post-detail-image" src="${imageUrls[0]}" alt="Image 1 for ${title}">${imageUrls.length > 1 ? `<div class="exchange-post-thumbnails">${imageUrls.map((url, index) => `<button type="button" class="exchange-post-thumbnail${index === 0 ? ' is-active' : ''}" data-image="${url}" aria-label="View image ${index + 1}"><img src="${url}" alt="Image ${index + 1}"></button>`).join("")}</div>` : ""}</div>` : '<div class="exchange-post-image-placeholder" aria-hidden="true">✦</div>'}
          <div class="exchange-post-detail-content">
            <span class="exchange-post-status exchange-post-status--${this.statusClass(post.status)}">${status}</span>
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
      if (status === 'approve') {
        return 'text-green-500';
      } else if (status === 'noneApprove') {
        return 'text-red-500';
      } else {
        return '';
      }
    },
  },
};
</script>

<style scoped>
/* Legacy rules retained while the page migrates to the shared system. */
.container {
  font-family: Arial, sans-serif;
  max-width: 800px;
}

h1,
h2 {
  color: #1E4F79; /* Change to your desired color */
}

button {
  transition: background 0.3s ease-in-out;
}

button:hover {
  cursor: pointer;
}

input {
  transition: border 0.3s ease-in-out;
}

input:focus {
  border-color: #1E4F79; /* Change to your desired color */
  outline: none;
}

/* Add Tag section */
.flex.mb-4 {
  justify-content: center;
  align-items: center;
}

input[type="text"] {
  width: 200px;
}

button.bg-blue-500 {
  background: #1E4F79; /* Change to your desired color */
}

button.bg-blue-500:hover {
  background: #325d92; /* Change to your desired color */
}

/* Tags and Posts list */
ul.tag-list,
ul.post-list {
  padding: 0;
  margin: 0;
}

ul.tag-list {
  display: flex;
  flex-wrap: wrap;
}

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

button.bg-red-500 {
  background: #FF5A5A; /* Change to your desired color */
}

button.bg-red-500:hover {
  background: #FF7878; /* Change to your desired color */
}

/* Posts section */
button.bg-green-500 {
  background: #47D49D; /* Change to your desired color */
}

button.bg-green-500:hover {
  background: #5ED6A9; /* Change to your desired color */
}

:global(.post-detail-image) {
  max-width: min(420px, 80vw);
  max-height: 300px;
  object-fit: contain;
}
</style>
