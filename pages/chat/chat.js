// pages/chat/chat.js
const kimiAI = require('../../utils/kimi-ai');
const { formatTime } = require('../../utils/util');

Page({
    data: {
        messages: [], // { type: 'user'|'ai', content: '', time: '', error: false }
        inputValue: '',
        scrollTop: 0,
        isTyping: false,
        fromPage: '' // Track where user came from
    },

    onLoad(options) {
        // Get entry point
        const fromPage = options.from || 'index';
        this.setData({ fromPage });

        // Initialize Kimi AI conversation
        kimiAI.initConversation();

        // Show welcome message
        this.addMessage({
            type: 'ai',
            content: kimiAI.getWelcomeMessage()
        });
    },

    handleInput(e) {
        this.setData({
            inputValue: e.detail.value
        });
    },

    async handleSend() {
        const content = this.data.inputValue.trim();
        if (!content) return;

        // Add user message
        this.addMessage({
            type: 'user',
            content
        });

        this.setData({ inputValue: '', isTyping: true });

        try {
            // Call Kimi AI
            const aiResponse = await kimiAI.sendMessage(content);

            this.setData({ isTyping: false });

            // Stream the reply for better UX
            this.streamReply(aiResponse);

        } catch (err) {
            this.setData({ isTyping: false });

            console.error('Kimi AI error:', err);

            // Add error message with retry option
            this.addMessage({
                type: 'ai',
                content: err.message || '抱歉，我遇到了一些问题。请稍后再试。',
                error: true,
                retryContent: content
            });
        }
    },

    // Retry failed message
    handleRetry(e) {
        const index = e.currentTarget.dataset.index;
        const message = this.data.messages[index];

        if (message.retryContent) {
            // Remove error message
            const messages = this.data.messages.filter((_, i) => i !== index);
            this.setData({ messages });

            // Retry sending
            this.setData({ inputValue: message.retryContent });
            this.handleSend();
        }
    },

    addMessage(msg) {
        const now = new Date();
        // Only show time if > 5 mins from last message
        const lastMsg = this.data.messages[this.data.messages.length - 1];
        let showTime = '';

        if (!lastMsg || (now - new Date(lastMsg._rawTime) > 5 * 60 * 1000)) {
            showTime = formatTime(now);
        }

        const newMsg = {
            ...msg,
            time: showTime,
            _rawTime: now
        };

        const messages = [...this.data.messages, newMsg];
        this.setData({
            messages,
            scrollTop: messages.length * 1000 // Force scroll to bottom
        });
    },

    streamReply(fullText) {
        // Typing effect simulation
        let currentText = '';
        const chars = fullText.split('');
        let idx = 0;

        // Add empty AI message first
        const messages = [...this.data.messages, {
            type: 'ai',
            content: '',
            _rawTime: new Date()
        }];
        const msgIndex = messages.length - 1;
        this.setData({ messages });

        const timer = setInterval(() => {
            if (idx >= chars.length) {
                clearInterval(timer);
                return;
            }

            // Add 2-3 chars at a time for smoother effect
            const charsToAdd = chars.slice(idx, idx + 2).join('');
            currentText += charsToAdd;

            const upKey = `messages[${msgIndex}].content`;
            this.setData({
                [upKey]: currentText,
                scrollTop: (msgIndex + 1) * 1000
            });

            idx += 2;
        }, 30); // Faster streaming
    },

    toggleVoice() {
        wx.showToast({
            title: '语音输入功能开发中',
            icon: 'none'
        });
    },

    onUnload() {
        // Optional: Save conversation history when leaving
        // Could implement persistence here if needed
    }
})
