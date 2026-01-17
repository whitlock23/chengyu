// pages/room/room.js
Page({
  data: {
    roomId: '',
    isHost: false,
    isReady: false,
    users: [],
    canStartGame: false,
    loading: false,
    refreshTimer: null, // 定时刷新计时器
    gameStatusTimer: null // 定时检查游戏状态计时器
  },

  onLoad(options) {
    const { roomId, isHost } = options;
    this.setData({
      roomId,
      // 只有在没有提供isHost参数时才默认设置为true，确保单人模式下自动成为房主
      isHost: isHost === 'true' || isHost === undefined
    });
    
    // 强制重新获取房间信息，确保显示所有玩家
    this.setData({ users: [] }); // 清空本地列表，确保从服务器获取完整数据
    this.getRoomInfo();
  },

  onShow() {
    // 页面显示时刷新玩家列表
    this.getRoomInfo();
    
    // 启动定时刷新，每3秒刷新一次
    this.startRefreshTimer();
    
    // 启动定时检查游戏状态，每2秒检查一次
    this.startGameStatusTimer();
  },

  onUnload() {
    // 离开页面时通知服务器
    this.leaveRoom();
    
    // 清除所有计时器
    this.clearAllTimers();
  },

  // 启动定时刷新计时器
  startRefreshTimer() {
    // 先清除之前的计时器
    this.clearRefreshTimer();
    
    // 设置新的计时器，每3秒刷新一次
    const timer = setInterval(() => {
      this.getRoomInfo();
    }, 3000);
    
    this.setData({ refreshTimer: timer });
  },

  // 清除定时刷新计时器
  clearRefreshTimer() {
    if (this.data.refreshTimer) {
      clearInterval(this.data.refreshTimer);
      this.setData({ refreshTimer: null });
    }
  },

  // 启动定时检查游戏状态计时器
  startGameStatusTimer() {
    // 先清除之前的计时器
    this.clearGameStatusTimer();
    
    // 设置新的计时器，每2秒检查一次游戏状态
    const timer = setInterval(() => {
      this.checkGameStatus();
    }, 2000);
    
    this.setData({ gameStatusTimer: timer });
  },

  // 清除定时检查游戏状态计时器
  clearGameStatusTimer() {
    if (this.data.gameStatusTimer) {
      clearInterval(this.data.gameStatusTimer);
      this.setData({ gameStatusTimer: null });
    }
  },

  // 清除所有计时器
  clearAllTimers() {
    this.clearRefreshTimer();
    this.clearGameStatusTimer();
  },

  // 检查游戏状态
  checkGameStatus() {
    wx.cloud.callFunction({
      name: 'getRoomInfo',
      data: {
        roomId: this.data.roomId
      },
      success: res => {
        const result = res.result;
        if (result.success && result.room) {
          const room = result.room;
          // 如果房间状态为playing，自动跳转到游戏页面
          if (room.status === 'playing') {
            // 检查是否是单人模式（只有房主和一个AI玩家）
            const isSinglePlayer = room.players.length === 2 && room.players[1].isAI;
            
            // 只有多人模式下才自动跳转，单人模式下已经通过startGameLogic直接跳转
            if (!isSinglePlayer) {
              // 构造游戏数据
              const gameData = {
                roomId: room.roomId,
                users: room.players,
                currentIdiom: null,
                currentPlayerIndex: 0,
                usedIdioms: [],
                scores: room.players.map(() => 0),
                gameStartTime: Date.now(),
                roundStartTime: Date.now(),
                timeLimit: 30 // 30秒限时
              };
              
              // 保存游戏数据到本地
              wx.setStorageSync('gameData', gameData);
              
              // 跳转到游戏页面
              wx.navigateTo({
                url: '/pages/game/game'
              });
              
              // 清除计时器
              this.clearAllTimers();
            }
          }
        }
      },
      fail: error => {
        console.error('检查游戏状态失败：', error);
      }
    });
  },

  // 初始化玩家列表
  initUsers() {
    // 获取用户真实微信昵称
    const userInfo = wx.getStorageSync('userInfo') || {};
    const nickName = userInfo.nickName || wx.getStorageSync('nickName') || '玩家' + Math.floor(Math.random() * 1000);
    
    // 使用当前设置的isHost值，确保与onLoad中设置的一致
    const isHost = this.data.isHost;
    
    // 初始状态下，玩家未准备
    const isReady = false;
    
    // 创建初始玩家数据
    const users = [
      {
        nickName: nickName,
        ready: isReady,
        isHost: isHost,
        openid: wx.getStorageSync('openid') || ''
      }
    ];
    
    this.setData({
      users,
      isHost: isHost,
      isReady: isReady
    });
    
    // 检查是否可以开始游戏
    this.checkCanStartGame();
  },

  // 获取房间信息
  getRoomInfo() {
    this.setData({ loading: true });
    
    // 获取当前用户的openid
    const openid = wx.getStorageSync('openid') || '';
    
    // 尝试调用云函数获取最新房间信息
    wx.cloud.callFunction({
      name: 'getRoomInfo',
      data: {
        roomId: this.data.roomId
      },
      success: res => {
        const result = res.result;
        if (result.success && result.room && result.room.players) {
          const room = result.room;
          
          // 确保玩家列表包含真实微信昵称
          const updatedPlayers = room.players.map(player => ({
            nickName: player.nickName || '玩家' + Math.floor(Math.random() * 1000),
            ready: player.ready || false,
            isHost: player.isHost || false,
            openid: player.openid || ''
          }));
          
          // 找到当前用户在列表中的位置
          let currentUser = updatedPlayers.find(player => player.openid === openid);
          
          // 特殊处理：如果找不到当前用户，且只有一个玩家，默认该玩家是当前用户
          if (!currentUser && updatedPlayers.length === 1) {
            currentUser = updatedPlayers[0];
          }
          
          const isReady = currentUser ? currentUser.ready : false;
          
          // 判断当前用户是否是房主
          let isActualHost = false;
          if (updatedPlayers.length === 1) {
            // 单人模式下，当前用户自动成为房主
            isActualHost = true;
          } else if (currentUser) {
            // 多人模式下，根据openid判断
            isActualHost = currentUser.isHost;
          }
          
          this.setData({
            users: updatedPlayers,
            isHost: isActualHost,
            isReady: isReady
          });
          this.checkCanStartGame();
        } else {
          // 房间不存在或数据错误，单人模式下使用本地数据
          console.log('云函数返回的房间数据不完整，使用本地数据');
          // 确保单人模式下用户是房主
          this.setData({
            isHost: true
          });
          // 检查是否可以开始游戏
          this.checkCanStartGame();
        }
      },
      fail: error => {
        console.error('获取房间信息失败：', error);
        // 云函数调用失败，使用本地数据
        wx.showToast({
          title: '获取房间信息失败，使用本地数据',
          icon: 'none'
        });
        // 初始化本地玩家列表
        this.initUsers();
        // 确保单人模式下用户是房主
        this.setData({
          isHost: true
        });
        // 检查是否可以开始游戏
        this.checkCanStartGame();
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 离开房间
  leaveRoom() {
    wx.cloud.callFunction({
      name: 'leaveRoom',
      data: {
        roomId: this.data.roomId
      },
      success: res => {
        console.log('离开房间成功：', res.result);
      },
      fail: error => {
        console.error('离开房间失败：', error);
      }
    });
  },

  // 切换准备状态
  toggleReady() {
    // 获取当前用户的openid
    const openid = wx.getStorageSync('openid') || '';
    
    // 计算新的准备状态
    const newReadyStatus = !this.data.isReady;
    
    // 直接更新本地状态，提供即时反馈
    this.setData({
      isReady: newReadyStatus
    });
    
    // 找到当前用户在用户列表中的位置
    const updatedUsers = [...this.data.users];
    let currentUserIndex = updatedUsers.findIndex(user => user.openid === openid);
    
    // 单人模式下，如果找不到用户，默认更新第一个用户（即当前用户）
    if (currentUserIndex === -1 && updatedUsers.length === 1) {
      currentUserIndex = 0;
    }
    
    // 如果找到了当前用户，更新其准备状态
    if (currentUserIndex !== -1) {
      updatedUsers[currentUserIndex] = {
        ...updatedUsers[currentUserIndex],
        ready: newReadyStatus
      };
      this.setData({ users: updatedUsers });
    }
    
    // 立即检查是否可以开始游戏，确保本地状态正确
    this.checkCanStartGame();
    
    // 调用云函数更新服务器状态，但不刷新本地状态，避免覆盖
    wx.cloud.callFunction({
      name: 'updateReadyStatus',
      data: {
        roomId: this.data.roomId,
        ready: newReadyStatus
      },
      fail: error => {
        console.error('更新准备状态失败：', error);
        // 失败时恢复本地状态
        this.setData({
          isReady: !newReadyStatus
        });
        // 恢复用户列表中的状态
        const restoredUsers = [...this.data.users];
        let restoreUserIndex = restoredUsers.findIndex(user => user.openid === openid);
        
        // 单人模式下，如果找不到用户，默认恢复第一个用户
        if (restoreUserIndex === -1 && restoredUsers.length === 1) {
          restoreUserIndex = 0;
        }
        
        if (restoreUserIndex !== -1) {
          restoredUsers[restoreUserIndex] = {
            ...restoredUsers[restoreUserIndex],
            ready: !newReadyStatus
          };
          this.setData({ users: restoredUsers });
        }
        this.checkCanStartGame();
      }
    });
  },

  // 检查是否可以开始游戏
  checkCanStartGame() {
    const { users, isHost } = this.data;
    console.log('检查是否可以开始游戏，用户列表：', users, '是否是房主：', isHost);
    
    // 特殊处理：如果没有房主信息，且只有一个玩家，默认该玩家是房主
    let isActualHost = isHost;
    if (!isActualHost && users.length === 1) {
      isActualHost = true;
    }
    
    // 只有房主可以开始游戏
    if (!isActualHost) {
      this.setData({ canStartGame: false });
      return;
    }
    
    // 单人模式：自己准备后即可开始
    if (users.length === 1) {
      // 自己需要准备才能开始
      const canStart = users[0].ready;
      console.log('单人模式，是否可以开始：', canStart);
      this.setData({ canStartGame: canStart });
      return;
    }
    
    // 多人模式：至少2人且所有人都准备
    if (users.length < 2) {
      this.setData({ canStartGame: false });
      return;
    }
    
    // 检查所有玩家是否都已准备
    const allReady = users.every(user => user.ready);
    console.log('多人模式，玩家数量：', users.length, '所有人都准备：', allReady);
    this.setData({ canStartGame: allReady });
  },

  // 开始游戏
  startGame() {
    if (!this.data.canStartGame) {
      console.log('不能开始游戏，条件不满足');
      return;
    }
    
    let { users, roomId } = this.data;
    
    // 单人模式：添加电脑玩家
    if (users.length === 1) {
      users.push({
        nickName: '电脑玩家',
        ready: true,
        isHost: false,
        isAI: true // 标记为AI玩家
      });
    }
    
    // 清除所有计时器，防止房主二次跳转
    this.clearAllTimers();
    
    // 单人模式下直接开始游戏，不调用云函数
    if (users.length === 2 && users[1].isAI) {
      this.startGameLogic(users, roomId);
    } else {
      // 多人模式下调用云函数更新房间状态为游戏中
      wx.cloud.callFunction({
        name: 'startGame',
        data: {
          roomId: roomId
        },
        success: res => {
          if (res.result.success) {
            this.startGameLogic(users, roomId);
          } else {
            wx.showToast({
              title: '开始游戏失败',
              icon: 'none'
            });
          }
        },
        fail: error => {
          console.error('开始游戏失败：', error);
          wx.showToast({
            title: '开始游戏失败',
            icon: 'none'
          });
        }
      });
    }
  },
  
  // 开始游戏逻辑
  startGameLogic(users, roomId) {
    // 优先选择房主作为第一个答题者
    let currentPlayerIndex = users.findIndex(user => user.isHost);
    if (currentPlayerIndex === -1) {
      currentPlayerIndex = 0;
    }
    
    // 保存游戏初始数据
    const gameData = {
      roomId: roomId,
      users: users,
      currentIdiom: null,
      currentPlayerIndex: currentPlayerIndex,
      usedIdioms: [],
      scores: users.map(() => 0),
      gameStartTime: Date.now(),
      roundStartTime: Date.now(),
      timeLimit: 30 // 30秒限时
    };
    
    wx.setStorageSync('gameData', gameData);
    
    // 跳转到游戏页面
    wx.navigateTo({
      url: '/pages/game/game'
    });
  }
})