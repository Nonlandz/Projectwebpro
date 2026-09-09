<template>
  <Layout>
    <Nav />
    <div class="profile-page">
      <div class="surface profile-card">
        <h1 class="section-title">Profile</h1>
        <div class="profile-image mt-5">
          <img
            v-if="userInfo.profileImageUrl"
            :src="userInfo.profileImageUrl"
            alt="User profile image"
          />
          <div v-else class="profile-avatar" aria-label="No profile image">{{ initials }}</div>
        </div>
        <div class="profile-details">
          <div><small>First name</small>{{ userInfo.firstName || '—' }}</div>
          <div><small>Last name</small>{{ userInfo.lastName || '—' }}</div>
          <div><small>Phone number</small>{{ userInfo.phone || '—' }}</div>
          <template v-if="canViewAllDetails">
            <div><small>Username</small>{{ userInfo.username || '—' }}</div>
            <div><small>Email</small>{{ accountInfo.email || '—' }}</div>
            <div><small>Address</small>{{ userInfo.address || '—' }}</div>
            <div><small>Role</small>{{ accountInfo.role === 'customer' ? 'Normal User' : accountInfo.role || '—' }}</div>
            <div><small>Account created</small>{{ formatDate(accountInfo.createdAt) }}</div>
          </template>
        </div>
        <button
          v-if="currentUserId && currentUserId !== userId"
          @click="$router.push({ name: 'chat', params: { userId } })"
          class="button-primary mb-3"
        >Start chat</button>
        <button @click="$router.push('/')" class="button-secondary">
          Back to posts
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

.profile-image-placeholder {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #dbeafe;
  color: #1e4f79;
  font-size: 3rem;
  font-weight: 700;
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
import axios from "../api";
import Layout from "../components/Layout.vue";
import Nav from "../components/Nav.vue";

export default {
  components: {
    Layout,
    Nav,
  },
  name: 'UserProfile',
  props: {
    userId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      currentUserId: JSON.parse(localStorage.getItem("user"))?.id ?? null,
      canViewAllDetails: false,
      accountInfo: {},
      userInfo: {
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        profileImageUrl: '',
      },
    };
  },
  computed: {
    initials() {
      return `${this.userInfo.firstName?.[0] || ''}${this.userInfo.lastName?.[0] || ''}`.toUpperCase() || '?';
    },
  },
  mounted() {
    // Fetch user information from an API endpoint using the userId prop
    this.fetchUserInfo();

  },
  watch: {
    userId() {
      this.fetchUserInfo();
    },
  },
  methods: {
    formatDate(value) {
      return value ? new Date(value).toLocaleString() : '—';
    },
    async fetchUserInfo() {
      this.canViewAllDetails = false;
      this.accountInfo = {};
      this.userInfo = {};
      try {
        const response = await axios.get(`/user/profile/${this.userId}`);
        if (response.data.id !== this.userId) return;
        this.canViewAllDetails = response.data.canViewAllDetails === true;
        this.accountInfo = response.data;
        this.userInfo = response.data.UserInfo || {};
      } catch (error) {
        console.log(error);
      }
    },
  }
};
</script>
