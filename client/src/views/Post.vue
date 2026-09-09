<template>
  <Layout>
    <Nav />
    <main class="single-post-page">
      <p v-if="error" class="single-post-error" role="alert">{{ error }}</p>
      <article v-else-if="post" class="surface single-post-card">
        <div class="single-post-heading"><div><span class="single-post-tag">{{ post.Tag?.name || 'Item' }}</span><h1>{{ post.title }}</h1><p>Posted by {{ ownerName }}</p></div><button v-if="post.userId !== currentUserId" class="button-primary" @click="$router.push({ name: 'chat', params: { userId: post.userId }, query: { postId: post.id } })">Start chat</button></div>
        <div v-if="imageUrls.length" class="single-post-images"><img v-for="imageUrl in imageUrls" :key="imageUrl" :src="imageUrl" :alt="`Image for ${post.title}`" @error="$event.target.remove()" /></div>
        <p class="single-post-detail">{{ post.detail }}</p>
      </article>
      <p v-else class="single-post-loading">Loading post…</p>
    </main>
  </Layout>
</template>

<script>
import axios from '../api';
import Layout from '../components/Layout.vue';
import Nav from '../components/Nav.vue';
export default {
  components: { Layout, Nav },
  props: { id: { type: String, required: true } },
  data: () => ({ post: null, error: '', currentUserId: JSON.parse(localStorage.getItem('user'))?.id ?? null }),
  computed: {
    ownerName() { const info = this.post?.User?.UserInfo; return [info?.firstName, info?.lastName].filter(Boolean).join(' ') || info?.username || 'Member'; },
    imageUrls() { if (!this.post) return []; if (this.post.Images?.length) return this.post.Images.map(image => `/api/posts/${this.post.id}/images/${image.id}`); return this.post.hasLegacyImage ? [`/api/posts/${this.post.id}/image`] : []; },
  },
  mounted() { this.loadPost(); },
  watch: { id() { this.loadPost(); } },
  methods: { async loadPost() { try { this.error = ''; const { data } = await axios.get(`/posts/${this.id}/view`); this.post = data; } catch (error) { this.error = error.response?.data?.message || 'Unable to load this post.'; } } },
};
</script>

<style scoped>
.single-post-page { width:min(780px,calc(100% - 32px)); margin:2rem auto 3rem; }.single-post-card { padding:1.5rem; }.single-post-heading { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; }.single-post-tag { display:inline-flex; padding:.25rem .6rem; border-radius:999px; background:#eef2ff; color:#344985; font-size:.75rem; font-weight:700; }.single-post-heading h1 { margin:.65rem 0 .3rem; font-size:2rem; }.single-post-heading p { margin:0; color:var(--muted); font-size:.9rem; }.single-post-images { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:.75rem; margin:1.5rem 0; }.single-post-images img { width:100%; max-height:460px; border-radius:12px; object-fit:contain; background:#f8f9fc; }.single-post-detail { white-space:pre-wrap; line-height:1.65; }.single-post-error,.single-post-loading { padding:1rem; border-radius:12px; background:#fff; color:var(--muted); }.single-post-error { color:#b4233b; }@media(max-width:560px) { .single-post-heading { flex-direction:column; }.single-post-heading .button-primary { width:100%; } }
</style>
