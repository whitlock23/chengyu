// 成语处理工具类

// 直接导入主包中的成语数据
const idiomData = require('./idiomData');

class IdiomUtils {
  constructor() {
    this.idioms = []; // 所有成语列表
    this.idiomMap = new Map(); // 成语映射表，用于快速查找
    this.pinyinMap = new Map(); // 拼音映射表，用于谐音字处理
    this.loaded = false;
  }

  // 加载成语词典
  loadIdioms() {
    if (this.loaded) return Promise.resolve();
    
    return new Promise((resolve) => {
      try {
        // 直接使用导入的成语数据
        this.idioms = idiomData;
        
        // 构建成语映射表
        this.idioms.forEach(idiomObj => {
          if (idiomObj.word && idiomObj.word.length === 4) {
            this.idiomMap.set(idiomObj.word, idiomObj);
          }
        });
        
        this.loaded = true;
        console.log('成语词典加载完成，共', this.idioms.length, '个成语');
        resolve();
      } catch (error) {
        console.error('加载成语词典失败:', error);
        resolve(); // 即使失败也返回，避免程序崩溃
      }
    });
  }

  // 检查成语是否存在
  isIdiom(idiom) {
    console.log('isIdiom调用 - 输入:', idiom, '类型:', typeof idiom);
    
    if (!idiom) {
      console.log('成语为空，返回false');
      return false;
    }
    
    const trimmedIdiom = idiom.trim();
    console.log('去除空格后:', trimmedIdiom, '长度:', trimmedIdiom.length);
    
    // 检查idiomMap是否已构建
    console.log('idiomMap大小:', this.idiomMap.size, 'loaded:', this.loaded);
    
    const result = this.idiomMap.has(trimmedIdiom);
    console.log('成语验证:', trimmedIdiom, '->', result);
    
    // 如果成语不存在，尝试查找前10个成语，看idiomMap是否正常
    if (!result && this.idiomMap.size > 0) {
      const first10Idioms = Array.from(this.idiomMap.keys()).slice(0, 10);
      console.log('idiomMap前10个成语:', first10Idioms);
    }
    
    return result;
  }

  // 获取随机成语
  getRandomIdiom() {
    if (!this.loaded) return null;
    const index = Math.floor(Math.random() * this.idioms.length);
    return this.idioms[index].word;
  }

  // 获取适合作为初始的成语
  getInitialIdiom() {
    if (!this.loaded) return null;
    
    // 简化：直接随机选择成语，避免O(n²)的遍历
    // 后续的接龙逻辑会检查是否有匹配的成语，如果没有AI会处理
    return this.getRandomIdiom();
  }

  // 获取成语的最后一个字的拼音
  getLastPinyin(idiom) {
    if (typeof idiom === 'string') {
      const idiomObj = this.idiomMap.get(idiom);
      return idiomObj ? idiomObj.last : '';
    }
    return idiom.last || '';
  }

  // 获取成语的第一个字的拼音
  getFirstPinyin(idiom) {
    if (typeof idiom === 'string') {
      const idiomObj = this.idiomMap.get(idiom);
      return idiomObj ? idiomObj.first : '';
    }
    return idiom.first || '';
  }

  // 获取成语的最后一个字
  getLastChar(idiom) {
    if (typeof idiom === 'string') {
      return idiom.charAt(3);
    }
    return idiom.word.charAt(3);
  }

  // 获取成语的第一个字
  getFirstChar(idiom) {
    if (typeof idiom === 'string') {
      return idiom.charAt(0);
    }
    return idiom.word.charAt(0);
  }

  // 检查两个拼音是否相同（基于拼音的接龙）
  isHomophonic(pinyin1, pinyin2) {
    // 直接比较拼音是否相同
    return pinyin1 === pinyin2;
  }

  // 检查成语接龙是否有效
  isValidChain(lastIdiom, nextIdiom) {
    if (!this.isIdiom(nextIdiom)) {
      return false;
    }
    
    const lastPinyin = this.getLastPinyin(lastIdiom);
    const firstPinyin = this.getFirstPinyin(nextIdiom);
    
    console.log('成语接龙验证 - 上一个成语:', lastIdiom, '最后一个字拼音:', lastPinyin);
    console.log('成语接龙验证 - 下一个成语:', nextIdiom, '第一个字拼音:', firstPinyin);
    console.log('拼音是否相同:', this.isHomophonic(lastPinyin, firstPinyin));
    
    return this.isHomophonic(lastPinyin, firstPinyin);
  }

  // 获取符合条件的成语列表（用于AI答题）
  getMatchingIdioms(lastIdiom, usedIdioms) {
    if (!this.loaded) return [];
    
    const lastPinyin = this.getLastPinyin(lastIdiom);
    const matchingIdioms = [];
    
    // 遍历所有成语，找到符合条件的
    for (const idiomObj of this.idioms) {
      const idiom = idiomObj.word;
      // 检查是否已使用
      if (usedIdioms.includes(idiom)) continue;
      
      // 检查首字拼音是否与上一个成语的尾字拼音相同
      if (this.isHomophonic(lastPinyin, idiomObj.first)) {
        matchingIdioms.push(idiom);
      }
    }
    
    return matchingIdioms;
  }

  // AI获取随机答题
  getAIRandomAnswer(lastIdiom, usedIdioms) {
    const matchingIdioms = this.getMatchingIdioms(lastIdiom, usedIdioms);
    if (matchingIdioms.length === 0) return null;
    
    // 随机选择一个符合条件的成语
    const index = Math.floor(Math.random() * matchingIdioms.length);
    return matchingIdioms[index];
  }
}

// 导出单例
module.exports = new IdiomUtils();
