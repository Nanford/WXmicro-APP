// backend/data-manager.js - 数据持久化管理模块
const fs = require('fs');
const path = require('path');

// 数据目录
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// 确保目录存在
function ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const uploadsDir = path.join(DATA_DIR, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
}

// 初始化时确保目录存在
ensureDirectories();

// 默认数据
const DEFAULT_DATA = {
    assessments: [
        { id: 1, title: '财富动力测评', desc: '是什么在阻止你赚更多钱？深度剖析你的财富心理模式', price: 19.9, originalPrice: 39.9, count: 3724, category: '情绪管理', image: '' },
        { id: 2, title: '金钱惩罚测试', desc: '测一测你的"金钱惩罚"指数，了解潜意识中的金钱障碍', price: 19.9, originalPrice: 39.9, count: 3528, category: '情绪管理', image: '' },
        { id: 3, title: '亲子沟通模式测评', desc: '是复利模式还是负利模式？优化亲子关系的第一步', price: 19.9, originalPrice: 39.9, count: 3507, category: '亲子教育', image: '' },
        { id: 4, title: '情绪智力测评', desc: '理解情绪，是自我成熟的前提，测测你的EQ水平', price: 19.9, originalPrice: 39.9, count: 3644, category: '情绪管理', image: '' },
        { id: 5, title: '养育风格测评', desc: '科学养育，做更少但更对的事，发现最适合你的养育方式', price: 19.9, originalPrice: 39.9, count: 3503, category: '亲子教育', image: '' },
        { id: 6, title: '人际关系测评', desc: '了解你的社交模式，提升人际交往能力', price: 19.9, originalPrice: 39.9, count: 2856, category: '人际关系', image: '' },
        { id: 7, title: '压力应对测评', desc: '测测你的压力应对方式，找到最适合的减压方法', price: 19.9, originalPrice: 39.9, count: 3102, category: '情绪管理', image: '' },
        { id: 8, title: '亲密关系测评', desc: '了解你在亲密关系中的依恋模式', price: 19.9, originalPrice: 39.9, count: 2934, category: '人际关系', image: '' }
    ],
    recommendations: [
        { id: 1, tag: '学习社群', title: 'NLP技巧跟练3天学习营', desc: 'AI跟练+真人助教，快速掌握NLP核心技巧', btnText: '去学习' },
        { id: 2, tag: '使用指南', title: 'AI彩虹老师使用指南', desc: '困扰答疑/技巧练习，一文了解所有功能', btnText: '去查看' },
        { id: 3, tag: '资料包', title: 'NLP实用技巧15则', desc: '一看就会，一会就能用！实用心理技巧合集', btnText: '去领取' }
    ],
    contents: {
        1: { id: 1, type: 'course', title: 'NLP技巧跟练3天学习营', subTitle: 'AI跟练+真人助教', price: 99.9, originalPrice: 199.9, count: 2345, cover: '', content: '<div style="color: #666; padding: 10px;"><h3>课程介绍</h3><p>本课程为期3天，通过AI智能跟练和真人助教的双重辅导，帮助你快速掌握NLP核心技巧。</p><br/><h3>你将学到</h3><ul><li>NLP基础原理</li><li>情绪调控技巧</li><li>沟通模式优化</li><li>目标设定方法</li></ul></div>' },
        2: { id: 2, type: 'guide', title: 'AI彩虹老师使用指南', subTitle: '困扰答疑/技巧练习', price: 0, originalPrice: 0, count: 5678, cover: '', content: '<div style="color: #666; padding: 10px;"><h3>使用指南</h3><p>欢迎使用AI彩虹老师！这里是你的私人心理成长伙伴。</p><br/><h3>主要功能</h3><ul><li>AI对话：随时倾诉你的心事</li><li>情绪日历：记录每日情绪变化</li><li>心理测评：专业测评助你自我了解</li></ul></div>' },
        3: { id: 3, type: 'resource', title: 'NLP实用技巧15则', subTitle: '一看就会，一会就能用！', price: 0, originalPrice: 0, count: 3456, cover: '', content: '<div style="color: #666; padding: 10px;"><h3>资料介绍</h3><p>精选15个最实用的NLP心理技巧，每个技巧都配有详细的步骤说明和实践案例。</p><br/><p>包含：情绪锚定、心锚设置、视觉化技巧等。</p></div>' }
    }
};

