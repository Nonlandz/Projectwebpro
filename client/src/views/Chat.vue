<template>
  <Layout>
    <Nav />
    <main class="chat-page">
      <aside class="conversation-list">
        <h1>Messages</h1><p v-if="error" class="error" role="alert">{{ error }} <button @click="refreshActiveThread">Retry loading</button></p>
        <p v-if="!conversations.length" class="empty">No conversations yet.</p>
        <button v-for="conversation in conversations" :key="conversation.otherUser.id" :class="{ active: activeUser?.id === conversation.otherUser.id }" @click="selectConversation(conversation.otherUser)">
          <img v-if="conversation.otherUser.UserInfo?.profileImageUrl" :src="assetUrl(conversation.otherUser.UserInfo.profileImageUrl)" alt="" />
          <span v-else class="avatar">{{ initials(conversation.otherUser) }}</span>
          <span><strong>{{ displayName(conversation.otherUser) }}</strong><span v-if="conversation.unreadCount" class="unread" :aria-label="`${conversation.unreadCount} unread messages`">{{ conversation.unreadCount }}</span><small>{{ conversation.lastMessage.content }}</small><time :datetime="conversation.lastMessage.createdAt">{{ formatTimestamp(conversation.lastMessage.createdAt) }}</time></span>
        </button>
        <div class="paging"><button :disabled="conversationOffset === 0" @click="changeConversationPage(-1)">Previous</button><button :disabled="!moreConversations" @click="changeConversationPage(1)">Next</button></div>
      </aside>
      <section class="thread">
        <template v-if="activeUser">
          <header><span>{{ displayName(activeUser) }}</span><button class="delete-chat" :disabled="deleting || sending || !messages.length" @click="deleteConversation">Delete for me</button></header>
          <article v-if="contextPost" class="chat-product-context">
            <span class="material-icons-outlined" aria-hidden="true">inventory_2</span>
            <div><small>Chatting about</small><strong>{{ contextPost.title }}</strong><p>{{ contextPost.detail }}</p><div v-if="postImageUrls(contextPost).length" class="chat-product-images"><img v-for="imageUrl in postImageUrls(contextPost)" :key="imageUrl" :src="imageUrl" :alt="`Image for ${contextPost.title}`" @error="$event.target.remove()" /></div><button type="button" class="chat-view-post" @click="viewPost(contextPost.id)">View post <span aria-hidden="true">↗</span></button></div>
          </article>

          <div ref="messageList" class="messages" @scroll="markVisibleRead">
            <button v-if="hasOlder" :disabled="loadingOlder" @click="loadOlder">Load older messages</button>
            <p v-if="!messages.length" class="empty">Start the conversation.</p>
            <div v-for="(message, index) in messages" :key="message.id" class="message-group">
            <div v-if="isNewProductContext(message, index)" class="message-product-context"><span class="material-icons-outlined" aria-hidden="true">inventory_2</span><span>About: {{ message.Post.title }}</span><img v-if="postImageUrls(message.Post)[0]" :src="postImageUrls(message.Post)[0]" :alt="`Image for ${message.Post.title}`" @error="$event.target.remove()" /><button type="button" @click="viewPost(message.Post.id)">View post</button></div>
            <div :data-message-id="message.id" :class="['message', { mine: message.senderId === currentUserId }]">
              <div class="message-content">{{ message.content }}</div>
              <div class="message-meta"><time :datetime="message.createdAt">{{ formatTimestamp(message.createdAt) }}</time><span v-if="message.senderId === currentUserId">{{ message.readAt ? "Read" : "Sent" }}</span><button v-if="message.senderId === currentUserId" :disabled="deleting || sending" aria-label="Unsend message" @click="deleteMessage(message)">Unsend</button></div>
            </div>
            </div>
          </div>
          <p v-if="failedMessage" class="error" role="alert">Message was not confirmed sent. <button :disabled="sending" @click="retryMessage">Retry sending</button></p>
          <form @submit.prevent="sendMessage">
            <input v-model="draft" :disabled="sending || !!failedMessage" maxlength="1000" placeholder="Write a message…" aria-label="Message" />
            <button :disabled="!draft.trim() || sending || deleting || !!failedMessage">Send</button>
          </form>
        </template>
        <div v-else class="empty select-message">Select a conversation or visit a user profile to begin.</div>
      </section>
    </main>
  </Layout>
</template>

