# Active Context - CurrentChat Persistence Issue

## Current Problem ✅ SOLVED
Mỗi lần F5 (refresh) thì currentChat không còn nữa, người dùng phải chọn lại chat.

## Previous Problem ✅ SOLVED
Sau khi gửi tin nhắn, message không hiển thị trong UI mặc dù API response thành công.

## API Response Analysis
```json
{
    "messages": [
        {
            "_id": "683a6a035dca5e694189316d",
            "chatId": "6839782702d8e4995af1abaf",
            "sender": {
                "_id": "68395ae37cc675045c8cb824",
                "firstName": "Tian",
                "lastName": "Phan",
                "email": "pntoan156@gmail.com"
            },
            "content": "Hello bé",
            "readBy": ["68395ae37cc675045c8cb826"],
            "messageType": "text",
            "attachments": [],
            "reactions": [],
            "edited": false,
            "createdAt": "2025-05-31T02:31:31.015Z",
            "updatedAt": "2025-05-31T03:00:25.929Z"
        }
    ],
    "count": 3,
    "hasNext": false,
    "hasPrev": false
}
```

## CurrentChat Persistence Issue ✅ SOLVED

### Root Cause
- Pinia store state không persist qua page refresh
- [`currentChat`](src/store/chat.js:11) gets reset to `null` khi F5
- User phải chọn lại chat mỗi lần refresh
- **Missing fetchMessages()**: CurrentChat được restore nhưng messages không được load

### Solution Applied ✅
1. **Added localStorage persistence**:
   - Store `currentChatId` và `currentChat` trong localStorage khi set
   - Restore từ localStorage khi init store
   
2. **Enhanced chat restoration**:
   - [`restoreCurrentChat()`](src/store/chat.js:61) - Restore saved chat after fetchChats
   - **FIXED**: Added `await this.fetchMessages(savedChat._id)` trong restore process
   - Update stored chat với fresh data từ server
   - Handle trường hợp chat không tồn tại nữa
   
3. **Improved Chat.vue mounting**:
   - Better handling của route params vs stored chat
   - Fetch chats nếu chưa load khi mount
   - Added fallback để fetch messages nếu current chat có nhưng messages empty
   - Proper sync giữa route và currentChat state

### Key Fix
**The critical missing piece**: When restoring currentChat from localStorage, messages weren't being fetched automatically. Now [`restoreCurrentChat()`](src/store/chat.js:81) calls `fetchMessages()` ensuring the API call `http://localhost:5000/api/messages/{chatId}?page=1&limit=50` happens on F5.

### Previous Message Issue ✅ SOLVED
**Root Cause**: API response structure sai assumption - message data nằm trong `messageData` field.

**Solution**: Fixed [`sendMessage()`](src/store/chat.js:174) để extract từ `response.data.messageData`

## Debug Process 🔍
Để debug vấn đề:
1. Mở browser console
2. Gửi một tin nhắn
3. Theo dõi logs với emoji prefixes:
   - 🚀 = Bắt đầu gửi message
   - 📤 = API call
   - 📥 = API response
   - 📩 = Message extracted
   - 🔧 = Adding chatId
   - 📝 = addMessage called
   - 📋 = Using chatId
   - ✅ = Success
   - ❌ = Error
   - 📊 = Messages count change
   - 📬 = Messages array change

## Implementation Details

### localStorage Keys
- `currentChatId`: Stores only the chat ID
- `currentChat`: Stores full chat object for immediate restoration

### Flow
1. User selects chat → [`setCurrentChat()`](src/store/chat.js:364) → Save to localStorage
2. Page refresh → Store init → Restore từ localStorage nếu có
3. [`fetchChats()`](src/store/chat.js:40) complete → [`restoreCurrentChat()`](src/store/chat.js:67) validates và updates
4. Chat.vue mount → Sync với route params nếu cần

### Debug Logs
- 💾 = Persist to localStorage
- 🗑️ = Clear from localStorage
- 🔄 = Restore attempt
- ✅ = Successfully restored
- ❌ = Restore failed (chat not found)