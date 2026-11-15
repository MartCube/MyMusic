<script setup lang="ts">
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
const route = useRoute()
const inLibrary = () => ['library', 'album', 'artist', 'playlist'].includes(String(route.name))
</script>

<template>
  <nav class="tabbar" aria-label="Main">
    <span class="brand">MyMusic</span>
    <RouterLink :to="{ name: 'library' }" :class="{ on: inLibrary() }"><Icon name="library" :size="24" />Library</RouterLink>
    <RouterLink :to="{ name: 'search' }" :class="{ on: route.name === 'search' }"><Icon name="search" :size="24" />Search</RouterLink>
    <RouterLink :to="{ name: 'import' }" class="only-wide" :class="{ on: route.name === 'import' }"><Icon name="plus" :size="24" />Import music</RouterLink>
    <RouterLink :to="{ name: 'settings' }" :class="{ on: route.name === 'settings' || route.name === 'shortcuts' }"><Icon name="settings" :size="24" />Settings</RouterLink>
  </nav>
</template>
