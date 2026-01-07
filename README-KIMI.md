# Kimi AI Integration Guide

## Overview

This WeChat Mini Program has been integrated with Kimi AI (月之暗面) for psychological counseling and emotional support. The AI acts as a professional, warm, and empathetic psychological counselor.

## Features

- **Psychological Counseling Focus**: The AI is specifically prompted to provide psychological counseling with empathy and professional guidance
- **Conversation Context**: Maintains conversation history for contextual responses
- **Error Handling**: Automatic retry mechanism for failed requests
- **Typing Effect**: Smooth streaming animation for AI responses
- **Multi-entry Support**: Can be accessed from multiple pages (Index, Calendar, Profile)

## API Configuration

### Kimi AI API Details

- **API Endpoint**: `https://api.moonshot.cn/v1/chat/completions`
- **Model**: `moonshot-v1-8k`
- **API Key**: Stored in `utils/kimi-ai.js`

### Changing the API Key

To update the API key, edit the file `utils/kimi-ai.js`:

```javascript
const KIMI_API_KEY = 'your-new-api-key-here';
```

> ⚠️ **Security Note**: In production, consider storing the API key in environment variables or backend configuration instead of hardcoding it in the frontend.

## System Prompt

The AI is configured with a comprehensive system prompt that defines its role as a psychological counselor. The prompt emphasizes:

1. **Listening & Understanding**: Non-judgmental listening and acceptance
2. **Emotional Support**: Helping users identify and express emotions
3. **Gentle Guidance**: Non-directive exploration of feelings
4. **Professional Advice**: Psychology-based strategies and coping methods
5. **Positive Empowerment**: Discovering inner strength and resources

### Customizing the System Prompt

To modify the AI's behavior, edit the `SYSTEM_PROMPT` constant in `utils/kimi-ai.js`.

## Usage

### Basic Integration

```javascript
// Import the module
const kimiAI = require('../../utils/kimi-ai');

// Initialize conversation
kimiAI.initConversation();

// Get welcome message
const welcome = kimiAI.getWelcomeMessage();

// Send user message and get response
try {
    const response = await kimiAI.sendMessage(userInput);
    // Handle response
} catch (error) {
    // Handle error
}
```

### Conversation Management

```javascript
// Get conversation history (excludes system prompt)
const history = kimiAI.getHistory();

// Clear conversation and restart
kimiAI.clearHistory();
```

## Navigation Flow

The chat page can be accessed from multiple entry points:

1. **Index Page**: Click "去聊聊" button
2. **Calendar Page**: Click "去成长" button (日视图 empty state)
3. **Profile Page**: Click "💛 成长陪伴" feature item

Each entry point passes a `from` parameter to track the user's journey.

## Error Handling

The integration includes comprehensive error handling:

- **Network Timeout**: 30-second timeout with user-friendly error message
- **API Errors**: Displays specific error messages
- **Retry Mechanism**: Users can tap "点击重试" to resend failed messages
- **Offline Detection**: Handles network connection failures gracefully

## API Limits & Considerations

### Token Management

The conversation history is automatically managed to stay within token limits:
- System prompt is always preserved
- Only the most recent 20 messages are kept
- Older messages are automatically pruned

### Rate Limiting

If you encounter rate limiting errors, consider:
1. Adding delay between requests
2. Implementing request queuing
3. Upgrading your Kimi AI plan

### Cost Optimization

To optimize API costs:
1. Monitor token usage via Kimi AI dashboard
2. Adjust `max_tokens` parameter in `kimi-ai.js` (currently set to 800)
3. Consider caching common responses
4. Implement conversation session limits

## Troubleshooting

### Issue: "AI响应格式错误"

**Cause**: Kimi API returned unexpected response format

**Solution**:
1. Check API key validity
2. Verify API endpoint is correct
3. Check console logs for detailed error
4. Ensure Kimi AI service is operational

### Issue: "网络连接超时"

**Cause**: Request took longer than 30 seconds

**Solution**:
1. Check internet connection
2. Try reducing `max_tokens` parameter
3. Check Kimi AI service status
4. Increase timeout in `kimi-ai.js` if needed

### Issue: Messages not getting context

**Cause**: Conversation history not being maintained

**Solution**:
1. Ensure `kimiAI.initConversation()` is called in `onLoad()`
2. Check that messages are being added to history correctly
3. Verify history isn't being cleared unintentionally

## Testing

### Test Scenarios

1. **Basic Conversation**:
   - Send a simple greeting
   - Verify AI responds empathetically
   - Check conversation flows naturally

2. **Psychological Topics**:
   - Discuss emotional issues
   - Verify responses are counseling-focused
   - Check for appropriate guidance

3. **Error Recovery**:
   - Disable network connection
   - Send a message
   - Verify error message appears
   - Re-enable network and use retry button

4. **Long Conversations**:
   - Send 25+ messages
   - Verify history pruning works
   - Check context is still maintained

## Future Enhancements

Potential improvements to consider:

1. **Conversation Persistence**: Save chat history to local storage
2. **Multi-session Support**: Allow users to have multiple conversation threads
3. **Voice Input**: Integrate speech-to-text for voice messages
4. **Emotion Tracking**: Analyze conversation to update emotion calendar
5. **Crisis Detection**: Identify crisis situations and suggest professional help
6. **Backend Proxy**: Move API calls to backend for better security

## Support

For issues related to:
- **Kimi AI API**: Contact Moonshot AI support
- **Mini Program Integration**: Check WeChat Developer documentation
- **This Implementation**: Review code comments and error logs

---

**Last Updated**: 2026-01-07
**Version**: 1.0
