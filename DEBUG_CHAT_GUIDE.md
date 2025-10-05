# Quick Chat Debug Guide

## How to Debug Chat Issues

### Step 1: Open Both Chat Windows
1. Open **Farmer/Owner Chat** in one browser window (or tab)
2. Open **Doctor Chat** in another browser window (or tab)
3. Open **Developer Console** (F12) in **BOTH** windows

### Step 2: Check Connection
Look for these logs in **BOTH** consoles:
```
🔌 [Farmer/Doctor] Attempting socket connection...
✅ [Farmer/Doctor] Socket connected successfully: { socketId: "..." }
✅ [Farmer/Doctor] Connection state set to true
📡 [Farmer/Doctor] Setting up event listeners...
```

**If missing:** Socket connection failed. Check:
- Backend server is running
- Socket URL is correct (`NEXT_PUBLIC_SOCKET_URL`)
- Network connection

### Step 3: Check Conversation Join
When you open a chat, look for:
```
🔵 [Farmer/Doctor] joinConversation called: { conversationId: "xyz", isConnected: true, ... }
🚪 [Farmer/Doctor Socket] Emitting join_conversation: { conversationId: "xyz", ... }
⬆️ [Farmer/Doctor Socket] Emitting join_conversation: { conversationId: "xyz" }
```

**Critical Check:** Both farmer and doctor should show the **SAME conversationId**!

**If different conversationIds:**
- They're in different rooms - messages won't sync
- Check how conversation is created/selected

### Step 4: Send Test Message from Farmer
Type a message in **Farmer Chat** and send. Watch **Farmer Console**:

```
📤 [Farmer] sendMessage called: { conversationId: "xyz", isConnected: true, textLength: 5, ... }
💬 [Farmer] Created optimistic message: { id: "temp-...", ... }
📝 [Farmer] Adding optimistic message to state. Current messages: 3
🚀 [Farmer] Emitting send_message event to socket
📮 [Farmer Socket] Emitting send_message: { conversationId: "xyz", textLength: 5, ... }
⬆️ [Farmer Socket] Emitting send_message: { conversationId: "xyz", text: "hello", ... }
```

### Step 5: Watch for Server Response
**In Farmer Console** (after ~1 second):
```
⬇️ [Farmer Socket] Received new_message: { messageId: "real-id-123", ... }
📨 [Farmer] handleNewMessage triggered: { messageId: "real-id-123", conversationId: "xyz", senderRole: "OWNER", ... }
🔄 [Farmer] Replacing optimistic message with real: { optimisticId: "temp-...", realId: "real-id-123", ... }
```

**In Doctor Console** (should appear at same time):
```
⬇️ [Doctor Socket] Received new_message: { messageId: "real-id-123", ... }
📨 [Doctor] handleNewMessage triggered: { messageId: "real-id-123", conversationId: "xyz", senderRole: "OWNER", ... }
✅ [Doctor] Adding NEW message to state: { messageId: "real-id-123", senderRole: "OWNER", totalAfter: 4 }
```

### Step 6: Identify the Problem

#### Problem 1: Doctor never receives message
**Symptom:** No `⬇️ [Doctor Socket] Received new_message` in doctor console

**Cause:** Server/socket issue - message not broadcast

**Check:**
- Are both using the same socket server?
- Is the backend broadcasting `new_message` events?
- Check server logs

#### Problem 2: Doctor receives but message not shown in UI
**Symptom:** 
```
⬇️ [Doctor Socket] Received new_message: { ... }
📨 [Doctor] handleNewMessage triggered: { ... }
❌ [Doctor] Message not for current conversation: { messageConversationId: "abc", currentConversationId: "xyz" }
```

**Cause:** ConversationId mismatch - doctor is in wrong room!

**Solution:** Verify both sides joined the same conversationId (see Step 3)

#### Problem 3: Message marked as failed after 10 seconds
**Symptom:**
```
⏰ [Farmer] Message timeout - marking as failed: temp-...
```

**Cause:** Server took >10 seconds to respond OR response never arrived

**Check:**
- Look for `⬇️ [Farmer Socket] Received new_message` - if missing, server didn't respond
- Check server performance/logs

#### Problem 4: Duplicate messages
**Symptom:**
```
⚠️ [Doctor] Duplicate message rejected: real-id-123
```

**Cause:** Normal - this is protection working. Server sent message twice.

**No action needed** unless messages still appear twice in UI.

#### Problem 5: Socket not connected
**Symptom:**
```
⚠️ [Farmer] Cannot join - socket not connected
⚠️ [Farmer Socket] Cannot emit join_conversation: Socket not connected
```

**Cause:** Socket connection failed or disconnected

**Solution:**
1. Check Step 2 logs
2. Verify socket URL
3. Check network tab for WebSocket connection
4. Restart app

## Quick Checklist

- [ ] Both sides show socket connected with different socketIds
- [ ] Both sides show **SAME** conversationId when joining
- [ ] Sender shows optimistic message immediately
- [ ] Sender receives server response within 2 seconds
- [ ] Recipient receives `⬇️ Socket Received new_message`
- [ ] Recipient shows `✅ Adding NEW message to state`
- [ ] No `❌` errors in console
- [ ] Message appears in both UIs

## Console Filter Tips

**To see only Farmer logs:**
```
Filter: [Farmer]
```

**To see only Doctor logs:**
```
Filter: [Doctor]
```

**To see only new messages:**
```
Filter: new_message
```

**To see only errors:**
```
Filter: ❌
```

## Expected Timing

- Socket connect: < 1 second
- Join conversation: < 100ms
- Message send → optimistic UI: instant (< 10ms)
- Message send → server response: 100-500ms
- Message receive on other side: 100-500ms (same time as sender confirmation)
- Optimistic → real replacement: instant when response arrives

If any step takes longer, investigate that specific area.