/**
 * 读取数据文件
 * @param {string} filename - 文件名（不含扩展名）
 * @returns {any} 数据对象
 */
function loadData(filename) {
    const filepath = path.join(DATA_DIR, `${filename}.json`);

    try {
        if (fs.existsSync(filepath)) {
            const data = fs.readFileSync(filepath, 'utf8');
            return JSON.parse(data);
        } else {
            // 如果文件不存在，返回默认数据并创建文件
            const defaultData = DEFAULT_DATA[filename] || (filename === 'users' ? {} : []);
            saveData(filename, defaultData);
            return defaultData;
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return DEFAULT_DATA[filename] || (filename === 'users' ? {} : []);
    }
}

/**
 * 保存数据到文件
 * @param {string} filename - 文件名（不含扩展名）
 * @param {any} data - 要保存的数据
 * @returns {boolean} 是否成功
 */
function saveData(filename, data) {
    const filepath = path.join(DATA_DIR, `${filename}.json`);

    try {
        ensureDirectories();
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Data saved: ${filename}.json`);
        return true;
    } catch (error) {
        console.error(`Error saving ${filename}:`, error);
        return false;
    }
}

/**
 * 创建数据备份
 * @param {string} filename - 文件名（不含扩展名）
 * @returns {boolean} 是否成功
 */
function backupData(filename) {
    const sourceFile = path.join(DATA_DIR, `${filename}.json`);

    if (!fs.existsSync(sourceFile)) {
        console.log(`⚠️ No data file to backup: ${filename}.json`);
        return false;
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `${filename}_${timestamp}.json`);

        fs.copyFileSync(sourceFile, backupFile);
        console.log(`✅ Backup created: ${filename}_${timestamp}.json`);
        return true;
    } catch (error) {
        console.error(`Error backing up ${filename}:`, error);
        return false;
    }
}

/**
 * 备份所有数据
 */
function backupAllData() {
    const dataFiles = ['assessments', 'recommendations', 'contents', 'users'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log(`\n📦 Creating backup at ${timestamp}...`);

    dataFiles.forEach(filename => {
        backupData(filename);
    });

    console.log('✅ All data backed up\n');
}

/**
 * 获取所有备份列表
 */
function listBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        return files.filter(f => f.endsWith('.json')).map(f => ({
            filename: f,
            timestamp: fs.statSync(path.join(BACKUP_DIR, f)).mtime
        })).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error listing backups:', error);
        return [];
    }
}

/**
 * 从备份恢复数据
 * @param {string} backupFilename - 备份文件名
 */
function restoreFromBackup(backupFilename) {
    const backupFile = path.join(BACKUP_DIR, backupFilename);

    if (!fs.existsSync(backupFile)) {
        console.error(`❌ Backup file not found: ${backupFilename}`);
        return false;
    }

    try {
        // 提取原始文件名（去掉时间戳）
        const originalFilename = backupFilename.split('_')[0];
        const targetFile = path.join(DATA_DIR, `${originalFilename}.json`);

        // 先备份当前数据
        if (fs.existsSync(targetFile)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const preRestoreBackup = path.join(BACKUP_DIR, `${originalFilename}_pre-restore_${timestamp}.json`);
            fs.copyFileSync(targetFile, preRestoreBackup);
        }

        // 恢复数据
        fs.copyFileSync(backupFile, targetFile);
        console.log(`✅ Data restored from ${backupFilename}`);
        return true;
    } catch (error) {
        console.error('Error restoring from backup:', error);
        return false;
    }
}

// 初始化：确保所有数据文件存在
function initializeData() {
    console.log('🔧 Initializing data files...');

    ['assessments', 'recommendations', 'contents', 'users'].forEach(filename => {
        loadData(filename);
    });

    console.log('✅ Data files initialized\n');
}

// 启动时初始化
initializeData();

module.exports = {
    loadData,
    saveData,
    backupData,
    backupAllData,
    listBackups,
    restoreFromBackup,
    DATA_DIR,
    BACKUP_DIR
};
