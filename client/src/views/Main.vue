import { onMounted } from 'vue';
<template>
  <Layout>
    <Nav />
    <div class="w-full h-full flex flex-grow flex-col items-center">
      <div class="w-3/5 mt-5">
        <!-- tags -->
        <div class="w-full overflow-scroll flex gap-x-2 scrollbar-hide">
          <button
            @click="filterTag('all')"
            class="bg-gray-300 w-fit p-1 rounded-full px-5 cursor-pointer"
          >
            all
          </button>
          <button
            @click="filterTag(tag.id)"
            v-for="(tag, index) in tags"
            :key="index"
            class="bg-gray-300 w-fit p-1 rounded-full px-5 cursor-pointer"
          >
            {{ tag.name }}
          </button>
        </div>
        <!-- post -->
        <div
          class="w-full mt-5 bg-white rounded-md flex flex-col justify-between p-5"
        >
          <div class="w-full flex flex-grow" @click="openButton = true">
            <input
              type="text"
              placeholder="มาแลกสินค้ากัน"
              class="flex-grow focus:outline-none"
              v-model="createPost.title"
            />
            <label for="file" class="material-icons-outlined">image </label>
            <input
              class="hidden"
              type="file"
              id="file"
              @change="handleImagePreview"  
            /> 
          </div>
          <div
            :class="`w-full mt-5 flex flex-col items-end border-t ${
              openButton ? 'flex' : 'hidden'
            }`"
          >
            <div
              class="w-full mt-5 flex justify-center relative"
              v-if="previewImage"
            >
              <img :src="previewImage" class="h-[300px] w-[300px]" alt="" />
              <button
                @click="previewImage = null"
                class="material-icons-outlined absolute -top-3 right-0 z-10 bg-white/90 rounded-full p-1 shadow-lg"
              >
                delete
              </button> 
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
              class="bg-[#EB6648] text-white px-5 py-1 rounded-md mt-2"
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
  <img :src="post.User.UserInfo.profileImageUrl" class="h-10 w-10 rounded-full" alt="" />
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
          <div
  class="w-full mt-5 flex justify-center relative"
  v-if="post.image"
>
  <img
    :src="post?.image"
    class="object-cover object-center w-50 h-96"
    alt=""
  />
</div>
          <p class="mt-5">{{ post.detail }}</p>
          <p v-if="post.exchangeEnded" class="mt-2 text-red-500">อุปกรณ์ถูกแลกเปลี่ยนเรียบร้อยแล้ว</p> 
          <div class="flex justify-between items-center mt-5 border-t pt-5">
            <div class="flex gap-x-5">
              <button @click="like(post)" class="flex items-center gap-x-2">
                <p
                  :class="{ like: post.like }"
                  class="material-icons-outlined"
                >
                  favorite_border
                </p>
                <p>like ({{ post.UserFav.length }})</p>
              </button>
              <button
                @click="expandPost(post.id)"
                class="flex items-center gap-x-2"
                :disabled="post.exchangeEnded"
              >
                <p class="material-icons-outlined">chat_bubble_outline</p>
                <p>comment ({{ post.Comment.length }})</p>
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
        <img :src="comment.author.UserInfo.profileImageUrl" class="h-10 w-10 rounded-full" alt="" />



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
import axios from "axios";
import Nav from "../components/Nav.vue";
import {
  ref as storageRef,
  getDownloadURL,
  listAll,
  uploadBytes,
} from "firebase/storage";
import { useFirebaseStorage } from "vuefire";
import useValidate from "@vuelidate/core";
import { required, email, minLength } from "@vuelidate/validators";
const storage = useFirebaseStorage();

export default {
  components: {
    Layout,
    Nav
  },
  data() {
    return {
      v$: useValidate(),
      tags: [],
      openButton: false,
      image: "",
      chooseImage: "",
      previewImage: null,
      createPost: {
        title: null,
        detail: null,
        tagId: null,
      },
      posts: [],
      userId: JSON.parse(localStorage.getItem("user"))?.id ?? null,  //ดึงข้อมูลuserId จาก localstorage
      expandedPosts: [],
      profileImageUrl: '',
    };
  },
  validations() { //validate frontend
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
      chooseImage: {
        required,
      },
    };
  },
  mounted() {
    this.checkAuth();
    this.getTag();
    this.getPost();
    this.updatePostLikes(); // Update the likes for all posts
    this.saveLikedPostsToLocalStorage(); // save like ลง localstorage
    this.fetchProfileImage();
  },
  methods: {
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
    async uploadFile(file, postId) {  //อัปรูปโพสต์
      try {
        const starsRef = storageRef(storage, `posts/${postId}/${file.name}`);
        await uploadBytes(starsRef, file);
      } catch (error) {
        console.log(error);
      }
    },
          //handle รูปพรีวิว
    handleImagePreview(event) {
      const file = event.target.files[0];
      this.chooseImage = file;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.previewImage = reader.result;
      };
    },

    async addPost() { //add post
      try {
        const result = await this.v$.$validate();

        if (!result) {
          throw new Error("ใส่ข้อมูลไม่ครบ");
        }

        const res = await axios.post("http://localhost:8080/api/posts/", { //โพสต์ไปbackend
          ...this.createPost,
          userId: this.userId,
        });
        this.uploadFile(this.chooseImage, res.data.id);
        this.createPost = {
          title: "",
          detail: "",
          tagId: "",
        };
        this.previewImage = null;
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
    },

    async getPost() { //ดึงโพสจาก backend
  try {
    const res = await axios.get("http://localhost:8080/api/posts/");
    const newPosts = res.data.filter((post) => post.status === "approve");

    for (const post of newPosts) {
      const starsRef = storageRef(storage, "posts/" + post.id);
      const search = await listAll(starsRef);
      if (search.items.length === 0) continue;
      const download = (await getDownloadURL(search.items[0])).toString();
      post.image = download;
    }

    // Fetch user profile images for all unique user IDs
    const userIds = [...new Set(newPosts.map((post) => post.User.id))];
    const profileImagePromises = userIds.map((userId) =>
      this.fetchProfileImage(userId)
    );
    const profileImages = await Promise.all(profileImagePromises);

    // Update profile images for ของแต่ละโพสต์
    for (const post of newPosts) {
      const profileImageUrl = profileImages.find(
        (image) => image.userId === post.User.id
      )?.url;
      if (profileImageUrl) {
        post.User.UserInfo.profileImageUrl = profileImageUrl;
      }

      // Update profile images for คนมาคอมเม้น
      for (const comment of post.Comment) {
        const commentProfileImageUrl = await this.fetchCommentProfileImage(comment.authorId);
        comment.author.UserInfo.profileImageUrl = commentProfileImageUrl;
      }
    }
    
    this.posts = newPosts;
  } catch (error) {
    console.log(error);
  }
},




  //fetch รูปโปรไฟล์ โพสต์
async fetchProfileImage(userId) {
  try {
    const starsRef = storageRef(storage, `users/${userId}`);
    const search = await listAll(starsRef);
    const downloadURL = (await getDownloadURL(search.items[0])).toString();
    return { userId, url: downloadURL };
  } catch (error) {
    console.log(error);
    return { userId, url: null };
  }
},



// fetch รูปcommentProfile
async fetchCommentProfileImage(userId) {
  try {
    const starsRef = storageRef(storage, `users/${userId}`);
    const search = await listAll(starsRef);
    const downloadURL = (await getDownloadURL(search.items[0])).toString();
    return downloadURL;
  } catch (error) {
    console.log(error);
    return null;
  }
},


// formatTime(time) {
//   const now = new Date();
//   const timestamp = new Date(time);
//   const diff = Math.floor((now - timestamp) / 1000); // หน่วยเวลาเป็นวินาที

//   if (diff < 60) {
//     return 'เมื่อสักครู่';
//   } else if (diff < 3600) {
//     const minutes = Math.floor(diff / 60);
//     return `${minutes} นาทีที่แล้ว`;
//   } else if (diff < 86400) {
//     const hours = Math.floor(diff / 3600);
//     return `${hours} ชั่วโมงที่แล้ว`;
//   } else {
//     const days = Math.floor(diff / 86400);
//     return `${days} วันที่แล้ว`;
//   }
// },





async endExchange(postId) { //ปุ่มจบการแลกเปลี่ยน
  try {
    const response = await axios.put(
      `http://localhost:8080/api/posts/end-exchange/${postId}/${this.userId}`
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









    async deleteComment(postId, commentId) { //ปุ่มลบคอมเม้น
  try {
    const postIndex = this.posts.findIndex((post) => post.id === postId);
    if (postIndex > -1) {
      const commentIndex = this.posts[postIndex].Comment.findIndex(
        (comment) => comment.id === commentId
      );
      if (commentIndex > -1) {
        const response = await axios.delete(
          `http://localhost:8080/api/comment/${commentId}/${this.userId}`
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



    async getTag() { //get tag from backend
      try {
        const res = await axios.get("http://localhost:8080/api/tags/");
        this.tags = res.data;
      } catch (error) {
        console.log(error);
      }
    },


    
  



    async deletePost(postId) { //delete post
  try {
    console.log("postId:", postId); // Log the value of postId for debugging
    const post = this.posts.find((p) => p.id === postId); // Find the post by its ID
    if (post.userId !== this.userId) {
      // Check if the post doesn't belong to the user
      throw new Error("ไม่สามารถลบโพสของผู้อื่นได้");
    }
    const response = await axios.delete(`http://localhost:8080/api/posts/${postId}/${this.userId}`);
    this.posts = this.posts.filter((p) => p.id !== postId); // Remove the post from the list

    // Check if the post is in the user's favorite posts
    const userFavoritePost = post.UserFav.find((fav) => fav.userId === this.userId);
    if (userFavoritePost) {
      // If the post is in the user's favorite posts, delete it from the favorites table
      await axios.delete(`http://localhost:8080/api/posts/fav/${userFavoritePost.id}`);
      post.UserFav = post.UserFav.filter((fav) => fav.userId !== this.userId); // Update the UserFav array for the post
    }

    this.showAlert("success", "ลบโพสสำเร็จ");
  } catch (error) {
    console.log(error);
    this.showAlert("error", "ไม่สามารถลบโพสได้");
  }
},





//กดedit comment
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
            `http://localhost:8080/api/comment/${commentId}/${this.userId}`,
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






//เพิ่มคอมเม้น
async addComment(postId) {
  try {
    const postIndex = this.posts.findIndex((post) => post.id === postId);
    if (postIndex > -1) {
      const response = await axios.post("http://localhost:8080/api/comment/", {
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












      //fav post
    async like(post) {
      try {
        const check = post.UserFav.find((fav) => fav.userId === this.userId);
        if (check) {
          // User has already liked the post, so remove the like
          await axios.delete(`http://localhost:8080/api/posts/fav/${check.id}`);
          post.UserFav = post.UserFav.filter((fav) => fav.userId !== this.userId); // Update the UserFav array for the post
        } else {
          // User hasn't liked the post, so add the like
          const response = await axios.post(`http://localhost:8080/api/posts/fav/`, {
            userId: this.userId,
            postId: post.id,
          });
          const newFav = response.data; // The newly created UserFav object
          post.UserFav.push(newFav); // Add the new UserFav to the UserFav array for the post
        }
        post.like = !post.like; // Toggle the like status for the post
      } catch (error) {
        console.log(error);
      }
    },



//ดึงโพสต์like
async getPostLikes(postId) {
  try {
    const res = await axios.get(
      `http://localhost:8080/api/posts/fav?postId=${postId}`
    );
    return res.data;
  } catch (error) {
    console.log(error);
    return [];
  }
},



//ขยายโพส
expandPost(postId) {
    const index = this.expandedPosts.indexOf(postId);
    if (index > -1) {
      // Post is already expanded, so collapse it
      this.expandedPosts.splice(index, 1);
    } else {
      // Post is not expanded, so expand it
      this.expandedPosts.push(postId);
    }
  },




async updatePostLikes() {
      try {
        for (const post of this.posts) {
          // No need to call getPostLikes here
          post.UserFav = await this.getPostLikes(post.id); // Update the likes for each post
        }
      } catch (error) {
        console.log(error);
      }
    },

//บันทึกfavลงlocalstorage
saveLikedPostsToLocalStorage() {
      const likedPostIds = this.posts.reduce((ids, post) => {
        if (post.UserFav.some((fav) => fav.userId === this.userId)) {
          ids.push(post.id);
        }
        return ids;
      }, []);
      localStorage.setItem('likedPosts', JSON.stringify(likedPostIds));
    },

    //โหลดfav
    loadLikedPostsFromLocalStorage() {
      const likedPostIds = JSON.parse(localStorage.getItem('likedPosts')) || [];
      for (const post of this.posts) {
        post.like = likedPostIds.includes(post.id);
      }
    },



      //ฟังชั่นTag
    async filterTag(tagId) {
  try {
    console.log('Selected tag:', tagId); // Log the selected tag
    const res = await axios.get("http://localhost:8080/api/posts/"); // Fetch all posts from the server
    let newPosts = res.data.filter((post) => post.status === "approve");
    for (const post of newPosts) {
      const starsRef = storageRef(storage, "posts/" + post.id);
      const search = await listAll(starsRef);
      if (search.items.length === 0) continue;
      const download = (await getDownloadURL(search.items[0])).toString();
      post.image = download;
    }
    if (tagId !== "all") {
      // Filter posts based on tagId
      newPosts = newPosts.filter((post) => post.Tag.id === +tagId);
    }

    // Fetch user profile images for all unique user IDs in the filtered posts
    const userIds = [...new Set(newPosts.map((post) => post.User.id))];
    const profileImagePromises = userIds.map((userId) =>
      this.fetchProfileImage(userId)
    );
    const profileImages = await Promise.all(profileImagePromises);

    // Update profile images for each user in the filtered posts
    for (const post of newPosts) {
      const profileImageUrl = profileImages.find(
        (image) => image.userId === post.User.id
      )?.url;
      if (profileImageUrl) {
        post.User.UserInfo.profileImageUrl = profileImageUrl;
      }
      
      // Update profile images for comment authors
      for (const comment of post.Comment) {
        const commentProfileImageUrl = await this.fetchCommentProfileImage(comment.authorId);
        comment.author.UserInfo.profileImageUrl = commentProfileImageUrl;
      }
    }

    this.posts = newPosts; // Replace existing posts with filtered posts
  } catch (error) {
    console.log(error);
  }
},




    checkAuth() { //เช็คว่ามีToken มั้ย
      !localStorage.getItem("token") && this.$router.push("/login");
    },

    async checkUserInfo() { //เช็คว่ามี userinfo มั้ย
      try {
        const res = await axios.get("http://localhost:8080/api/users/", {
          params: {
            id: this.userId,
          },
        });
        if (!res.data.userInfo) {
          this.$router.push("/userinfo");
        }
      } catch (error) {
        console.log(error);
      }
    },
  },
};
</script>
