<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="page-shell flex min-h-[68px] items-center gap-4">
      <button @click="$router.push('/')" class="shrink-0 font-[Space_Grotesk] text-xl font-bold tracking-tight text-[#2457d6]">ExchangeKUB</button>
      <div class="relative hidden flex-1 md:flex">
        <input v-model="searchQuery" class="h-10 rounded-full bg-slate-100 pl-10 pr-4 text-sm" placeholder="Search posts" @keyup.enter="performSearch" />
        <button class="material-icons-outlined absolute left-3 top-2 text-slate-500" aria-label="Search" @click="performSearch">search</button>
      </div>
      <div class="ml-auto flex items-center gap-1 relative">
        <ThemeToggle />
        <button @click="$router.push('/myfav')" class="material-icons-outlined rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Saved posts">favorite_border</button>
        <div class="message-notification" @mouseenter="showMessageNotifications = true" @mouseleave="showMessageNotifications = false">
          <button @click="$router.push('/chat')" class="message-notification-button material-icons-outlined rounded-lg p-2 text-slate-600 hover:bg-slate-100" :aria-label="unreadLabel" :aria-expanded="showMessageNotifications">
            chat_bubble_outline
            <span v-if="unreadTotal" class="message-notification-badge" aria-hidden="true">{{ unreadBadge }}</span>
          </button>
          <div v-if="showMessageNotifications && unreadConversations.length" class="message-notification-panel" role="status" aria-label="Unread messages">
            <p class="message-notification-title">Unread messages</p>
            <button v-for="conversation in unreadConversations" :key="conversation.otherUser.id" class="message-notification-item" @click="$router.push({ name: 'chat', params: { userId: conversation.otherUser.id } })">
              <span>{{ displayName(conversation.otherUser) }}</span><strong>{{ conversation.unreadCount }}</strong>
            </button>
            <button v-if="unreadTotal > unreadConversations.length" class="message-notification-all" @click="$router.push('/chat')">View all messages</button>
          </div>
        </div>
        <button @click="dropdown = !dropdown" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100" aria-haspopup="menu" :aria-expanded="dropdown">
          <span class="hidden sm:inline">{{ getUsername() || 'Account' }}</span><span class="material-icons-outlined">expand_more</span>
        </button>
      </div>
      <div v-if="dropdown" class="absolute right-4 top-14 z-40 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg" role="menu">
        <button @click="$router.push('/profile')" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Profile photo</button>
        <button @click="$router.push('/MyPost')" class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">My posts</button>
        <button @click="logout" class="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Sign out</button>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  data: () => ({ dropdown: false, searchQuery: '', unreadConversations: [], messageRefreshTimer: null, showMessageNotifications: false }),
  computed: {
    unreadTotal() { return this.unreadConversations.reduce((total, conversation) => total + Number(conversation.unreadCount || 0), 0); },
    unreadBadge() { return this.unreadTotal > 99 ? '99+' : this.unreadTotal; },
    unreadLabel() { return this.unreadTotal ? `${this.unreadTotal} unread message${this.unreadTotal === 1 ? '' : 's'}` : 'Messages'; },
  },
  mounted() {
    this.loadUnreadMessages();
    this.messageRefreshTimer = setInterval(() => { if (!document.hidden) this.loadUnreadMessages(); }, 15000);
  },
  beforeUnmount() { clearInterval(this.messageRefreshTimer); },
  methods: {
    async loadUnreadMessages() {
      try {
        const userId = JSON.parse(localStorage.getItem('user'))?.id;
        if (!userId || !localStorage.getItem('token')) return;
        const { default: axios } = await import('../api');
        const { data } = await axios.get(`/chat/conversations/${userId}`, { params: { limit: 20, offset: 0 } });
        this.unreadConversations = data.filter(conversation => Number(conversation.unreadCount) > 0);
      } catch { this.unreadConversations = []; }
    },
    displayName(user) { return [user.UserInfo?.firstName, user.UserInfo?.lastName].filter(Boolean).join(' ') || user.UserInfo?.username || 'Member'; },
    getUsername() { try { return JSON.parse(localStorage.getItem('user'))?.UserInfo?.username || ''; } catch { return ''; } },
    performSearch() {
      const query = this.searchQuery.trim();
      if (!query) return;
      this.$emit('search', query);
      if (this.$route.path !== '/') this.$router.push({ path: '/', query: { search: query } });
    },
    clearSearchInput() { this.searchQuery = ''; },
    logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); this.$router.push('/login'); },
  },
};
</script>

<style scoped>
.message-notification { position:relative; }.message-notification-button { position:relative; }.message-notification-badge { position:absolute; top:1px; right:0; min-width:17px; height:17px; padding:0 4px; border:2px solid #fff; border-radius:999px; background:#e5484d; color:#fff; font:700 10px/13px Arial,sans-serif; text-align:center; }.message-notification-panel { position:absolute; top:calc(100% + 8px); right:0; z-index:50; width:250px; overflow:hidden; border:1px solid #e4e7ec; border-radius:12px; background:#fff; box-shadow:0 12px 28px rgb(16 24 40 / 14%); font-family:"DM Sans",sans-serif; }.message-notification-title { margin:0; padding:12px 14px 8px; color:#667085; font-size:11px; font-weight:700; letter-spacing:.7px; text-transform:uppercase; }.message-notification-item,.message-notification-all { display:flex; width:100%; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; color:#172033; font-size:13px; text-align:left; }.message-notification-item:hover,.message-notification-all:hover { background:#f5f8ff; }.message-notification-item strong { display:grid; min-width:21px; height:21px; place-items:center; border-radius:999px; background:#2457d6; color:#fff; font-size:11px; }.message-notification-all { border-top:1px solid #e4e7ec; color:#2457d6; font-weight:700; }
</style>
