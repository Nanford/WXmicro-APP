// AI彩虹老师管理后台 - Apple风格Bento Grid设计
const API_BASE = '/api/admin';
let token = localStorage.getItem('admin_token');
let mediaList = []; // 缓存素材列表
let imagePickerCallback = null; // 图片选择回调
let selectedImages = []; // 选中的图片

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    if (token) {
        showApp();
        loadDashboard();
    } else {
        showLogin();
    }

    // 登录表单提交
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // 导航点击
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
        });
    });

    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // AI配置表单
    document.getElementById('ai-config-form').addEventListener('submit', saveAIConfig);

    // 拖拽上传
    setupDragDrop();
});

// ============================================
// 工具函数
// ============================================
function showLogin() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function api(endpoint, options = {}) {
    const url = API_BASE + endpoint;
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: { ...headers, ...options.headers }
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            handleLogout();
            throw new Error('登录已过期，请重新登录');
        }

        if (!response.ok) {
            throw new Error(data.message || '请求失败');
        }

        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// ============================================
// 认证
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const response = await fetch(API_BASE + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorEl.textContent = data.message || '登录失败';
            return;
        }

        token = data.data.token;
        localStorage.setItem('admin_token', token);
        document.getElementById('admin-user').textContent = data.data.username;
        errorEl.textContent = '';
        showApp();
        loadDashboard();
        showToast('登录成功');
    } catch (error) {
        errorEl.textContent = '网络错误，请稍后重试';
    }
}

function handleLogout() {
    token = null;
    localStorage.removeItem('admin_token');
    showLogin();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// ============================================
// 页面导航
// ============================================
function showPage(pageName) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
    });

    // 切换页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${pageName}`).classList.add('active');

    // 更新标题
    const titles = {
        'dashboard': '仪表盘',
        'media': '素材库',
        'assessments': '测评管理',
        'recommendations': '推荐管理',
        'contents': '内容管理',
        'ai-config': 'AI配置',
        'settings': '系统设置'
    };
    document.getElementById('page-title').textContent = titles[pageName] || pageName;

    // 加载数据
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'media':
            loadMedia();
            break;
        case 'assessments':
            loadAssessments();
            break;
        case 'recommendations':
            loadRecommendations();
            break;
        case 'contents':
            loadContents();
            break;
        case 'ai-config':
            loadAIConfig();
            break;
        case 'settings':
            loadBackups();
            break;
    }
}

// ============================================
// 仪表盘
// ============================================
async function loadDashboard() {
    try {
        const { data } = await api('/stats');

        document.getElementById('stat-assessments').textContent = data.assessments.total;
        document.getElementById('stat-assessments-online').textContent = data.assessments.online;
        document.getElementById('stat-assessments-offline').textContent = data.assessments.offline;

        document.getElementById('stat-recommendations').textContent = data.recommendations.total;
        document.getElementById('stat-recommendations-online').textContent = data.recommendations.online;
        document.getElementById('stat-recommendations-offline').textContent = data.recommendations.offline;

        document.getElementById('stat-contents').textContent = data.contents.total;
        document.getElementById('stat-contents-online').textContent = data.contents.online;
        document.getElementById('stat-contents-offline').textContent = data.contents.offline;

        document.getElementById('stat-ai-status').textContent =
            data.aiConfig.enabled ? '已启用' : '已禁用';
        document.getElementById('stat-ai-model').textContent = `模型：${data.aiConfig.model}`;

        // 加载素材数量
        try {
            const mediaData = await api('/uploads');
            document.getElementById('stat-media').textContent = mediaData.data.total;
        } catch (e) {
            document.getElementById('stat-media').textContent = '0';
        }
    } catch (error) {
        console.error('加载仪表盘失败:', error);
    }
}

