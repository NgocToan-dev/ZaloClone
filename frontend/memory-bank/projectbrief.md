# ZaloClone Frontend - Project Brief

## Project Overview
ZaloClone là một ứng dụng chat real-time được xây dựng với Vue 3, tương tự như Zalo.

## Core Features
- Real-time messaging với Socket.IO
- User authentication
- Chat management (tạo, archive, unarchive)
- Message operations (send, edit, delete, search)
- Typing indicators
- Message read status
- User presence (online/offline)

## Current Issue
Người dùng báo cáo rằng sau khi gửi tin nhắn, không thấy message được hiển thị trong UI, mặc dù API trả về data thành công.

## Tech Stack
- Frontend: Vue 3 + Pinia + Tailwind CSS
- Backend: Node.js + Socket.IO
- Real-time: Socket.IO client-server