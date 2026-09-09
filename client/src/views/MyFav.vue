<template>
  <Layout>
    <Nav />
    <div class="feed-shell">
      <h1 class="section-title">Saved posts</h1>
      <p class="section-subtitle">Posts you liked.</p>
      <div v-if="favoritePosts.length === 0 && !loading" class="text-gray-500">
        No liked posts yet.
      </div>
      <div v-else>
        <div v-for="(post, index) in favoritePosts" :key="index">
  <div class="bg-white p-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <img
    :src="assetUrl(post?.Post?.User?.UserInfo?.profileImageUrl)"
    class="h-10 w-10 rounded-full"
    alt=""
  />
        <button
          type="button"
          class="ml-2 text-left"
          @click="redirectToUserProfile(post?.Post?.User?.id)"
        >
  {{ post?.Post?.User?.UserInfo?.firstName }}
  {{ post?.Post?.User?.UserInfo?.lastName }}
        </button>
      </div>
      <span class="rounded-full px-4 bg-gray-200">
        {{ post?.Post?.Tag?.name }}
      </span>
    </div>
    <p class="mt-5">{{ post?.Post?.title }}</p>
    <ApprovalTime :value="post.Post.approvedAt" />
    <p class="mt-5">{{ post?.Post?.detail }}</p>
    <img
      v-if="post?.Post?.image"
      :src="assetUrl(post.Post.image)"
      class="mt-5 w-full max-h-96 rounded-md object-cover"
      alt="Post image"
      @error="post.Post.image = null"
    />
    <p v-if="post?.Post?.exchangeEnded === true" class="mt-2 text-red-500">อุปกรณ์ถูกแลกเปลี่ยนเรียบร้อยแล้ว</p>
    <div class="flex justify-between items-center mt-5 border-t pt-5">
      <div class="flex gap-x-5">        <button @click="like(post)" class="flex items-center gap-x-2">
          <p
            :class="{ like: post?.Post?.like }"
            class="material-icons-outlined"
          >
            favorite_border
          </p>
          <p>like ({{ post?.Post?.UserFav?.length }})</p>
        </button>
        <button
          class="flex items-center gap-x-2"
        >
          <p class="material-icons-outlined">chat_bubble_outline</p>
          <p>comment ({{ post?.Post?.Comment?.length }})</p>
        </button>
      </div>
    </div>
  </div>
</div>

    </div>
  </div>
</Layout>
</template>

<style scoped>
/* Add your custom styles here */

.container {
  max-width: 800px;
  margin: 0 auto;
}

.post-card {
  background-color: white;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.post-card .post-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.post-card .post-info img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.post-card .post-info .post-user {
  display: flex;
  align-items: center;
}

.post-card .post-info .post-user span {
  margin-left: 0.5rem;
  font-weight: 600;
}

.post-card .post-tags {
  margin-bottom: 0.5rem;
}

.post-card .post-image img {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 0.5rem;
}

.post-card .post-content {
  margin-top: 1rem;
}

.post-card .post-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  border-top: 1px solid #ddd;
  padding-top: 1rem;
}

.post-card .post-actions button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.post-card .post-actions button p {
  font-size: 0.9rem;
}

.post-card .post-actions button .like {
  color: red;
}

.loading {
  text-align: center;
  margin-top: 2rem;
}

.loading .spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

<script>
import axios, { assetUrl } from "../api";
import Layout from "../components/Layout.vue";
import ApprovalTime from "../components/ApprovalTime.vue";
import Nav from "../components/Nav.vue";

export default {
  components: {
    ApprovalTime,
    Layout,
    Nav,
  },
  data() {
    return {
      favoritePosts: [],
      userId: JSON.parse(localStorage.getItem("user"))?.id ?? null,
      loading: false,
    };
  },
  mounted() {
    if (this.userId) {
      this.getFavoritePosts();
    }
    //this.getPost();
  },
  methods: {
    assetUrl,
    async getFavoritePosts() {
  try {
    this.loading = true;
    const res = await axios.get(`/user/fav/${this.userId}`);
    const favoritePosts = res.data.filter((post) => post.Post.status === 'approve');
    this.favoritePosts = favoritePosts;

    for (const post of this.favoritePosts) {
      post.Post.image = assetUrl(`/api/posts/${post.Post.id}/image`);
      const profileImageUrl = await this.fetchProfileImage(post?.Post?.User?.UserInfo?.userId);
      if (profileImageUrl) {
        post.Post.User.UserInfo.profileImageUrl = profileImageUrl;
      }
      
      // Set the like status based on whether user has liked this post
      post.Post.like = post.Post.UserFav.some((fav) => fav.userId === this.userId);
    }

    this.loading = false;
  } catch (error) {
    console.log(error);
    this.loading = false;
  }
},


async fetchProfileImage(userId) {
  try {
    const response = await axios.get(`/user/profile/${userId}`);
    return response.data.UserInfo?.profileImageUrl || null;
  } catch (error) {
    console.log(error);
    return null;
  }
},






redirectToUserProfile(userId) {
  this.$router.push({ name: 'UserProfile', params: { userId: userId } });
},
    async like(choose) {
      const post = choose.Post;
      try {
        console.log(post);
        const userLike = post.UserFav.find((fav) => fav.userId === this.userId);
        console.log(userLike);
        if (userLike) {
          await axios.delete(
            `/posts/fav/${userLike.id}`
          );
          post.UserFav = post.UserFav.filter(
            (fav) => fav.userId !== this.userId
          );
          post.like = false; // Set like status to false
        } else {
          const response = await axios.post(
            `/posts/fav/`,
            {
              userId: this.userId,
              postId: post.id,
            }
          );
          const newFav = response.data;
          post.UserFav.push(newFav);
          post.like = true; // Set like status to true
        }
        this.getFavoritePosts()
      } catch (error) {
        console.log(error);
      }
    },
    navigateToPost(postId) {
      this.$router.push(`/post/${postId}`);
    },
  },
  components: { Layout, Nav },
};
</script>

<style scoped>
/* Add your custom styles here */
</style>
a