// ============================================
// 素材库
// ============================================
async function loadMedia() {
    try {
        const { data } = await api('/uploads');
        mediaList = data.list;
        const container = document.getElementById('media-library');

        if (data.list.length === 0) {
            container.innerHTML = '<p class="empty-text">暂无素材，点击上方按钮上传</p>';
            return;
        }

        container.innerHTML = data.list.map(item => `
            <div class="media-item" data-url="${item.url}" data-filename="${item.filename}">
                <img src="${item.url}" alt="${item.filename}" loading="lazy">
                <div class="media-info">${formatFileSize(item.size)}</div>
                <div class="media-overlay">
                    <div class="media-actions">
                        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); copyMediaUrl('${item.url}')" style="background: white;">复制</button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteMedia('${item.filename}')">删除</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载素材列表失败:', error);
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function uploadMedia(event) {
    const files = event.target.files;
    if (!files.length) return;

    let successCount = 0;
    for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(API_BASE + '/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (response.ok) successCount++;
        } catch (error) {
            console.error('上传失败:', error);
        }
    }

    showToast(`成功上传 ${successCount} 个文件`);
    loadMedia();
    event.target.value = '';
}

function copyMediaUrl(url) {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showToast('链接已复制');
    }).catch(() => {
        prompt('复制此链接:', fullUrl);
    });
}

async function deleteMedia(filename) {
    if (!confirm('确定要删除这个素材吗？')) return;

    try {
        await api(`/uploads/${filename}`, { method: 'DELETE' });
        showToast('素材删除成功');
        loadMedia();
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// 拖拽上传
function setupDragDrop() {
    const uploadArea = document.getElementById('media-upload-area');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        });
    });

    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) {
            const input = document.getElementById('media-upload');
            input.files = files;
            uploadMedia({ target: input });
        }
    });
}

// ============================================
// 图片选择器
// ============================================
async function openImagePicker(callback, multiple = false) {
    imagePickerCallback = callback;
    selectedImages = [];

    // 加载图片列表
    try {
        const { data } = await api('/uploads');
        const grid = document.getElementById('image-picker-grid');

        if (data.list.length === 0) {
            grid.innerHTML = '<p class="empty-text">暂无图片，请先在素材库上传</p>';
        } else {
            grid.innerHTML = data.list.map(item => `
                <div class="media-item" onclick="toggleImageSelection(this, '${item.url}')" data-url="${item.url}">
                    <img src="${item.url}" alt="${item.filename}" loading="lazy">
                </div>
            `).join('');
        }

        updatePickerCount();
        document.getElementById('image-picker-overlay').classList.remove('hidden');
    } catch (error) {
        showToast('加载图片失败', 'error');
    }
}

function toggleImageSelection(element, url) {
    const index = selectedImages.indexOf(url);
    if (index >= 0) {
        selectedImages.splice(index, 1);
        element.classList.remove('selected');
    } else {
        selectedImages.push(url);
        element.classList.add('selected');
    }
    updatePickerCount();
}

function updatePickerCount() {
    document.getElementById('picker-selected-count').textContent = `已选择 ${selectedImages.length} 张`;
}

function confirmImageSelection() {
    if (imagePickerCallback && selectedImages.length > 0) {
        imagePickerCallback(selectedImages[0]); // 目前只支持单选
    }
    closeImagePicker();
}

function closeImagePicker() {
    document.getElementById('image-picker-overlay').classList.add('hidden');
    imagePickerCallback = null;
    selectedImages = [];
}

// 生成带图片选择器的输入框HTML
function imageInputHtml(id, value, label) {
    return `
        <div class="form-group">
            <label>${label}</label>
            <div class="input-with-picker">
                <input type="text" id="${id}" value="${escapeHtml(value || '')}" placeholder="输入URL或从素材库选择">
                <button type="button" class="btn btn-outline btn-picker" onclick="openImagePicker((url) => document.getElementById('${id}').value = url)">
                    选择图片
                </button>
            </div>
        </div>
    `;
}

// ============================================
// 测评管理
// ============================================
async function loadAssessments() {
    const status = document.getElementById('assessment-status-filter').value;
    try {
        const { data } = await api(`/assessments?status=${status}`);
        const tbody = document.getElementById('assessments-table-body');

        if (data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-text">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = data.list.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${escapeHtml(item.title)}</td>
                <td>${escapeHtml(item.category || '--')}</td>
                <td>¥${item.price}</td>
                <td>${item.count || 0}</td>
                <td>
                    <span class="status-tag ${item.status === 'offline' ? 'status-offline' : 'status-online'}">
                        ${item.status === 'offline' ? '已下架' : '已上架'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-outline" onclick="openAssessmentModal(${item.id})">编辑</button>
                    <button class="btn btn-sm ${item.status === 'offline' ? 'btn-success' : 'btn-ghost'}" 
                            onclick="toggleAssessmentStatus(${item.id}, '${item.status === 'offline' ? 'online' : 'offline'}')">
                        ${item.status === 'offline' ? '上架' : '下架'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAssessment(${item.id})">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载测评列表失败:', error);
    }
}

async function openAssessmentModal(id = null) {
    const isEdit = id !== null;
    let item = {};

    if (isEdit) {
        try {
            const { data } = await api('/assessments');
            item = data.list.find(a => a.id === id) || {};
        } catch (error) {
            return;
        }
    }

    document.getElementById('modal-title').textContent = isEdit ? '编辑测评' : '添加测评';
    document.getElementById('modal-body').innerHTML = `
        <form id="assessment-form">
            <input type="hidden" id="assessment-id" value="${item.id || ''}">
            <div class="form-group">
                <label>标题 *</label>
                <input type="text" id="assessment-title" value="${escapeHtml(item.title || '')}" required>
            </div>
            <div class="form-group">
                <label>描述 *</label>
                <textarea id="assessment-desc" rows="3" required>${escapeHtml(item.desc || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>价格</label>
                    <input type="number" id="assessment-price" value="${item.price || 0}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>原价</label>
                    <input type="number" id="assessment-original-price" value="${item.originalPrice || 0}" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>分类</label>
                    <select id="assessment-category">
                        <option value="情绪管理" ${item.category === '情绪管理' ? 'selected' : ''}>情绪管理</option>
                        <option value="亲子教育" ${item.category === '亲子教育' ? 'selected' : ''}>亲子教育</option>
                        <option value="人际关系" ${item.category === '人际关系' ? 'selected' : ''}>人际关系</option>
                        <option value="其他" ${item.category === '其他' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>参与人数</label>
                    <input type="number" id="assessment-count" value="${item.count || 0}" min="0">
                </div>
            </div>
            ${imageInputHtml('assessment-image', item.image, '封面图片')}
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '添加'}</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">取消</button>
            </div>
        </form>
    `;

    document.getElementById('assessment-form').addEventListener('submit', saveAssessment);
    openModal();
}

async function saveAssessment(e) {
    e.preventDefault();
    const id = document.getElementById('assessment-id').value;
    const data = {
        title: document.getElementById('assessment-title').value,
        desc: document.getElementById('assessment-desc').value,
        price: parseFloat(document.getElementById('assessment-price').value),
        originalPrice: parseFloat(document.getElementById('assessment-original-price').value),
        category: document.getElementById('assessment-category').value,
        count: parseInt(document.getElementById('assessment-count').value),
        image: document.getElementById('assessment-image').value
    };

    try {
        if (id) {
            await api(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('测评更新成功');
        } else {
            await api('/assessments', { method: 'POST', body: JSON.stringify(data) });
            showToast('测评添加成功');
        }
        closeModal();
        loadAssessments();
    } catch (error) {
        console.error('保存失败:', error);
    }
}

async function toggleAssessmentStatus(id, status) {
    try {
        await api(`/assessments/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showToast(status === 'online' ? '已上架' : '已下架');
        loadAssessments();
    } catch (error) {
        console.error('状态更新失败:', error);
    }
}

async function deleteAssessment(id) {
    if (!confirm('确定要删除这个测评吗？此操作不可恢复。')) return;

    try {
        await api(`/assessments/${id}`, { method: 'DELETE' });
        showToast('测评删除成功');
        loadAssessments();
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// ============================================
// 推荐管理
// ============================================
async function loadRecommendations() {
    const status = document.getElementById('recommendation-status-filter').value;
    try {
        const { data } = await api(`/recommendations?status=${status}`);
        const tbody = document.getElementById('recommendations-table-body');

        if (data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-text">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = data.list.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${escapeHtml(item.tag || '--')}</td>
                <td>${escapeHtml(item.title)}</td>
                <td>${escapeHtml(item.desc).substring(0, 30)}...</td>
                <td>
                    <span class="status-tag ${item.status === 'offline' ? 'status-offline' : 'status-online'}">
                        ${item.status === 'offline' ? '已下架' : '已上架'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-outline" onclick="openRecommendationModal(${item.id})">编辑</button>
                    <button class="btn btn-sm ${item.status === 'offline' ? 'btn-success' : 'btn-ghost'}" 
                            onclick="toggleRecommendationStatus(${item.id}, '${item.status === 'offline' ? 'online' : 'offline'}')">
                        ${item.status === 'offline' ? '上架' : '下架'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRecommendation(${item.id})">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载推荐列表失败:', error);
    }
}

async function openRecommendationModal(id = null) {
    const isEdit = id !== null;
    let item = {};

    if (isEdit) {
        try {
            const { data } = await api('/recommendations');
            item = data.list.find(r => r.id === id) || {};
        } catch (error) {
            return;
        }
    }

    document.getElementById('modal-title').textContent = isEdit ? '编辑推荐' : '添加推荐';
    document.getElementById('modal-body').innerHTML = `
        <form id="recommendation-form">
            <input type="hidden" id="recommendation-id" value="${item.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>标签</label>
                    <input type="text" id="recommendation-tag" value="${escapeHtml(item.tag || '')}" placeholder="如：学习社群">
                </div>
                <div class="form-group">
                    <label>按钮文字</label>
                    <input type="text" id="recommendation-btn" value="${escapeHtml(item.btnText || '查看详情')}">
                </div>
            </div>
            <div class="form-group">
                <label>标题 *</label>
                <input type="text" id="recommendation-title" value="${escapeHtml(item.title || '')}" required>
            </div>
            <div class="form-group">
                <label>描述 *</label>
                <textarea id="recommendation-desc" rows="3" required>${escapeHtml(item.desc || '')}</textarea>
            </div>
            ${imageInputHtml('recommendation-image', item.image, '图片')}
            <div class="form-group">
                <label>跳转链接</label>
                <input type="text" id="recommendation-link" value="${escapeHtml(item.link || '')}">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '添加'}</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">取消</button>
            </div>
        </form>
    `;

    document.getElementById('recommendation-form').addEventListener('submit', saveRecommendation);
    openModal();
}

async function saveRecommendation(e) {
    e.preventDefault();
    const id = document.getElementById('recommendation-id').value;
    const data = {
        tag: document.getElementById('recommendation-tag').value,
        title: document.getElementById('recommendation-title').value,
        desc: document.getElementById('recommendation-desc').value,
        btnText: document.getElementById('recommendation-btn').value,
        image: document.getElementById('recommendation-image').value,
        link: document.getElementById('recommendation-link').value
    };

    try {
        if (id) {
            await api(`/recommendations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('推荐更新成功');
        } else {
            await api('/recommendations', { method: 'POST', body: JSON.stringify(data) });
            showToast('推荐添加成功');
        }
        closeModal();
        loadRecommendations();
    } catch (error) {
        console.error('保存失败:', error);
    }
}

async function toggleRecommendationStatus(id, status) {
    try {
        await api(`/recommendations/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showToast(status === 'online' ? '已上架' : '已下架');
        loadRecommendations();
    } catch (error) {
        console.error('状态更新失败:', error);
    }
}

async function deleteRecommendation(id) {
    if (!confirm('确定要删除这个推荐吗？')) return;

    try {
        await api(`/recommendations/${id}`, { method: 'DELETE' });
        showToast('推荐删除成功');
        loadRecommendations();
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// ============================================
// 内容管理
// ============================================
async function loadContents() {
    const status = document.getElementById('content-status-filter').value;
    const type = document.getElementById('content-type-filter').value;
    try {
        const { data } = await api(`/contents?status=${status}&type=${type}`);
        const tbody = document.getElementById('contents-table-body');

        if (data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-text">暂无数据</td></tr>';
            return;
        }

        const typeLabels = { course: '课程', guide: '指南', resource: '资料包' };

        tbody.innerHTML = data.list.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${typeLabels[item.type] || item.type}</td>
                <td>${escapeHtml(item.title)}</td>
                <td>${item.price > 0 ? '¥' + item.price : '免费'}</td>
                <td>
                    <span class="status-tag ${item.status === 'offline' ? 'status-offline' : 'status-online'}">
                        ${item.status === 'offline' ? '已下架' : '已上架'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-outline" onclick="openContentModal(${item.id})">编辑</button>
                    <button class="btn btn-sm ${item.status === 'offline' ? 'btn-success' : 'btn-ghost'}" 
                            onclick="toggleContentStatus(${item.id}, '${item.status === 'offline' ? 'online' : 'offline'}')">
                        ${item.status === 'offline' ? '上架' : '下架'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteContent(${item.id})">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载内容列表失败:', error);
    }
}

async function openContentModal(id = null) {
    const isEdit = id !== null;
    let item = {};

    if (isEdit) {
        try {
            const { data } = await api('/contents');
            item = data.list.find(c => c.id === id) || {};
        } catch (error) {
            return;
        }
    }

    document.getElementById('modal-title').textContent = isEdit ? '编辑内容' : '添加内容';
    document.getElementById('modal-body').innerHTML = `
        <form id="content-form">
            <input type="hidden" id="content-id" value="${item.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>类型 *</label>
                    <select id="content-type" required>
                        <option value="course" ${item.type === 'course' ? 'selected' : ''}>课程</option>
                        <option value="guide" ${item.type === 'guide' ? 'selected' : ''}>指南</option>
                        <option value="resource" ${item.type === 'resource' ? 'selected' : ''}>资料包</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>参与人数</label>
                    <input type="number" id="content-count" value="${item.count || 0}" min="0">
                </div>
            </div>
            <div class="form-group">
                <label>标题 *</label>
                <input type="text" id="content-title" value="${escapeHtml(item.title || '')}" required>
            </div>
            <div class="form-group">
                <label>副标题</label>
                <input type="text" id="content-subtitle" value="${escapeHtml(item.subTitle || '')}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>价格</label>
                    <input type="number" id="content-price" value="${item.price || 0}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>原价</label>
                    <input type="number" id="content-original-price" value="${item.originalPrice || 0}" step="0.01" min="0">
                </div>
            </div>
            ${imageInputHtml('content-cover', item.cover, '封面图片')}
            <div class="form-group">
                <label>内容详情 (HTML)</label>
                <textarea id="content-content" rows="6">${escapeHtml(item.content || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '添加'}</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">取消</button>
            </div>
        </form>
    `;

    document.getElementById('content-form').addEventListener('submit', saveContent);
    openModal();
}

async function saveContent(e) {
    e.preventDefault();
    const id = document.getElementById('content-id').value;
    const data = {
        type: document.getElementById('content-type').value,
        title: document.getElementById('content-title').value,
        subTitle: document.getElementById('content-subtitle').value,
        price: parseFloat(document.getElementById('content-price').value),
        originalPrice: parseFloat(document.getElementById('content-original-price').value),
        count: parseInt(document.getElementById('content-count').value),
        cover: document.getElementById('content-cover').value,
        content: document.getElementById('content-content').value
    };

    try {
        if (id) {
            await api(`/contents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('内容更新成功');
        } else {
            await api('/contents', { method: 'POST', body: JSON.stringify(data) });
            showToast('内容添加成功');
        }
        closeModal();
        loadContents();
    } catch (error) {
        console.error('保存失败:', error);
    }
}

async function toggleContentStatus(id, status) {
    try {
        await api(`/contents/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showToast(status === 'online' ? '已上架' : '已下架');
        loadContents();
    } catch (error) {
        console.error('状态更新失败:', error);
    }
}

async function deleteContent(id) {
    if (!confirm('确定要删除这个内容吗？')) return;

    try {
        await api(`/contents/${id}`, { method: 'DELETE' });
        showToast('内容删除成功');
        loadContents();
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// ============================================
// AI配置
// ============================================
async function loadAIConfig() {
    try {
        const { data } = await api('/ai-config');

        document.getElementById('ai-enabled').value = data.enabled ? 'true' : 'false';
        document.getElementById('ai-model').value = data.model || 'kimi-k2-0905-Preview';
        document.getElementById('ai-temperature').value = data.temperature || 0.7;
        document.getElementById('ai-max-tokens').value = data.maxTokens || 800;
        document.getElementById('ai-system-prompt').value = data.systemPrompt || '';
    } catch (error) {
        console.error('加载AI配置失败:', error);
    }
}

async function saveAIConfig(e) {
    e.preventDefault();

    const data = {
        enabled: document.getElementById('ai-enabled').value === 'true',
        model: document.getElementById('ai-model').value,
        temperature: parseFloat(document.getElementById('ai-temperature').value),
        maxTokens: parseInt(document.getElementById('ai-max-tokens').value),
        systemPrompt: document.getElementById('ai-system-prompt').value
    };

    try {
        await api('/ai-config', { method: 'PUT', body: JSON.stringify(data) });
        showToast('AI配置保存成功');
    } catch (error) {
        console.error('保存失败:', error);
    }
}

// ============================================
// 数据备份与导入导出
// ============================================
async function createBackup() {
    try {
        await api('/backup', { method: 'POST' });
        showToast('备份创建成功');
        loadBackups();
    } catch (error) {
        console.error('备份失败:', error);
    }
}

async function loadBackups() {
    try {
        const { data } = await api('/backups');
        const container = document.getElementById('backups-list');

        if (data.list.length === 0) {
            container.innerHTML = '<p class="empty-text">暂无备份</p>';
            return;
        }

        container.innerHTML = data.list.slice(0, 20).map(item => `
            <div class="backup-item">
                <div>
                    <div class="backup-info">${item.filename}</div>
                    <div class="backup-time">${new Date(item.timestamp).toLocaleString()}</div>
                </div>
                <button class="btn btn-sm btn-outline" onclick="restoreBackup('${item.filename}')">恢复</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载备份列表失败:', error);
    }
}

async function restoreBackup(filename) {
    if (!confirm(`确定要从 ${filename} 恢复数据吗？当前数据将被覆盖。`)) return;

    try {
        await api(`/restore/${filename}`, { method: 'POST' });
        showToast('数据恢复成功');
        loadDashboard();
    } catch (error) {
        console.error('恢复失败:', error);
    }
}

function exportData() {
    window.open(API_BASE + '/export?token=' + token, '_blank');
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const replace = confirm('是否替换现有数据？\n点击"确定"替换，点击"取消"合并');

            await api('/import', {
                method: 'POST',
                body: JSON.stringify({ data, replace })
            });
            showToast('数据导入成功');
            loadDashboard();
        } catch (error) {
            showToast('导入失败: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// 模态框
// ============================================
function openModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// 点击遮罩关闭
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});

document.getElementById('image-picker-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'image-picker-overlay') closeImagePicker();
});

// ============================================
// 工具函数
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