<script>
import axios, { assetUrl } from "../api";
import Layout from "../components/Layout.vue";
import Nav from "../components/Nav.vue";
export default {
  components: { Layout, Nav },
  props: { userId: { type: String, default: null }, postId: { type: String, default: null } },
  data() { return { currentUserId: JSON.parse(localStorage.getItem("user"))?.id ?? null, conversations: [], activeUser: null, contextPost: null, messages: [], draft: "", sending: false, deleting: false, error: "", requestVersion: 0, refreshTimer: null, refreshing: false, conversationOffset: 0, moreConversations: false, hasOlder: false, loadingOlder: false, failedMessage: null, markingRead: false, disposed: false }; },
  async mounted() {
    if (!this.currentUserId) return this.$router.push("/login");
    try { await this.loadConversations(); if (this.userId) await this.openUser(this.userId); }
    catch { this.error = "Unable to load chats. Please retry."; }
    if (!this.disposed) this.refreshTimer = setInterval(() => { if (!document.hidden && !this.deleting && !this.loadingOlder) this.refreshActiveThread(); }, 5000);
  },
  beforeUnmount() { this.disposed = true; clearInterval(this.refreshTimer); this.requestVersion++; },
  watch: {
    userId(value) { if (value) this.openUser(value).catch(() => { this.error = "Unable to open chat"; }); },
    postId(value) { if (value && this.activeUser) this.loadPostContext(value).catch(() => { this.error = "Unable to load item information"; }); else this.contextPost = null; },
  },
  methods: {
    assetUrl,
    formatTimestamp(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); },
    displayName(user) { return [user.UserInfo?.firstName, user.UserInfo?.lastName].filter(Boolean).join(" ") || user.UserInfo?.username || "User"; },
    initials(user) { return this.displayName(user).slice(0, 1).toUpperCase(); },
    async deleteMessage(message) {
      if (this.deleting || !window.confirm("Unsend this message for both participants? This cannot be undone.")) return;
      await this.removeChat(`/chat/messages/${message.id}`, false, message.id);
    },
    async deleteConversation() {
      if (this.deleting || !this.activeUser || !window.confirm("Delete this conversation from your history? The other participant keeps their copy. New messages will appear again.")) return;
      await this.removeChat(`/chat/conversations/${this.activeUser.id}`, true);
    },
    async removeChat(url, wholeThread, messageId) {
      this.deleting = true; this.error = ""; this.requestVersion++;
      const userId = this.activeUser.id;
      try {
        await axios.delete(url);
        this.requestVersion++;
        if (this.activeUser?.id === userId) {
          this.messages = wholeThread ? [] : this.messages.filter(message => message.id !== messageId);
          if (wholeThread) this.hasOlder = false;
        }
        await this.loadConversations();
      } catch (error) { this.error = error.response?.data?.message || "Could not delete chat. Please try again."; }
      finally { this.deleting = false; }
    },
    async loadConversations() {
      const offset = this.conversationOffset;
      const { data } = await axios.get(`/chat/conversations/${this.currentUserId}`, { params: { limit: 20, offset } });
      if (offset !== this.conversationOffset || this.disposed) return;
      this.conversations = data; this.moreConversations = data.length === 20;
    },
    async changeConversationPage(direction) { this.conversationOffset = Math.max(0, this.conversationOffset + direction * 20); await this.refreshActiveThread(); },
    async openUser(id) {
      const { data } = await axios.get(`/user/profile/${id}`);
      await this.selectConversation(data);
      if (this.postId) await this.loadPostContext(this.postId);
    },
    async selectConversation(user) {
      if (this.sending || this.deleting) return;
      this.activeUser = user; this.messages = []; this.draft = ""; this.failedMessage = null; this.error = ""; this.hasOlder = false;
      if (!this.postId) this.contextPost = null;
      try { await this.loadMessages(true); await this.loadConversations(); } catch { this.error = "Unable to load messages. Please retry."; }
    },
    async loadMessages(forceBottom = false) {
      if (!this.activeUser) return;
      const version = ++this.requestVersion;
      const element = this.$refs.messageList;
      const atBottom = !element || element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      const { data } = await axios.get(`/chat/${this.currentUserId}/${this.activeUser.id}`, { params: { limit: 50 } });
      if (version !== this.requestVersion || this.disposed) return;
      // Keep older pages in place; replace the latest page so unsent messages disappear.
      const first = data[0];
      const older = first ? this.messages.filter(message => message.createdAt < first.createdAt || (message.createdAt === first.createdAt && message.id < first.id)) : [];
      const refreshedOlder = [];
      for (let index = 0; index < older.length; index += 100) {
        const response = await axios.post(`/chat/sync/${this.activeUser.id}`, { ids: older.slice(index, index + 100).map(message => message.id) });
        if (version !== this.requestVersion || this.disposed) return;
        refreshedOlder.push(...response.data);
      }
      refreshedOlder.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      this.messages = [...refreshedOlder, ...data];
      if (!older.length) this.hasOlder = data.length === 50;
      await this.$nextTick();
      if ((forceBottom || atBottom) && this.$refs.messageList) this.$refs.messageList.scrollTop = this.$refs.messageList.scrollHeight;
      await this.markVisibleRead();
    },
    async loadOlder() {
      if (this.loadingOlder || !this.messages.length) return;
      this.loadingOlder = true;
      const userId = this.activeUser.id; const version = ++this.requestVersion;
      const element = this.$refs.messageList; const height = element.scrollHeight; const top = element.scrollTop;
      try {
        const { data } = await axios.get(`/chat/${this.currentUserId}/${userId}`, { params: { limit: 50, before: this.messages[0].id } });
        if (version !== this.requestVersion || this.disposed) return;
        this.messages = [...data, ...this.messages]; this.hasOlder = data.length === 50;
        await this.$nextTick(); element.scrollTop = top + element.scrollHeight - height;
        await this.markVisibleRead();
      } catch { this.error = "Unable to load older messages. Please retry."; }
      finally { this.loadingOlder = false; }
    },
    async markVisibleRead() {
      if (document.hidden || this.markingRead || !this.activeUser || !this.$refs.messageList) return;
      const element = this.$refs.messageList; const bounds = element.getBoundingClientRect();
      const ids = [...element.querySelectorAll('[data-message-id]')].filter(node => { const rect = node.getBoundingClientRect(); return rect.bottom > bounds.top && rect.top < bounds.bottom; }).map(node => node.dataset.messageId);
      const unread = this.messages.filter(message => ids.includes(message.id) && message.recipientId === this.currentUserId && !message.readAt);
      if (!unread.length) return;
      this.markingRead = true;
      try { await axios.post(`/chat/read/${this.activeUser.id}`, { ids: unread.map(message => message.id) }); unread.forEach(message => { message.readAt = new Date().toISOString(); }); }
      catch { /* A later refresh retries marking visible messages as read. */ }
      finally { this.markingRead = false; }
    },
    async refreshActiveThread() {
      if (this.refreshing || this.disposed) return;
      this.refreshing = true;
      try { await this.loadMessages(); await this.loadConversations(); this.error = ""; }
      catch { this.error = "Connection interrupted. Retrying automatically; you can also retry now."; }
      finally { this.refreshing = false; }
    },
    async loadPostContext(postId) {
      const { data } = await axios.get(`/posts/${postId}/context`);
      if (data.userId !== this.activeUser?.id) throw new Error("Post owner does not match chat recipient");
      this.contextPost = data;
    },
    isNewProductContext(message, index) {
      return Boolean(message.Post && message.postId !== this.messages[index - 1]?.postId);
    },
    postImageUrls(post) {
      if (!post?.id) return [];
      if (post.Images?.length) return post.Images.map(image => assetUrl(`/api/posts/${post.id}/images/${image.id}`));
      return post.hasLegacyImage ? [assetUrl(`/api/posts/${post.id}/image`)] : [];
    },
    viewPost(postId) { this.$router.push({ name: "post", params: { id: postId } }); },
    async sendMessage() {
      if (!this.draft.trim() || this.sending || this.deleting || this.failedMessage) return;
      await this.submitMessage({ recipientId: this.activeUser.id, content: this.draft.trim(), clientId: crypto.randomUUID(), ...(this.contextPost ? { postId: this.contextPost.id } : {}) });
    },
    async retryMessage() { if (this.failedMessage && !this.sending) await this.submitMessage(this.failedMessage); },
    async submitMessage(payload) {
      this.sending = true;
      try {
        await axios.post("/chat", payload); this.failedMessage = null; this.draft = "";
        try { await this.loadMessages(true); await this.loadConversations(); } catch { this.error = "Message sent, but refreshing the chat failed. Please retry loading."; }
      } catch { this.failedMessage = payload; }
      finally { this.sending = false; }
    },
  },
};
</script>

