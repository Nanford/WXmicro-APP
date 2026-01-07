// pages/chat/chat.js
const { post } = require('../../utils/request');
const { formatTime } = require('../../utils/util');

Page({
    data: {
        messages: [], // { type: 'user'|'ai', content: '', time: '' }
        inputValue: '',
        scrollTop: 0,
        isTyping: false
    },

    onLoad() {
        // Initial greeting
        this.addMessage({
            type: 'ai',
            content: '你好！我是你的AI伙伴，今天想聊点什么？'
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

        this.setData({ inputValue: '' });
        this.setData({ isTyping: true });

        try {
            // Simulate network delay and typing
            setTimeout(async () => {
                const res = await post('/chat/send', { message: content });
                this.setData({ isTyping: false });

                if (res.code === 200) {
                    const reply = res.data.reply || '正在思考中...';
                    this.streamReply(reply);
                }
            }, 1000);
        } catch (err) {
            this.setData({ isTyping: false });
            wx.showToast({
                title: '发送失败',
                icon: 'none'
            });
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
        // Simple typing effect simulation
        let currentText = '';
        const chars = fullText.split('');
        let idx = 0;

        // Add empty AI message first
        const messages = [...this.data.messages, { type: 'ai', content: '', _rawTime: new Date() }];
        const msgIndex = messages.length - 1;
        this.setData({ messages });

        const timer = setInterval(() => {
            if (idx >= chars.length) {
                clearInterval(timer);
                return;
            }
            currentText += chars[idx];

            const upKey = `messages[${msgIndex}].content`;
            this.setData({
                [upKey]: currentText,
                scrollTop: (msgIndex + 1) * 1000
            });

            idx++;
        }, 50);
    },

    toggleVoice() {
        wx.showToast({
            title: '语音输入功能开发中',
            icon: 'none'
        });
    }
})
