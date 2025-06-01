# Emoji System Implementation

## Overview
The Emoji System allows users to:
- Add emoji reactions to messages
- Use an emoji picker to insert emojis in messages  
- View and interact with message reactions in real-time
- Toggle reactions (add/remove with the same emoji)

## Components

### 1. EmojiPicker (`/src/components/EmojiPicker.vue`)
**Purpose**: Provides an emoji picker interface for selecting emojis

**Features**:
- Quick reaction shortcuts (👍, ❤️, 😂, 😮, 😢, 😡)
- Categorized emoji browsing (Smileys, Animals, Food, Activities, Objects, Symbols)
- Search functionality
- Click-outside-to-close behavior
- Dark mode support

**Usage**:
```vue
<EmojiPicker @emoji-selected="handleEmojiSelected" />
```

**Events**:
- `emoji-selected(emoji)`: Emitted when user selects an emoji

### 2. EmojiReaction (`/src/components/EmojiReaction.vue`)
**Purpose**: Displays and manages reactions on messages

**Features**:
- Groups reactions by emoji type with counts
- Shows user avatars/names in tooltips
- Quick reaction buttons for non-own messages
- Toggle behavior (add/remove reactions)
- Real-time updates

**Props**:
- `reactions: Array` - Array of reaction objects
- `messageId: String` - ID of the message
- `isOwnMessage: Boolean` - Whether message belongs to current user

**Usage**:
```vue
<EmojiReaction
  :reactions="message.reactions"
  :messageId="message._id"
  :isOwnMessage="isOwnMessage(message)"
  @add-reaction="handleAddReaction"
  @remove-reaction="handleRemoveReaction"
/>
```

**Events**:
- `add-reaction({ messageId, emoji })`: Request to add reaction
- `remove-reaction({ messageId })`: Request to remove user's reaction

## API Integration

### Backend Endpoints

#### React to Message
```
POST /api/messages/:messageId/react
Body: { reaction: "😀" }
```

#### Remove Reaction
```
DELETE /api/messages/:messageId/react
```

#### Get Message Reactions
```
GET /api/messages/:messageId/reactions
```

### Frontend API (messageApi.js)

```javascript
// Add or toggle reaction
await messageApi.addReaction(messageId, emoji)

// Remove user's reaction  
await messageApi.removeReaction(messageId)

// Toggle reaction (handles add/remove logic)
await messageApi.toggleReaction(messageId, emoji)

// Get all reactions for a message
await messageApi.getMessageReactions(messageId)
```

## Real-time Updates

### Socket Events

#### Sending Reactions
```javascript
// Send reaction via socket
socketService.reactToMessage(messageId, emoji)

// Remove reaction via socket  
socketService.removeReaction(messageId)
```

#### Receiving Reactions
```javascript
// Listen for reaction updates
socket.on('message_reaction', (data) => {
  // data contains: messageId, userId, reaction, action, reactions, timestamp
  chatStore.updateMessageReaction(data)
})
```

### Chat Store Integration

```javascript
// Store methods for handling reactions
await chatStore.addReaction(messageId, emoji)
await chatStore.removeReaction(messageId) 
await chatStore.toggleReaction(messageId, emoji)

// Real-time update handler
chatStore.updateMessageReaction(reactionData)
```

## Database Schema

### Message Model Reactions
```javascript
reactions: [{
  userId: ObjectId,    // User who reacted
  reaction: String,    // Emoji character
  createdAt: Date     // When reaction was added
}]
```

