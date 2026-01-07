// pages/calendar/calendar.js

Page({
    data: {
        viewMode: 'day', // 'day' or 'month'
        currentMonth: new Date().getMonth() + 1,
        currentDay: new Date().getDate(),
        weekDays: [],
        days: [],
        selectedDay: new Date().getDate()
    },

    onLoad() {
        this.generateWeekDays();
        this.generateCalendar(new Date());
    },

    generateWeekDays() {
        const today = new Date();
        const weekDays = [];

        // Generate 7 days centered on today
        for (let i = -3; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            weekDays.push({
                day: date.getDate(),
                isToday: i === 0,
                hasRecord: Math.random() > 0.5 && i < 0 // Mock: past days have records
            });
        }

        this.setData({ weekDays });
    },

    generateCalendar(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const today = new Date();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];

        // Previous month days
        const prevMonthDays = firstDay.getDay();
        const prevLastDay = new Date(year, month, 0).getDate();
        for (let i = prevMonthDays - 1; i >= 0; i--) {
            days.push({
                day: prevLastDay - i,
                isOtherMonth: true
            });
        }

        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({
                day: i,
                isToday: today.getDate() === i && today.getMonth() === month && today.getFullYear() === year
            });
        }

        // Next month days
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                day: i,
                isOtherMonth: true
            });
        }

        this.setData({ days });
    },

    switchView(e) {
        const mode = e.currentTarget.dataset.mode;
        this.setData({ viewMode: mode });
    },

    selectDay(e) {
        const day = e.currentTarget.dataset.day;
        this.setData({ selectedDay: day });
    },

    goToChat() {
        wx.navigateTo({
            url: '/pages/chat/chat?from=calendar'
        });
    }
});
