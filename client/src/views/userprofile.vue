<template>
  <Layout>
    <Nav />
    <div class="w-full h-screen flex items-center justify-center bg-[#e5e7e9]">
      <div class="user-profile mb-10 w-4/12 h-100 flex flex-col items-center justify-center content-center rounded-md shadow-md bg-white">
        <h1 class="text-3xl text-[#1E4F79] mt-3 font-bold">User Profile</h1>
        <div class="user-info text-xl mb-3">
          <div class="profile-image">
            <img :src="profileImageUrl" class="w-60 h-60 bg-gray-50 relative mb-5 drop-shadow-md hover:drop-shadow-xl" alt="" />
          </div>
          <div class="user-details">
            <div class="detail-row">
              <div>
                <p><span class="detail-label">First Name:</span> {{ userInfo.firstName }}</p>
              </div>
              <div>
                <p><span class="detail-label ml-8">Last Name:</span> {{ userInfo.lastName }}</p>
              </div>
            </div>
            <p><span class="detail-label ">Phone:</span> {{ userInfo.phone }}</p>
            <p><span class="detail-label">Address:</span> {{ userInfo.address }}</p>
          </div>
        </div>
        <button @click="this.$router.push('/')"
          class="p-5 bg-[#EB6648] text-white px-5 py-2 rounded-md mb-4 hover:bg-[#df593a] drop-shadow-lg"
        >
          Back To Post
        </button>
      </div>
    </div>
  </Layout>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit&display=swap');

.user-profile {
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}

.user-info {
  background-color: #ffffff;
  border-radius: 5px;
  margin-top: 20px;
  padding: 20px;
}

.profile-image {
  display: flex;
  justify-content: center;
}

.profile-image img {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 50%;
}

.user-details {
  margin-top: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.detail-label {
  font-weight: bold;
  color: #2f2e41;
}
</style>


<script>
import axios from "axios";
import { ref as storageRef, getDownloadURL, listAll } from "firebase/storage";
import { useFirebaseStorage } from "vuefire";
import Layout from "../components/Layout.vue";
import Nav from "../components/Nav.vue";

export default {
  components: {
    Layout,
    Nav,
  },



  setup() {
    const storage = useFirebaseStorage();
    return { storage };
  },
  name: 'UserProfile',
  props: {
    userId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      userInfo: {
        firstName: '',
        lastName: '',
        phone: '',
        address: ''
      },
      profileImageUrl: ''
    };
  },
  mounted() {
    // Fetch user information from an API endpoint using the userId prop
    this.fetchUserInfo();

    this.fetchProfileImage(this.userId)
      .then((profileImageUrl) => {
        this.profileImageUrl = profileImageUrl;
      })
      .catch((error) => {
        console.log(error);
      });
  },
  methods: {
    async fetchUserInfo() { //ดึงuserinfoมาใช้
      try {
        const response = await axios.get(`http://localhost:8080/api/user/profile/${this.userId}`);
        const { firstName, lastName, phone, address } = response.data.UserInfo;
        this.userInfo = {
          firstName,
          lastName,
          phone,
          address
        };
      } catch (error) {
        console.log(error);
      }
    },

    async fetchProfileImage(userId) { //ดึงรูปโปรไฟล์มาใช้
      try {
        const starsRef = storageRef(this.storage, `users/${userId}`);
        const search = await listAll(starsRef);
        const downloadURL = (await getDownloadURL(search.items[0])).toString();
        return downloadURL;
      } catch (error) {
        console.log(error);
        return null;
      }
    }
  }
};
</script>
