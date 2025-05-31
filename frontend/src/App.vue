<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* Global styles to prevent any page scrolling */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* Prevent page scroll */
}

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden; /* Prevent app scroll */
}
</style>