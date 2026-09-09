
<template>
  <Layout>
      <Nav />
  <div class="profile-page">
    <div class="surface profile-card">
      <div class="profile-upload content-center justify-center">
        <h1 class="section-title">Profile photo</h1><p class="section-subtitle">This appears beside your posts and comments.</p>
        <img v-if="imagePreview" :src="imagePreview" class="profile-avatar" alt="Profile preview" />
        <div v-else class="profile-avatar material-icons-outlined">person</div>
        <input id="profile-image" type="file" accept="image/*" class="mb-4" @change="selectImage" />
        <p v-if="errorMessage" class="mb-3 text-red-600">{{ errorMessage }}</p>
        <button
          :disabled="!selectedImage || uploading"
          @click="uploadImage"
          class="button-primary"
        >
          {{ uploading ? 'Uploading…' : 'Save Profile Image' }}
        </button>
        <button @click="$router.push('/')" class="button-secondary mt-3">Back to posts</button>
      </div>
    </div>
  </div>
</Layout>
</template>

<script>
import Layout from "../components/Layout.vue";
import Nav from "../components/Nav.vue";
import axios from "../api";

export default {
  components: {
    Layout,
    Nav,
  },
  data() {
    return {
      selectedImage: null,
      imagePreview: null,
      uploading: false,
      errorMessage: "",
    };
  },
  methods: {
    selectImage(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        this.errorMessage = "Please select an image file.";
        return;
      }
      if (this.imagePreview) URL.revokeObjectURL(this.imagePreview);
      this.selectedImage = file;
      this.imagePreview = URL.createObjectURL(file);
      this.errorMessage = "";
    },
    async uploadImage() {
      const userId = JSON.parse(localStorage.getItem("user"))?.id;
      if (!userId || !this.selectedImage) return;

      this.uploading = true;
      this.errorMessage = "";
      try {
        const formData = new FormData();
        formData.append("image", this.selectedImage);
        formData.append("userId", userId);
        const response = await axios.post(`/user/${userId}/profile-image`, formData);

        const user = JSON.parse(localStorage.getItem("user"));
        user.UserInfo = { ...(user.UserInfo || {}), profileImageUrl: response.data.profileImageUrl };
        localStorage.setItem("user", JSON.stringify(user));
        this.$router.push("/");
      } catch (error) {
        this.errorMessage = error.response?.data?.message || "Unable to upload your profile image.";
      } finally {
        this.uploading = false;
      }
    },
  },
  beforeUnmount() {
    if (this.imagePreview) URL.revokeObjectURL(this.imagePreview);
  },
};

</script>

<style>
.profile-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 50px;
}

.preview-image {
  width: 200px;
  height: 200px;
  margin-top: 20px;
}
</style>
