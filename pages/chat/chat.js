// pages/chat/chat.js
const kimiAI = require('../../utils/kimi-ai');
const { formatTime } = require('../../utils/util');
const { parseMarkdown } = require('../../utils/markdown-parser');

Page({
    data: {
        messages: [], // { type: 'user'|'ai', content: '', time: '', error: false }
        inputValue: '',
        scrollToView: '', // 用于滚动到指定元素
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

        // Parse markdown for AI messages, but keep original text
        const content = msg.type === 'ai' ? parseMarkdown(msg.content) : msg.content;

        const newMsg = {
            ...msg,
            content,  // Parsed HTML for display
            _originalContent: msg.content,  // Keep original text
            time: showTime,
            _rawTime: now
        };

        const messages = [...this.data.messages, newMsg];
        const newIndex = messages.length - 1;
        this.setData({
            messages,
            scrollToView: '' // 先清空，确保能触发滚动
        }, () => {
            // 延迟设置滚动目标，确保渲染完成后滚动
            setTimeout(() => {
                this.setData({
                    scrollToView: `msg-${newIndex}`
                });
            }, 50);
        });
    },

    streamReply(fullText) {
        // Typing effect simulation
        let currentText = '';
        const chars = fullText.split('');
        let idx = 0;

        // Add initial AI message with first character to avoid empty message
        const now = new Date();
        const messages = [...this.data.messages, {
            type: 'ai',
            content: parseMarkdown(chars[0] || ''),
            _originalContent: chars[0] || '',
            _rawTime: now
        }];
        const msgIndex = messages.length - 1;
        this.setData({ messages });

        currentText = chars[0] || '';
        idx = 1; // Start from second character

        const timer = setInterval(() => {
            if (idx >= chars.length) {
                clearInterval(timer);
                return;
            }

            // Add 2-3 chars at a time for smoother effect
            const charsToAdd = chars.slice(idx, idx + 2).join('');
            currentText += charsToAdd;

            // Parse markdown for current text
            const parsedContent = parseMarkdown(currentText);

            const contentKey = `messages[${msgIndex}].content`;
            const originalKey = `messages[${msgIndex}]._originalContent`;
            this.setData({
                [contentKey]: parsedContent,
                [originalKey]: currentText,
                scrollToView: '' // 先清空
            }, () => {
                // 滚动到当前消息
                this.setData({
                    scrollToView: `msg-${msgIndex}`
                });
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