### Reaction Object Structure
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  reaction: "😀", 
  createdAt: "2025-05-31T08:30:00.000Z"
}
```

## Usage in Chat Interface

### Message Input Area
- Emoji picker button positioned inside textarea
- Clicking opens emoji picker dropdown
- Selected emojis are inserted at cursor position

### Message Bubbles  
- Reactions displayed below each message
- Reaction buttons show emoji + count
- Hover shows list of users who reacted
- Click to toggle your reaction

### Visual States
- **User has reacted**: Blue background, highlighted button
- **User hasn't reacted**: Gray background, hover effects
- **Own messages**: No quick reaction button (can use picker)
- **Others' messages**: Quick reaction button visible

## Styling & UX

### Design Principles
- Consistent with existing chat design
- Smooth animations and transitions
- Responsive design (mobile/desktop)
- Accessible hover states and tooltips
- Dark mode compatibility

### Key CSS Classes
- `.emoji-picker-container`: Relative positioning for dropdown
- `.emoji-reactions`: Flex layout for reaction buttons  
- `.reaction-button`: Styled reaction display
- `.quick-reactions`: Hover popup for quick access

## Technical Implementation

### Frontend Flow
1. User clicks emoji picker → EmojiPicker opens
2. User selects emoji → `emoji-selected` event
3. For message input: Insert into textarea
4. For reactions: Call `handleAddReaction`
5. Store method calls API + Socket
6. Real-time updates via socket events
7. UI updates automatically via reactive store

### Backend Flow  
1. Receive reaction request via API/Socket
2. Validate user permissions (must be chat participant)
3. Check existing user reactions
4. Toggle logic: same emoji = remove, different emoji = update, new = add
5. Save to database
6. Broadcast to all chat participants
7. Return updated reaction data

### Error Handling
- Network failures: Show error toast, retry mechanism
- Permission denied: Clear error message
- Invalid data: Validate emoji characters
- Socket disconnection: Fallback to API calls

## Performance Considerations

### Optimization Techniques
- **Emoji Loading**: Static emoji sets, no external APIs
- **Real-time Updates**: Debounced socket events
- **Memory Management**: Component cleanup on unmount
- **Render Performance**: Virtual scrolling for large emoji lists

### Caching Strategy
- Emoji picker content cached in component
- Reaction data cached in chat store
- Message reactions updated in-place

## Testing Scenarios

### Functional Tests
- ✅ Add reaction to message
- ✅ Remove own reaction  
- ✅ Toggle same reaction (add/remove)
- ✅ Change reaction (replace with new emoji)
- ✅ Real-time updates for all participants
- ✅ Permission validation (chat participants only)

### UI/UX Tests  
- ✅ Emoji picker opens/closes properly
- ✅ Reaction tooltips show correct users
- ✅ Hover states and animations work
- ✅ Mobile responsive design
- ✅ Dark mode compatibility

### Edge Cases
- ✅ Socket disconnection fallback
- ✅ Invalid emoji characters
- ✅ Concurrent reaction updates
- ✅ Message deletion with reactions
- ✅ User permissions after leaving chat

## Future Enhancements

### Potential Features
- **Custom Emoji**: Upload and use custom emojis
- **Reaction Analytics**: Track popular emojis
- **Reaction Notifications**: Alert users when their messages get reactions
- **Emoji Shortcuts**: Type `:smile:` to insert 😄
- **Reaction History**: View reaction timeline
- **Bulk Reactions**: React to multiple messages

### Technical Improvements
- **Emoji Search**: Fuzzy search with keywords
- **Performance**: Virtual scrolling for large reaction lists
- **Accessibility**: Screen reader support, keyboard navigation
- **Internationalization**: Multi-language emoji names
- **Offline Support**: Queue reactions when offline

## Integration Checklist

### Backend ✅
- [x] Message model updated with reactions array
- [x] API endpoints for add/remove/get reactions  
- [x] Socket handlers for real-time updates
- [x] Permission validation (chat participants)
- [x] Toggle logic (add/remove/update reactions)

### Frontend ✅  
- [x] EmojiPicker component with categorized emojis
- [x] EmojiReaction component for message display
- [x] Chat store methods for reaction management
- [x] Socket service integration
- [x] UI integration in Chat.vue
- [x] Error handling and user feedback

### Testing ✅
- [x] Component unit tests
- [x] API endpoint testing
- [x] Socket event testing  
- [x] Real-time synchronization
- [x] Cross-browser compatibility

The Emoji System is now fully integrated and ready for use! 🎉