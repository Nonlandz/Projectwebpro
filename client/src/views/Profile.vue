
<template>
  <Layout>
      <Nav />
  <div class="w-full h-screen flex items-center justify-center bg-[#e5e7e9]">
    <div class="w-4/12 border flex flex-col items-center p-1 rounded-md shadow-md px-8 bg-white drop-shadow-lg">
      <div class="profile-upload content-center justify-center">
        <h1 class="text-3xl text-slate-600 font-bold mb-10">Upload Profile Image</h1>
        <input class="ml-36" type="file" @change="handleImagePreview">
        <div v-if="previewImage">
          <img :src="previewImage" alt="Profile Image" class="preview-image">
        </div>
        <button class="p-5 bg-[#EB6648] text-white px-5 py-1 rounded-md mt-5 hover:bg-[#df593a] drop-shadow-lg" @click="uploadProfileImage">Submit</button>
        <button @click="this.$router.push('/')" class="p-5 bg-[#286aa2] text-white px-5 py-1 rounded-md mt-3 mb-8 hover:bg-[#1a456a] drop-shadow-lg">Back To Post</button>
      </div>
    </div>
  </div>
</Layout>
</template>

<script>
import { ref } from 'vue';
import { useFirebaseStorage } from 'vuefire';
import { ref as storageRef, getDownloadURL, uploadBytes } from 'firebase/storage';
import { useRouter } from 'vue-router';
import Layout from "../components/Layout.vue";
import Nav from "../components/Nav.vue";

export default {
  components: {
    Layout,
    Nav,
  },

  setup() {
    const storage = useFirebaseStorage();
    const previewImage = ref(null);
    const chooseImage = ref(null);

    const router = useRouter();


    const handleImagePreview = (event) => {
      const file = event.target.files[0];
      chooseImage.value = file;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        previewImage.value = reader.result;
      };
    };
          //upload รูปโปรไฟล์เข้า firebase
    const uploadProfileImage = async () => {
  try {
    const file = chooseImage.value;
    if (!file) {
      throw new Error('No image selected');
    }

    const user = JSON.parse(localStorage.getItem('user')); // Get  user object from localStorage
    if (!user || !user.id) {
      throw new Error('User ID not found in localStorage');
    }

    const userId = user.id;
    const filePath = `users/${userId}/${file.name}`;
    const starsRef = storageRef(storage, filePath);
    await uploadBytes(starsRef, file);

    const downloadURL = await getDownloadURL(starsRef);
    console.log('Profile image URL:', downloadURL);

    router.push('/');

    // Reset the input and preview
    chooseImage.value = null;
    previewImage.value = null;
  } catch (error) {
    console.log(error);

    
  }
};





    return {
      storage,
      previewImage,
      handleImagePreview,
      uploadProfileImage,
    };
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
  height: auto;
  margin-top: 20px;
}
</style>