<style scoped>
.unread { display: inline-block; padding: .1rem .4rem; margin-left: .5rem; border-radius: 1rem; background: #1e4f79; color: white; font-size: .75rem; }
.message-group { display: contents; }
.paging { display: flex; gap: .5rem; }
.paging button:disabled { opacity: .4; }
.chat-page { min-height: calc(100vh - 72px); display: grid; grid-template-columns: 320px minmax(0, 1fr); background: #e5e7e9; }
.conversation-list { background: white; border-right: 1px solid #d1d5db; padding: 1.25rem; }
h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #1e4f79; }
.conversation-list button { width: 100%; display: flex; gap: .75rem; align-items: center; text-align: left; padding: .75rem; border-radius: .5rem; }
.conversation-list button:hover, .conversation-list button.active { background: #dbeafe; }
.conversation-list img, .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex: none; }
.avatar { display: grid; place-items: center; background: #1e4f79; color: white; }
small { display: block; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px; }
.thread { height: calc(100vh - 72px); overflow: hidden; display: flex; flex-direction: column; min-height: calc(100vh - 72px); }
.thread header { padding: 1.25rem; background: white; font-weight: 700; border-bottom: 1px solid #d1d5db; }
.thread header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.chat-product-context { display:flex; gap:.75rem; align-items:flex-start; padding:.8rem 1.25rem; border-bottom:1px solid #d9e5f3; background:#eff6ff; color:#174a77; }.chat-product-context > .material-icons-outlined { padding:.35rem; border-radius:9px; background:#dbeafe; color:#2457d6; }.chat-product-context small { display:block; max-width:none; color:#5b7390; font-size:.7rem; }.chat-product-context strong { display:block; margin-top:.1rem; }.chat-product-context p { max-width:550px; margin:.15rem 0 0; color:#526a84; font-size:.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.chat-product-images { display:flex; gap:7px; margin-top:.65rem; overflow-x:auto; }.chat-product-images img { width:62px; height:48px; flex:0 0 auto; border:1px solid #c9d9eb; border-radius:7px; object-fit:cover; background:#fff; }.chat-view-post { margin-top:.65rem; color:#2457d6; font-size:.78rem; font-weight:700; }.message-product-context { align-self:center; display:flex; align-items:center; gap:.35rem; margin:.2rem 0; color:#526a84; font-size:.75rem; }.message-product-context .material-icons-outlined { font-size:16px; color:#2457d6; }.message-product-context img { width:28px; height:23px; margin-left:.25rem; border-radius:4px; object-fit:cover; }.message-product-context button { margin-left:.25rem; color:#2457d6; font-weight:700; text-decoration:underline; }
.delete-chat { color: #b91c1c; font-size: .875rem; border: 1px solid #b91c1c; border-radius: .5rem; padding: .5rem .75rem; }
.delete-chat:disabled, .message-meta button:disabled { opacity: .5; cursor: not-allowed; }
time { font-size: .7rem; font-weight: 400; }
.conversation-list time { color: #6b7280; }
.message-content { white-space: pre-wrap; overflow-wrap: anywhere; }
.message-meta { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: .75rem; margin-top: .4rem; }
.message-meta button { font-size: .75rem; text-decoration: underline; }
.error { color: #b91c1c; padding: .75rem 1.25rem; background: #fef2f2; }
.messages { min-height: 0; flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: .75rem; }
.message { max-width: 70%; width: fit-content; padding: .75rem 1rem; background: white; border-radius: 1rem 1rem 1rem .25rem; }
.message.mine { align-self: flex-end; background: #286aa2; color: white; border-radius: 1rem 1rem .25rem 1rem; }
form { display: flex; gap: .75rem; padding: 1rem; background: white; border-top: 1px solid #d1d5db; }
input { flex: 1; border: 1px solid #9ca3af; border-radius: .5rem; padding: .7rem .9rem; }
form button { border-radius: .5rem; background: #286aa2; color: white; padding: .7rem 1.25rem; } form button:disabled { opacity: .5; }
.empty { color: #6b7280; } .select-message { display: grid; place-items: center; flex: 1; }
@media (max-width: 700px) { .chat-page { grid-template-columns: 1fr; } .conversation-list { max-height: 35vh; overflow-y: auto; } .thread { min-height: 60vh; } }
</style>
