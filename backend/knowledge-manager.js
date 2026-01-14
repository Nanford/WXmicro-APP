// backend/knowledge-manager.js - 知识库管理模块
const fs = require('fs');
const path = require('path');

// 知识库目录路径
const KNOWLEDGE_BASE_DIR = path.join(__dirname, 'data', 'knowledge-base');

// 知识块存储
let knowledgeBlocks = [];

// 心理相关关键词库（用于提取和匹配）
const PSYCHOLOGY_KEYWORDS = {
    // 情绪词
    emotions: ['愤怒', '生气', '压抑', '焦虑', '恐惧', '害怕', '悲伤', '难过', '抑郁', '内疚', '羞耻', '委屈', '痛苦', '绝望', '无力', '疲惫', '烦躁', '紧张', '恨', '怨', '怒'],
    // 关系词
    relationships: ['父亲', '爸爸', '母亲', '妈妈', '父母', '孩子', '儿子', '女儿', '丈夫', '妻子', '伴侣', '配偶', '婆婆', '公公', '岳父', '岳母', '家庭', '婚姻', '离婚', '分居', '亲子', '代际', '原生家庭'],
    // 症状词
    symptoms: ['失眠', '头痛', '胃痛', '咬指甲', '白发', '眼睛', '脖子', '肩膀', '僵硬', '疼痛', '出血', '磕头', '厌学', '拒绝', '退缩'],
    // 心理主题
    themes: ['接纳', '认同', '忠诚', '控制', '傲慢', '臣服', '归属', '位置', '顺序', '承担', '分离', '依附', '内耗', '牺牲', '疗愈', '疏离', '创伤', '童年', '回忆'],
    // 系统观关键词
    systemic: ['系统', '排列', '家族', '祖先', '命运', '传承', '卷入', '代替', '承接', '归还']
};

// 所有关键词扁平化数组
const ALL_KEYWORDS = Object.values(PSYCHOLOGY_KEYWORDS).flat();

/**
 * 加载知识库所有文件
 */
function loadKnowledgeBase() {
    knowledgeBlocks = [];

    try {
        if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
            console.log('知识库目录不存在:', KNOWLEDGE_BASE_DIR);
            return;
        }

        const files = fs.readdirSync(KNOWLEDGE_BASE_DIR);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        console.log(`正在加载知识库，共 ${mdFiles.length} 个文件...`);

        for (const file of mdFiles) {
            const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const blocks = parseMarkdownToBlocks(content, file);
            knowledgeBlocks.push(...blocks);
        }

        console.log(`知识库加载完成，共 ${knowledgeBlocks.length} 个知识块`);

    } catch (err) {
        console.error('加载知识库失败:', err.message);
    }
}

/**
 * 将 Markdown 内容解析为知识块
 * 按照 ## 标题分割为独立案例
 */
function parseMarkdownToBlocks(content, filename) {
    const blocks = [];

    // 按 ## 分割案例
    const casePattern = /^## (.+)$/gm;
    const cases = content.split(/(?=^## )/gm);

    for (const caseContent of cases) {
        if (!caseContent.trim() || caseContent.startsWith('# ')) continue;

        // 提取案例标题
        const titleMatch = caseContent.match(/^## (.+)$/m);
        if (!titleMatch) continue;

        const title = titleMatch[1].trim();
        const body = caseContent.replace(/^## .+$/m, '').trim();

        // 提取关键词
        const keywords = extractKeywords(title + ' ' + body);

        blocks.push({
            id: `${filename}_${blocks.length}`,
            source: filename,
            title: title,
            content: body,
            keywords: keywords,
            // 预计算关键词权重
            keywordSet: new Set(keywords)
        });
    }

    return blocks;
}

/**
 * 从文本中提取关键词
 */
function extractKeywords(text) {
    const keywords = [];

    for (const keyword of ALL_KEYWORDS) {
        if (text.includes(keyword)) {
            keywords.push(keyword);
        }
    }

    return [...new Set(keywords)]; // 去重
}

/**
 * 根据用户问题检索相关知识块
 * @param {string} userMessage - 用户消息
 * @param {number} topK - 返回最相关的K个结果
 * @returns {Array} 相关知识块数组
 */
function searchRelevantKnowledge(userMessage, topK = 3) {
    if (knowledgeBlocks.length === 0) {
        return [];
    }

    // 提取用户消息中的关键词
    const userKeywords = extractKeywords(userMessage);

    // 如果用户消息中没有相关关键词，尝试模糊匹配
    if (userKeywords.length === 0) {
        // 直接在知识块中搜索用户消息片段
        const directMatches = knowledgeBlocks.filter(block => {
            const fullText = block.title + ' ' + block.content;
            return userMessage.split('').some(char =>
                fullText.includes(char) && char.length > 1
            );
        });

        if (directMatches.length === 0) {
            return [];
        }
    }

    // 计算每个知识块的相关性得分
    const scoredBlocks = knowledgeBlocks.map(block => {
        let score = 0;

        // 关键词匹配得分
        for (const keyword of userKeywords) {
            if (block.keywordSet.has(keyword)) {
                score += 2; // 关键词匹配基础分

                // 标题中包含关键词额外加分
                if (block.title.includes(keyword)) {
                    score += 3;
                }
            }
        }

        // 直接文本匹配（用于没有关键词匹配的情况）
        const fullText = block.title + ' ' + block.content;
        const userWords = userMessage.split(/[，。？！、\s]+/).filter(w => w.length >= 2);
        for (const word of userWords) {
            if (fullText.includes(word)) {
                score += 1;
            }
        }

        return { block, score };
    });

    // 过滤出有得分的块，按得分排序，取 TopK
    const relevantBlocks = scoredBlocks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(item => item.block);

    return relevantBlocks;
}

/**
 * 构建知识库上下文字符串
 * @param {Array} blocks - 相关知识块数组
 * @returns {string} 格式化的上下文字符串
 */
function buildKnowledgeContext(blocks) {
    if (!blocks || blocks.length === 0) {
        return '';
    }

    let context = '\n\n---\n以下是相关的专业知识供你参考（来自知识库）：\n\n';

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        context += `【参考案例${i + 1}：${block.title}】\n`;
        context += `${block.content}\n\n`;
    }

    context += '请在回应时适当参考上述知识，内化为你的专业视角，但不要直接引用或照搬案例内容。\n---';

    return context;
}

/**
 * 获取知识库统计信息
 */
function getStats() {
    const sourceStats = {};
    for (const block of knowledgeBlocks) {
        sourceStats[block.source] = (sourceStats[block.source] || 0) + 1;
    }

    return {
        totalBlocks: knowledgeBlocks.length,
        sourceFiles: Object.keys(sourceStats).length,
        bySource: sourceStats
    };
}

/**
 * 获取所有知识块（用于管理接口）
 */
function getAllBlocks() {
    return knowledgeBlocks.map(block => ({
        id: block.id,
        source: block.source,
        title: block.title,
        keywords: block.keywords,
        contentPreview: block.content.substring(0, 200) + '...'
    }));
}

/**
 * 重新加载知识库
 */
function reload() {
    loadKnowledgeBase();
}

// 模块导出
module.exports = {
    loadKnowledgeBase,
    searchRelevantKnowledge,
    buildKnowledgeContext,
    getStats,
    getAllBlocks,
    reload,
    KNOWLEDGE_BASE_DIR
};
