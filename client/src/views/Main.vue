import { onMounted } from 'vue';
<template>  <Layout>
    <Nav ref="navComponent" @search="handleSearch" />
    <div class="feed-shell">
      <div class="w-full">
        <!-- tags -->
        <div class="w-full overflow-scroll flex gap-x-2 scrollbar-hide">
          <button
            @click="filterTag('all')"
            :class="['w-fit rounded-full border px-4 py-2 text-sm font-semibold', selectedTag === 'all' ? 'border-[#2457d6] bg-[#2457d6] text-white' : 'border-slate-200 bg-white text-slate-700']"
          >
            All
          </button>
          <button
            @click="filterTag(tag.id)"
            v-for="(tag, index) in tags"
            :key="index"
            :class="['w-fit rounded-full border px-4 py-2 text-sm font-semibold', selectedTag === tag.id ? 'border-[#2457d6] bg-[#2457d6] text-white' : 'border-slate-200 bg-white text-slate-700']"
          >
            {{ tag.name }}
          </button>        </div>
        <!-- Search results info -->
        <form class="surface mt-4 p-4" @submit.prevent="requestCategory">
          <label for="category-request" class="block text-sm font-semibold">Missing a category? Request a new one</label>
          <div class="flex flex-wrap gap-2 mt-2">
            <input id="category-request" v-model="requestedCategory" maxlength="50" required placeholder="e.g. Furniture" class="flex-1" />
            <button class="button-secondary" :disabled="requestingCategory || !requestedCategory.trim()">{{ requestingCategory ? 'Sending…' : 'Send request' }}</button>
          </div>
          <p class="mt-2 text-xs text-slate-500" role="status">{{ categoryRequestMessage || 'An admin will review your suggestion before it becomes available.' }}</p>
        </form>
        <div v-if="searchQuery" class="w-full mt-3 text-center text-gray-600">
          <p>ผลการค้นหาสำหรับ: "<strong>{{ searchQuery }}</strong>" ({{ posts.length }} รายการ)</p>
          <button @click="clearSearch" class="text-blue-500 underline ml-2">ล้างการค้นหา</button>
        </div>
        <p v-if="postError" class="surface mt-4 p-3 text-sm text-red-700" role="alert">{{ postError }} <button class="font-semibold underline" @click="getPost">Retry</button></p>
        <div class="my-4 flex items-center gap-2 text-sm text-slate-500"><button class="button-secondary" :disabled="offset === 0 || loadingPosts" @click="offset -= 20; getPost()">Previous</button><span class="px-2">Page {{ offset / 20 + 1 }}</span><button class="button-secondary" :disabled="!hasNext || loadingPosts" @click="offset += 20; getPost()">Next</button></div>
        <!-- post -->
        <div
          class="surface w-full mt-5 flex flex-col justify-between p-5"
        >
          <div class="w-full flex flex-grow" @click="openButton = true">
            <input
              type="text"
              placeholder="มาแลกสินค้ากัน"
              class="flex-grow focus:outline-none"
              v-model="createPost.title"
            />
            <label for="post-image" class="material-icons-outlined cursor-pointer" title="Add up to 3 images">image</label>
            <span class="ml-2 text-xs text-slate-500">Up to 3 images</span>
            <input
              id="post-image"
              class="hidden"
              type="file"
              accept="image/*"
              multiple
              @change="handleImageSelection"
            />
          </div>
          <div
            :class="`w-full mt-5 flex flex-col items-end border-t ${
              openButton ? 'flex' : 'hidden'
            }`"
          >
            <div v-if="imagePreviews.length" class="w-full mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div v-for="(preview, index) in imagePreviews" :key="preview" class="relative">
                <img :src="preview" class="h-44 w-full rounded-lg object-cover" :alt="`Selected image ${index + 1}`" />
                <button @click="removeSelectedImage(index)" type="button" class="material-icons-outlined absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1 shadow-lg" :aria-label="`Remove image ${index + 1}`">delete</button>
              </div>
            </div>
            <textarea
              type="text"
              placeholder="รายละเอียดสินค้า"
              class="focus:outline-none w-full mt-5"
              v-model="createPost.detail"
            />
            <div class="w-full mb-5">
              <label for="">ประเภท</label>
              <select
                name=""
                id=""
                class="w-full py-0.5 mt-2 shadow-sm border rounded focus:outline-none focus:ring-0"
                v-model="createPost.tagId"
              >
                <option value="" disabled>เลือกประเภท</option>
                <option
                  :value="tag.id"
                  v-for="(tag, index) in tags"
                  :key="index"
                >
                  {{ tag.name }}
                </option>
              </select>
            </div>
            <button
              @click="addPost"
              class="button-primary mt-2"
            >
              post
            </button>
          </div>
        </div>
        <!-- posts -->
        <div class="flex flex-col gap-y-5 mt-5 border-t pt-5 mb-10">
          <div v-for="(post, index) in posts" :key="index">
            <div class="bg-white p-5">
<div class="flex items-center justify-between">
<div class="flex items-center">
  <img :src="assetUrl(post.User.UserInfo.profileImageUrl)" class="feed-avatar h-10 w-10 rounded-full" alt="" />
               <router-link
            :to="{ name: 'UserProfile', params: { userId: post?.User?.id } }"
            class="ml-2"
          >
            {{ post?.User?.UserInfo?.firstName }}
            {{ post?.User?.UserInfo?.lastName }}
          </router-link>
</div>
<span class="rounded-full px-4 bg-gray-200">{{
              post.Tag.name
            }}</span>
          </div>
          <p class="mt-5">{{ post.title }}</p>
          <ApprovalTime :value="post.approvedAt" />
          <div v-if="post.imageUrls?.length" class="feed-post-gallery w-full mt-5">
            <img
              :src="post.imageUrls[post.activeImage || 0]"
              @error="post.imageUrls = []"
              class="feed-post-image"
              :alt="`Image ${(post.activeImage || 0) + 1} for ${post.title}`"
            />
            <div v-if="post.imageUrls.length > 1" class="feed-post-thumbnails" aria-label="Post images">
              <button
                v-for="(imageUrl, imageIndex) in post.imageUrls"
                :key="imageUrl"
                type="button"
                class="feed-post-thumbnail"
                :class="{ 'is-active': (post.activeImage || 0) === imageIndex }"
                @click="post.activeImage = imageIndex"
                :aria-label="`View image ${imageIndex + 1}`"
              ><img :src="imageUrl" :alt="`Thumbnail ${imageIndex + 1}`" /></button>
            </div>
          </div>
          <p class="mt-5">{{ post.detail }}</p>
          <p v-if="post.exchangeEnded" class="mt-2 text-red-500">อุปกรณ์ถูกแลกเปลี่ยนเรียบร้อยแล้ว</p>
          <div class="flex justify-between items-center mt-5 border-t pt-5">
            <div class="flex gap-x-5">
              <div class="relative" @mouseenter="hoveredLikePostId = post.id" @mouseleave="hoveredLikePostId = null">
                <button @click="like(post)" class="flex items-center gap-x-2" :aria-label="`${post.UserFav.length} likes. Toggle your like`">
                  <p :class="{ like: post.like }" class="material-icons-outlined">favorite_border</p>
                  <p>Like ({{ post.UserFav.length }})</p>
                </button>
                <div v-if="hoveredLikePostId === post.id" class="like-tooltip" role="status">
                  <template v-if="post.UserFav.length">
                    <p v-for="favorite in visibleLikers(post)" :key="favorite.id">{{ likerName(favorite) }}</p>
                    <p v-if="post.UserFav.length > 8" class="like-tooltip-more">+{{ post.UserFav.length - 8 }} more</p>
                  </template>
                  <p v-else>No likes yet</p>
                </div>
              </div>
              <button
                @click="expandPost(post.id)"
                class="flex items-center gap-x-2"
                :disabled="post.exchangeEnded"
              >
                <p class="material-icons-outlined">chat_bubble_outline</p>
                <p>comment ({{ post.Comment.length }})</p>
              </button>
              <button
                v-if="post.userId !== userId"
                @click="$router.push({ name: 'chat', params: { userId: post.userId }, query: { postId: post.id } })"
                class="flex items-center gap-x-2 text-[#2457d6]"
                :aria-label="`Start chat with ${post.User?.UserInfo?.firstName || 'this member'}`"
              >
                <span class="material-icons-outlined">chat</span>
                <span>Start chat</span>
              </button>
              <button
                v-if="post.userId === userId" 
                @click="deletePost(post.id)"
                class="material-icons-outlined text-red-500"
              >
                delete
              </button>

              <button
  v-if="post.userId === userId"
  @click="endExchange(post.id)"
  class="material-icons-outlined text-blue-500 ml-2"
>
  done_all
</button>

              
            </div>
          </div>

          <hr class="my-5">
          <div v-for="(comment, commentIndex) in post.Comment" :key="commentIndex" class="mt-3">
      <div class="flex items-center">
        <img :src="assetUrl(comment.author.UserInfo.profileImageUrl)" class="feed-avatar h-10 w-10 rounded-full" alt="" />



<router-link
            :to="{ name: 'UserProfile', params: { userId: comment.author?.id } }"
            class="ml-2"
          >
<span class="ml-2">{{ comment.author?.UserInfo?.firstName || '' }}</span>
<span class="ml-2">{{ comment.author?.UserInfo?.lastName || '' }}</span>
</router-link>

<button
      v-if="comment.authorId === userId"
      @click="deleteComment(post.id, comment.id)"
      class="material-icons-outlined text-red-500"
    >
      delete
    </button>

      </div>
      <textarea
  v-if="comment.isEditing"
  v-model="comment.updatedContent"
  type="text"
  placeholder="แก้ไขความคิดเห็น..."
  class="focus:outline-none w-full mt-2"
></textarea>
<p v-else class="mt-2">{{ comment.content }}</p>
<button
  v-if="comment.authorId === userId"
  @click="toggleEditComment(post.id, comment.id)"
  class="material-icons-outlined text-blue-500 ml-2"
>
  {{ comment.isEditing ? 'done' : 'edit' }}
</button>
    </div>




          <!-- Comment section -->
          <div v-if="expandedPosts.includes(post.id)">
            <textarea
              type="text"
              placeholder="เพิ่มความคิดเห็น..."
              class="focus:outline-none w-full mt-5"
              v-model="post.commentText"
            ></textarea>
            <button
              @click="addComment(post.id)"
              class="bg-[#EB6648] text-white px-5 py-1 rounded-md mt-2"
            >
              โพสต์ความคิดเห็น
            </button>

<!-- Display comments -->


          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- <button
    @click="fetchMoreItems"
    class="mt-4 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
    :disabled="loading || allItemsLoaded"
  >
    <span v-if="loading">
      <svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 016.75 12H4v5.291zM19.25 12c0 2.485-.996 4.753-2.605 6.409l1.932 2.967A9.955 9.955 0 0022 12h-2.75zm-6.709 6.409A7.962 7.962 0 0112.25 17v-5.291h1.75l2.541 3.909z"
        ></path>
      </svg>
      Loading...
    </span>
    <span v-else> Load More </span>
  </button> -->
  <PostModal v-if="showingPostModal" @close="closePostModal" />
</div>
</Layout>
</template>


<script>
import Layout from "../components/Layout.vue";
import ApprovalTime from "../components/ApprovalTime.vue";
import axios, { assetUrl } from "../api";
import Nav from "../components/Nav.vue";
import useValidate from "@vuelidate/core";
import { required, email, minLength } from "@vuelidate/validators";
export default {
  components: {
    ApprovalTime,
    Layout,
    Nav
  },  data() {
    return {
      v$: useValidate(),
      tags: [],
      requestedCategory: '', requestingCategory: false, categoryRequestMessage: '',
      openButton: false,
      selectedImages: [],
      imagePreviews: [],
      createPost: {
        title: null,
        detail: null,
        tagId: null,
      },
      posts: [],
      offset: 0, hasNext: false, loadingPosts: false, postError: "", selectedTag: "all", postRequest: 0,
      allPosts: [], // Store all posts for search functionality
      userId: JSON.parse(localStorage.getItem("user"))?.id ?? null,
      expandedPosts: [],
      profileImageUrl: '',
      searchQuery: '',
      hoveredLikePostId: null,
    };
  },
  validations() {
    return {
      createPost: {
        title: {
          required,
        },
        detail: {
          required,
        },
        tagId: {
          required,
        },
      },
    };
  },  mounted() {
    this.checkAuth();
    this.getTag();
    this.getPost();
    
    // Check if there's a search query in the URL
    if (this.$route.query.search) {
      this.searchQuery = this.$route.query.search;
      this.handleSearch(this.searchQuery);
    }
  },
  methods: {
    async requestCategory() {
      if (this.requestingCategory) return;
      this.requestingCategory = true; this.categoryRequestMessage = '';
      try {
        await axios.post('/tags/requests', { name: this.requestedCategory });
        this.requestedCategory = '';
        this.categoryRequestMessage = 'Request sent! An admin will review your category.';
      } catch (error) { this.categoryRequestMessage = error.response?.data?.message || 'Unable to send request. Please try again.'; }
      finally { this.requestingCategory = false; }
    },
    assetUrl,
    async showAlert(type, text) {
      const Toast = await this.$swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", this.$swal.stopTimer);
          toast.addEventListener("mouseleave", this.$swal.resumeTimer);
        },
      });

      Toast.fire({
        icon: type,
        title: text,
      });
    },
    async addPost() {
      try {
        const result = await this.v$.$validate();

        if (!result) {
          throw new Error("ใส่ข้อมูลไม่ครบ");
        }

        const res = await axios.post("/posts/", {
          ...this.createPost,
          userId: this.userId,
        });
        if (this.selectedImages.length) {
          const formData = new FormData();
          this.selectedImages.forEach(image => formData.append("images", image));
          await axios.post(`/posts/${res.data.id}/images`, formData);
        }
        this.createPost = {
          title: "",
          detail: "",
          tagId: "",
        };
        this.clearImage();
        this.openButton = false;
        this.getPost();
        this.showAlert("success", "สร้างโพสสำเร็จ");
      } catch (error) {
        console.log(error);
        if (error?.response?.data?.message) {
          this.showAlert("error", error?.response?.data?.message);
        } else {
          this.showAlert("error", error);
        }
      }
    },    async getPost() {
      const request = ++this.postRequest;
      this.loadingPosts = true; this.postError = "";
      try {
        const { data } = await axios.get("/posts", { params: { limit: 20, offset: this.offset, search: this.searchQuery || undefined, tagId: this.selectedTag === "all" ? undefined : this.selectedTag } });
        if (request !== this.postRequest) return;
        this.posts = data.map(post => ({
          ...post,
          imageUrls: post.Images?.length
            ? post.Images.map(image => assetUrl(`/api/posts/${post.id}/images/${image.id}`))
            : [assetUrl(`/api/posts/${post.id}/image`)],
          activeImage: 0,
          like: post.UserFav.some(fav => fav.userId === this.userId),
        }));
        this.hasNext = data.length === 20;
      } catch { this.postError = "Unable to load posts. Please retry."; }
      finally { if (request === this.postRequest) this.loadingPosts = false; }
    },

    handleImageSelection(event) {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      if (files.length > 3) {
        this.showAlert("error", "You can select a maximum of 3 images.");
        event.target.value = "";
        return;
      }
      if (files.some(file => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
        this.showAlert("error", "Use image files up to 5 MB each.");
        event.target.value = "";
        return;
      }
      this.clearImage();
      this.selectedImages = files;
      this.imagePreviews = files.map(file => URL.createObjectURL(file));
      event.target.value = "";
    },

    clearImage() {
      this.imagePreviews.forEach(URL.revokeObjectURL);
      this.selectedImages = [];
      this.imagePreviews = [];
    },
    removeSelectedImage(index) {
      URL.revokeObjectURL(this.imagePreviews[index]);
      this.selectedImages.splice(index, 1);
      this.imagePreviews.splice(index, 1);
    },





async fetchProfileImage(userId) {
  try {
    const response = await axios.get(`/user/profile/${userId}`);
    return { userId, url: response.data.UserInfo?.profileImageUrl || null };
  } catch (error) {
    console.log(error);
    return { userId, url: null };
  }
},




async fetchCommentProfileImage(userId) {
  try {
    const response = await axios.get(`/user/profile/${userId}`);
    return response.data.UserInfo?.profileImageUrl || null;
  } catch (error) {
    console.log(error);
    return null;
  }
},


formatTime(time) {
  const now = new Date();
  const timestamp = new Date(time);
  const diff = Math.floor((now - timestamp) / 1000); // หน่วยเวลาเป็นวินาที

  if (diff < 60) {
    return 'เมื่อสักครู่';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} นาทีที่แล้ว`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} ชั่วโมงที่แล้ว`;
  } else {
    const days = Math.floor(diff / 86400);
    return `${days} วันที่แล้ว`;
  }
},





async endExchange(postId) {
  try {
    const response = await axios.put(
      `/posts/end-exchange/${postId}/${this.userId}`
    );
    if (response.data.success) {
      const postIndex = this.posts.findIndex((post) => post.id === postId);
      if (postIndex > -1) {
        this.posts[postIndex].exchangeEnded = true; // Set the exchangeEnded flag to true for the post
       // Append the message to the post detail
        this.showAlert("success", "จบการแลกเปลี่ยนสินค้าแล้ว");
      }
    } else {
      throw new Error("ไม่สามารถจบการแลกเปลี่ยนสินค้าได้");
    }
  } catch (error) {
    console.log(error);
    this.showAlert("error", "ไม่สามารถจบการแลกเปลี่ยนสินค้าได้");
  }
},









    async deleteComment(postId, commentId) {
  try {
    const postIndex = this.posts.findIndex((post) => post.id === postId);
    if (postIndex > -1) {
      const commentIndex = this.posts[postIndex].Comment.findIndex(
        (comment) => comment.id === commentId
      );
      if (commentIndex > -1) {
        const response = await axios.delete(
          `/comment/${commentId}/${this.userId}`
        );
        this.posts[postIndex].Comment.splice(commentIndex, 1); // Remove the comment from the post's Comment array
        this.showAlert("success", "ลบความคิดเห็นสำเร็จ");
      }
    }
  } catch (error) {
    console.log(error);
    this.showAlert("error", "ไม่สามารถลบความคิดเห็นได้");
  }
},



    async getTag() {
      try {
        const res = await axios.get("/tags/");
        this.tags = res.data;
      } catch (error) {
        console.log(error);
      }
    },


    
  



    async deletePost(postId) {
  try {
    console.log("postId:", postId); // Log the value of postId for debugging
    const post = this.posts.find((p) => p.id === postId); // Find the post by its ID
    if (post.userId !== this.userId) {
      // Check if the post doesn't belong to the user
      throw new Error("ไม่สามารถลบโพสของผู้อื่นได้");
    }
    const response = await axios.delete(`/posts/${postId}/${this.userId}`);
    this.posts = this.posts.filter((p) => p.id !== postId); // Remove the post from the list

    // Check if the post is in the user's favorite posts
    const userFavoritePost = post.UserFav.find((fav) => fav.userId === this.userId);
    if (userFavoritePost) {
      // If the post is in the user's favorite posts, delete it from the favorites table
      await axios.delete(`/posts/fav/${userFavoritePost.id}`);
      post.UserFav = post.UserFav.filter((fav) => fav.userId !== this.userId); // Update the UserFav array for the post
    }

    this.showAlert("success", "ลบโพสสำเร็จ");
  } catch (error) {
    console.log(error);
    this.showAlert("error", "ไม่สามารถลบโพสได้");
  }
},






async toggleEditComment(postId, commentId) {
  const postIndex = this.posts.findIndex((post) => post.id === postId);
  if (postIndex > -1) {
    const commentIndex = this.posts[postIndex].Comment.findIndex(
      (comment) => comment.id === commentId
    );
    if (commentIndex > -1) {
      const comment = this.posts[postIndex].Comment[commentIndex];
      if (comment.isEditing) {
        // Update the comment content
        try {
          const response = await axios.put(
            `/comment/${commentId}/${this.userId}`,
            {
              content: comment.updatedContent,
            }
          );
          this.posts[postIndex].Comment[commentIndex].content = response.data.content;
          this.posts[postIndex].Comment[commentIndex].isEditing = false;
          this.showAlert("success", "อัปเดตความคิดเห็นสำเร็จ");
        } catch (error) {
          console.log(error);
          this.showAlert("error", "ไม่สามารถแก้ไขความคิดเห็นได้");
        }
      } else {
        this.posts[postIndex].Comment[commentIndex].isEditing = true;
      }
    }
  }
},







async addComment(postId) {
  try {
    const postIndex = this.posts.findIndex((post) => post.id === postId);
    if (postIndex > -1) {
      const response = await axios.post("/comment/", {
        content: this.posts[postIndex].commentText,
        authorId: this.userId,
        postId: postId,
      });

      const newComment = response.data;
      this.posts[postIndex].Comment.push(newComment);
      this.posts[postIndex].commentText = "";

      // Alert success message
      this.$swal.fire({
        icon: "success",
        title: "เพิ่มความคิดเห็นสำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });

      // Delay the page refresh for 1 seconds
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (error) {
    console.log(error);
  }
},











    async like(post) {
      try {
        const check = post.UserFav.find((fav) => fav.userId === this.userId);
        if (check) {
          // User has already liked the post, so remove the like
          await axios.delete(`/posts/fav/${check.id}`);
          post.UserFav = post.UserFav.filter((fav) => fav.userId !== this.userId); // Update the UserFav array for the post
          post.like = false; // Set like status to false
        } else {
          // User hasn't liked the post, so add the like
          const response = await axios.post(`/posts/fav/`, {
            userId: this.userId,
            postId: post.id,
          });
          const newFav = response.data; // The newly created UserFav object
          post.UserFav.push(newFav); // Add the new UserFav to the UserFav array for the post
          post.like = true; // Set like status to true
        }
      } catch (error) {
        console.log(error);
      }
    },
    visibleLikers(post) {
      return post.UserFav.slice(0, 8);
    },
    likerName(favorite) {
      if (favorite.userId === this.userId) return 'You';
      const info = favorite.User?.UserInfo;
      const name = [info?.firstName, info?.lastName].filter(Boolean).join(' ');
      return name || info?.username || 'Member';
    },




async getPostLikes(postId) {
  try {
    const res = await axios.get(
      `/posts/fav?postId=${postId}`
    );
    return res.data;
  } catch (error) {
    console.log(error);
    return [];
  }
},




expandPost(postId) {
    const index = this.expandedPosts.indexOf(postId);
    if (index > -1) {
      // Post is already expanded, so collapse it
      this.expandedPosts.splice(index, 1);
    } else {
      // Post is not expanded, so expand it
      this.expandedPosts.push(postId);    }
  },




    handleSearch(query) { this.searchQuery = query; this.offset = 0; this.getPost(); },
    clearSearch() { this.searchQuery = ""; this.offset = 0; this.$router.replace({ path: "/" }); this.$refs.navComponent?.clearSearchInput(); this.getPost(); },
    filterTag(tagId) { this.selectedTag = tagId; this.offset = 0; this.getPost(); },

    checkAuth() {
      !localStorage.getItem("token") && this.$router.push("/login");
    },

    async checkUserInfo() {
      try {
        const res = await axios.get("/users/", {
          params: {
            id: this.userId,
          },
        });
        if (!res.data.userInfo) {
          this.$router.push("/profile");
        }
      } catch (error) {
        console.log(error);
      }
    },
  },
};
</script>

<style scoped>
.feed-avatar {
  position: relative;
  flex-shrink: 0;
  object-fit: cover;
  transform-origin: left center;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .feed-avatar:hover {
    z-index: 20;
    transform: scale(2.5);
    box-shadow: 0 0 0 2px white, 0 6px 18px rgb(15 23 42 / 25%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .feed-avatar {
    transition: none;
  }
}
</style>
