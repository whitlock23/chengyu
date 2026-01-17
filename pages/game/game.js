// pages/game/game.js
const idiomUtils = require('../../utils/idiom');

Page({
  data: {
    roomId: '',
    users: [],
    currentIdiom: null,
    currentPlayerIndex: 0,
    currentPlayer: null,
    isCurrentPlayer: false, // 初始设置为false，根据实际情况更新
    inputIdiom: '',
    usedIdioms: [],
    scores: [],
    remainingTime: 30,
    timeLimit: 30,
    roundStartTime: 0,
    gameOver: false,
    timer: null,
    gameStateTimer: null // 定时获取游戏状态计时器
  },

  onLoad() {
    // 获取游戏数据
    const gameData = wx.getStorageSync('gameData');
    if (gameData) {
      // 保存原始的currentPlayerIndex，用于updateCurrentPlayer
      const currentPlayerIndex = gameData.currentPlayerIndex || 0;
      
      this.setData({
        roomId: gameData.roomId,
        users: gameData.users,
        currentPlayerIndex: currentPlayerIndex,
        usedIdioms: gameData.usedIdioms,
        scores: gameData.scores,
        timeLimit: gameData.timeLimit
      });
      
      // 初始化游戏
      this.initGame();
      
      // 启动定时获取游戏状态，每1秒获取一次
      this.startGameStateTimer();
    }
  },

  onUnload() {
    // 清除所有定时器
    this.clearAllTimers();
  },

  // 启动定时获取游戏状态计时器
  startGameStateTimer() {
    // 检查是否是单人模式（只有两个玩家，且第二个是AI）
    const isSinglePlayer = this.data.users.length === 2 && this.data.users[1].isAI;
    
    // 单人模式下不启动计时器，因为不需要从云数据库获取游戏状态
    if (isSinglePlayer) {
      console.log('单人模式，不启动游戏状态获取计时器');
      return;
    }
    
    // 先清除之前的计时器
    this.clearGameStateTimer();
    
    // 设置新的计时器，每1秒获取一次游戏状态
    const timer = setInterval(() => {
      this.getGameState();
    }, 1000);
    
    this.setData({ gameStateTimer: timer });
  },

  // 清除定时获取游戏状态计时器
  clearGameStateTimer() {
    if (this.data.gameStateTimer) {
      clearInterval(this.data.gameStateTimer);
      this.setData({ gameStateTimer: null });
    }
  },

  // 清除所有定时器
  clearAllTimers() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
    this.clearGameStateTimer();
  },

  // 初始化游戏
  async initGame() {
    console.log('开始初始化游戏...');
    
    // 检查成语是否已加载，如果未加载则等待加载完成
    if (!idiomUtils.loaded) {
      console.log('成语词典未加载，等待加载...');
      await idiomUtils.loadIdioms();
    } else {
      console.log('成语词典已加载');
    }
    
    console.log('成语词典状态 - loaded:', idiomUtils.loaded, 'idioms数量:', idiomUtils.idioms.length);
    
    // 获取适合作为初始的成语
    console.log('房主获取初始成语...');
    const firstIdiom = idiomUtils.getInitialIdiom();
    console.log('获取到的初始成语:', firstIdiom);
    
    let initialIdiom = firstIdiom || '成语接龙';
    let usedIdioms = [initialIdiom];
    
    // 检查是否是单人模式（只有两个玩家，且第二个是AI）
    const isSinglePlayer = this.data.users.length === 2 && this.data.users[1].isAI;
    
    // 单人模式下直接本地初始化，不依赖云函数
    if (isSinglePlayer) {
      console.log('单人模式，直接本地初始化游戏状态');
      this.setData({
        currentIdiom: initialIdiom,
        usedIdioms: usedIdioms,
        currentPlayerIndex: 0,
        scores: this.data.users.map(() => 0),
        roundStartTime: Date.now(),
        remainingTime: this.data.timeLimit
      });
      
      // 更新当前玩家信息
      this.updateCurrentPlayer();
      
      // 开始倒计时
      this.startTimer();
    } else if (this.data.currentPlayerIndex === 0) {
      // 多人模式下，房主调用云函数初始化游戏状态
      // 调用云函数初始化游戏状态
      wx.cloud.callFunction({
        name: 'initGame',
        data: {
          roomId: this.data.roomId,
          initialIdiom: initialIdiom
        },
        success: res => {
          if (res.result.success) {
            console.log('游戏状态初始化成功：', res.result.gameState);
            // 直接使用云函数返回的游戏状态
            this.setData({
              currentIdiom: res.result.gameState.currentIdiom,
              usedIdioms: res.result.gameState.usedIdioms,
              currentPlayerIndex: res.result.gameState.currentPlayerIndex,
              scores: res.result.gameState.scores,
              roundStartTime: res.result.gameState.roundStartTime,
              remainingTime: this.data.timeLimit
            });
            
            // 更新当前玩家信息
            this.updateCurrentPlayer();
            
            // 开始倒计时
            this.startTimer();
          } else {
            console.error('游戏状态初始化失败：', res.result.error);
            // 云函数失败时，使用本地初始化作为fallback
            this.localInitGame(initialIdiom, usedIdioms);
          }
        },
        fail: error => {
          console.error('调用initGame云函数失败：', error);
          // 云函数调用失败时，使用本地初始化作为fallback
          this.localInitGame(initialIdiom, usedIdioms);
        }
      });
    } else {
      // 非房主直接从云数据库获取初始游戏状态
      this.getGameState();
    }
  },
  
  // 本地初始化游戏状态（作为云函数失败的fallback）
  localInitGame(initialIdiom, usedIdioms) {
    console.log('使用本地初始化游戏状态，初始成语：', initialIdiom);
    this.setData({
      currentIdiom: initialIdiom,
      usedIdioms: usedIdioms,
      currentPlayerIndex: 0,
      scores: this.data.users.map(() => 0),
      roundStartTime: Date.now(),
      remainingTime: this.data.timeLimit
    });
    
    // 更新当前玩家信息
    this.updateCurrentPlayer();
    
    // 开始倒计时
    this.startTimer();
  },

  // 获取游戏状态
  getGameState() {
    wx.cloud.callFunction({
      name: 'getGameState',
      data: {
        roomId: this.data.roomId
      },
      success: res => {
        if (res.result.success && res.result.gameState) {
          const gameState = res.result.gameState;
          
          // 更新游戏状态
          this.setData({
            currentIdiom: gameState.currentIdiom,
            usedIdioms: gameState.usedIdioms,
            currentPlayerIndex: gameState.currentPlayerIndex,
            scores: gameState.scores,
            roundStartTime: gameState.roundStartTime,
            remainingTime: Math.max(0, this.data.timeLimit - Math.floor((Date.now() - gameState.roundStartTime) / 1000))
          });
          
          // 更新当前玩家信息
          this.updateCurrentPlayer();
          
          // 重新启动计时器
          this.startTimer();
        }
      },
      fail: error => {
        console.error('获取游戏状态失败：', error);
      }
    });
  },

  // 更新当前玩家信息
  updateCurrentPlayer() {
    const { users, currentPlayerIndex } = this.data;
    const currentPlayer = users[currentPlayerIndex];
    
    // 获取本地玩家的openid
    const openid = wx.getStorageSync('openid') || '';
    
    // 判断当前玩家是否是本地玩家
    let isCurrentPlayer = false;
    if (currentPlayer) {
      // 优先根据openid判断
      if (currentPlayer.openid && openid && currentPlayer.openid === openid) {
        isCurrentPlayer = true;
      } else {
        // 否则假设本地玩家是第一个
        isCurrentPlayer = currentPlayerIndex === 0;
      }
    }
    
    console.log('updateCurrentPlayer - currentPlayerIndex:', currentPlayerIndex, 'users:', users, 'currentPlayer:', currentPlayer, 'isCurrentPlayer:', isCurrentPlayer);
    
    this.setData({
      currentPlayer,
      isCurrentPlayer
    });
    
    // 如果是AI玩家，触发自动答题
    if (currentPlayer.isAI) {
      this.aiAutoAnswer();
    }
  },
  
  // AI自动答题
  aiAutoAnswer() {
    // 立即答题，不等待
    const { currentIdiom, usedIdioms, currentPlayerIndex, scores, currentPlayer, users } = this.data;
    
    console.log('AI正在答题，当前成语：', currentIdiom);
    console.log('已使用成语：', usedIdioms);
    
    // 获取符合条件的成语
    const matchingIdioms = idiomUtils.getMatchingIdioms(currentIdiom, usedIdioms);
    console.log('匹配的成语数量：', matchingIdioms.length);
    console.log('匹配的成语列表：', matchingIdioms);
    
    const aiAnswer = idiomUtils.getAIRandomAnswer(currentIdiom, usedIdioms);
    console.log('AI选择的成语：', aiAnswer);
    
    if (aiAnswer) {
      // 显示AI答题结果
      wx.showToast({
        title: `电脑玩家答：${aiAnswer}`,
        icon: 'none',
        duration: 1000
      });
      
      // 成语验证通过，更新游戏状态
      const newUsedIdioms = usedIdioms.concat([aiAnswer]);
      const newScores = scores.slice();
      newScores[currentPlayerIndex] += 1;
      
      // 检查是否是单人模式（只有两个玩家，且第二个是AI）
      const isSinglePlayer = users.length === 2 && users[1].isAI;
      
      if (isSinglePlayer) {
        // 单人模式下直接本地更新
        console.log('单人模式，AI答题后直接本地更新游戏状态');
        
        // 计算下一个玩家
        let nextIndex = currentPlayerIndex + 1;
        if (nextIndex >= users.length) {
          nextIndex = 0;
        }
        
        this.setData({
          currentIdiom: aiAnswer,
          usedIdioms: newUsedIdioms,
          scores: newScores,
          currentPlayerIndex: nextIndex,
          roundStartTime: Date.now(),
          remainingTime: this.data.timeLimit
        });
        
        // 更新当前玩家信息
        this.updateCurrentPlayer();
      } else {
        // 多人模式下调用云函数更新
        wx.cloud.callFunction({
          name: 'updateGameState',
          data: {
            roomId: this.data.roomId,
            nextIdiom: aiAnswer,
            currentPlayerIndex: currentPlayerIndex,
            scores: newScores,
            usedIdioms: newUsedIdioms
          },
          success: res => {
            if (res.result.success) {
              console.log('AI答题后游戏状态更新成功：', res.result.gameState);
            } else {
              console.error('AI答题后游戏状态更新失败：', res.result.error);
            }
          },
          fail: error => {
            console.error('AI答题调用updateGameState云函数失败：', error);
          }
        });
      }
    } else {
      // AI答不出来，游戏结束
      wx.showToast({
        title: '电脑玩家答不出来了！',
        icon: 'success'
      });
      this.endGame();
    }
  },

  // 开始倒计时
  startTimer() {
    // 清除之前的定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    
    // 只有当当前玩家是真实玩家时才启动倒计时
    const currentPlayer = this.data.currentPlayer;
    if (!currentPlayer || !currentPlayer.isAI) {
      const timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - this.data.roundStartTime) / 1000);
        const remainingTime = Math.max(0, this.data.timeLimit - elapsed);
        
        this.setData({ remainingTime });
        
        // 时间到，游戏结束
        if (remainingTime === 0) {
          clearInterval(timer);
          this.endGame();
        }
      }, 1000);
      
      this.setData({ timer });
    }
  },

  // 提交成语
  submitIdiom() {
    const { currentIdiom, usedIdioms, currentPlayerIndex, scores, users } = this.data;
    
    // 直接获取输入框的值
    const query = wx.createSelectorQuery();
    query.select('.input').fields({
      properties: ['value']
    });
    
    query.exec((res) => {
      const inputValue = (res[0] && res[0].value) || '';
      console.log('提交成语:', inputValue, '长度:', inputValue.length);
      
      // 先trim，防止有空格
      const trimmedIdiom = inputValue.trim();
      console.log('去除空格后:', trimmedIdiom, '长度:', trimmedIdiom.length);
      
      // 检查成语是否已使用
      if (usedIdioms.includes(trimmedIdiom)) {
        wx.showToast({
          title: '成语已使用',
          icon: 'none'
        });
        return;
      }
      
      // 检查成语是否有效
      if (!idiomUtils.isIdiom(trimmedIdiom)) {
        wx.showToast({
          title: '不是有效成语',
          icon: 'none'
        });
        return;
      }
      
      // 检查成语接龙是否有效
      if (!idiomUtils.isValidChain(currentIdiom, trimmedIdiom)) {
        wx.showToast({
          title: '成语接龙无效',
          icon: 'none'
        });
        return;
      }
      
      // 成语验证通过，更新游戏状态
      const newUsedIdioms = usedIdioms.concat([trimmedIdiom]);
      const newScores = scores.slice();
      newScores[currentPlayerIndex] += 1;
      
      // 检查是否是单人模式（只有两个玩家，且第二个是AI）
      const isSinglePlayer = users.length === 2 && users[1].isAI;
      
      if (isSinglePlayer) {
        // 单人模式下直接本地更新
        console.log('单人模式，直接本地更新游戏状态');
        
        // 计算下一个玩家
        let nextIndex = currentPlayerIndex + 1;
        if (nextIndex >= users.length) {
          nextIndex = 0;
        }
        
        this.setData({
          currentIdiom: trimmedIdiom,
          usedIdioms: newUsedIdioms,
          scores: newScores,
          currentPlayerIndex: nextIndex,
          roundStartTime: Date.now(),
          remainingTime: this.data.timeLimit
        });
        
        // 更新当前玩家信息
        this.updateCurrentPlayer();
        
        // 清空输入框（通过数据绑定）
        this.setData({
          inputIdiom: ''
        });
      } else {
        // 多人模式下调用云函数更新
        wx.cloud.callFunction({
          name: 'updateGameState',
          data: {
            roomId: this.data.roomId,
            nextIdiom: trimmedIdiom,
            currentPlayerIndex: currentPlayerIndex,
            scores: newScores,
            usedIdioms: newUsedIdioms
          },
          success: res => {
            if (res.result.success) {
              console.log('游戏状态更新成功：', res.result.gameState);
              // 清空输入框（通过数据绑定）
              this.setData({
                inputIdiom: ''
              });
            } else {
              console.error('游戏状态更新失败：', res.result.error);
              wx.showToast({
                title: '提交失败，请重试',
                icon: 'none'
              });
            }
          },
          fail: error => {
            console.error('调用updateGameState云函数失败：', error);
            wx.showToast({
              title: '网络错误，请重试',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  // 切换到下一个玩家 - 现在由云函数处理，此方法不再直接使用
  nextPlayer() {
    console.log('nextPlayer方法已更新，现在由云函数处理玩家切换');
  },

  // 结束游戏
  endGame() {
    this.setData({
      gameOver: true
    });
    
    // 清除定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    
    wx.showToast({
      title: '游戏结束',
      icon: 'success'
    });
  },

  // 返回房间
  backToRoom() {
    wx.navigateBack({
      delta: 1
    });
  }
})
