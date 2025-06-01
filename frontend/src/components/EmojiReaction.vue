<template>
  <div class="emoji-reactions">
    <!-- Reaction buttons for each unique emoji -->
    <div v-if="groupedReactions.length > 0" class="flex flex-wrap gap-1 mt-2">
      <button
        v-for="reactionGroup in groupedReactions"
        :key="reactionGroup.emoji"
        @click="toggleReaction(reactionGroup.emoji)"
        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
        :class="[
          reactionGroup.hasUserReacted
            ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
        ]"
        :title="getReactionTooltip(reactionGroup)"
      >
        <span class="mr-1">{{ reactionGroup.emoji }}</span>
        <span>{{ reactionGroup.count }}</span>
      </button>
    </div>

    <!-- Quick reaction button -->
    <button
      v-if="!isOwnMessage"
      @click="showQuickReactions = !showQuickReactions"
      class="inline-flex items-center justify-center w-6 h-6 mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Add reaction"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
      </svg>
    </button>

    <!-- Quick reactions popup -->
    <div
      v-if="showQuickReactions"
      class="absolute z-50 flex space-x-1 p-2 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
      @click.stop
    >
      <button
        v-for="emoji in quickReactions"
        :key="emoji"
        @click="addReaction(emoji)"
        class="text-lg p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :title="`React with ${emoji}`"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/store/auth'

export default {
  name: 'EmojiReaction',
  props: {
    reactions: {
      type: Array,
      default: () => []
    },
    messageId: {
      type: String,
      required: true
    },
    isOwnMessage: {
      type: Boolean,
      default: false
    }
  },
  emits: ['add-reaction', 'remove-reaction'],
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const showQuickReactions = ref(false)
    
    // Quick reactions (most commonly used emojis)
    const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡']

    // Group reactions by emoji and count them
    const groupedReactions = computed(() => {
      const groups = {}
      
      props.reactions.forEach(reaction => {
        const emoji = reaction.reaction
        if (!groups[emoji]) {
          groups[emoji] = {
            emoji,
            count: 0,
            users: [],
            hasUserReacted: false
          }
        }
        
        groups[emoji].count++
        groups[emoji].users.push(reaction.userId)
        
        // Check if current user has reacted with this emoji
        if (reaction.userId === authStore.user?._id) {
          groups[emoji].hasUserReacted = true
        }
      })
      
      // Convert to array and sort by count (descending)
      return Object.values(groups).sort((a, b) => b.count - a.count)
    })

    const toggleReaction = (emoji) => {
      const reactionGroup = groupedReactions.value.find(group => group.emoji === emoji)
      
      if (reactionGroup && reactionGroup.hasUserReacted) {
        // User already reacted with this emoji, remove it
        emit('remove-reaction', { messageId: props.messageId, emoji })
      } else {
        // Add reaction
        emit('add-reaction', { messageId: props.messageId, emoji })
      }
    }

    const addReaction = (emoji) => {
      emit('add-reaction', { messageId: props.messageId, emoji })
      showQuickReactions.value = false
    }

    const getReactionTooltip = (reactionGroup) => {
      const userNames = props.reactions
        .filter(r => r.reaction === reactionGroup.emoji)
        .map(r => {
          if (r.userId === authStore.user?._id) return 'You'
          return r.user?.firstName || 'Unknown User'
        })
      
      if (userNames.length === 1) {
        return `${userNames[0]} reacted with ${reactionGroup.emoji}`
      } else if (userNames.length === 2) {
        return `${userNames.join(' and ')} reacted with ${reactionGroup.emoji}`
      } else if (userNames.length > 2) {
        const others = userNames.length - 2
        return `${userNames[0]}, ${userNames[1]} and ${others} other${others > 1 ? 's' : ''} reacted with ${reactionGroup.emoji}`
      }
      
      return `React with ${reactionGroup.emoji}`
    }

    const handleClickOutside = (event) => {
      if (!event.target.closest('.emoji-reactions')) {
        showQuickReactions.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      showQuickReactions,
      quickReactions,
      groupedReactions,
      toggleReaction,
      addReaction,
      getReactionTooltip
    }
  }
}
</script>

<style scoped>
.emoji-reactions {
  position: relative;
}
</style>