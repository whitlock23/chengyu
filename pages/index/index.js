// pages/index/index.js
Page({
  data: {
    roomId: '',
    nickName: '',
    loading: false
  },

  onLoad() {
    // 页面加载时的初始化
    this.init();
    
    // 获取用户openid
    this.getUserOpenid();
    
    // 设置默认昵称：随机形容词+随机名词+随机后缀
    const adjectives = ['快乐', '聪明', '勇敢', '机智', '活泼', '可爱', '善良', '热情', '幽默', '认真'];
    const nouns = ['小龙', '小虎', '小猫', '小兔', '小鸟', '小鱼', '小熊', '小猴', '小鹿', '小松鼠'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomSuffix = Math.floor(Math.random() * 100);
    const defaultNickName = `${randomAdj}${randomNoun}${randomSuffix}`;
    this.setData({ nickName: defaultNickName });
    wx.setStorageSync('nickName', defaultNickName);
  },

  // 获取用户openid
  getUserOpenid() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        const openid = res.result.openid;
        wx.setStorageSync('openid', openid);
      },
      fail: error => {
        console.error('获取openid失败：', error);
        // 如果获取失败，使用临时openid
        const tempOpenid = 'temp_' + Date.now();
        wx.setStorageSync('openid', tempOpenid);
      }
    });
  },

  async init() {
    // 初始化，例如加载成语词典
    const idiomUtils = require('../../utils/idiom');
    await idiomUtils.loadIdioms();
  },

  // 创建房间
  createRoom() {
    this.setData({ loading: true });
    
    // 调用云函数创建房间
    wx.cloud.callFunction({
      name: 'createRoom',
      data: {
        nickName: this.data.nickName
      },
      success: res => {
        const result = res.result;
        if (result.success) {
          const roomId = result.roomId;
          
          // 保存房间信息到本地缓存
          wx.setStorageSync('roomId', roomId);
          wx.setStorageSync('isHost', true);
          wx.setStorageSync('nickName', this.data.nickName);
          
          // 跳转到房间页面
          wx.navigateTo({
            url: `/pages/room/room?roomId=${roomId}&isHost=true`
          });
        } else {
          wx.showToast({
            title: '创建房间失败：' + (result.error || '未知错误'),
            icon: 'none'
          });
        }
      },
      fail: error => {
        console.error('创建房间失败：', error);
        wx.showToast({
          title: '创建房间失败，请检查网络连接',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 加入房间
  joinRoom() {
    const { roomId, nickName } = this.data;
    if (!roomId || roomId.length !== 6) {
      wx.showToast({
        title: '请输入有效的6位房间号',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ loading: true });
    
    // 调用云函数加入房间
    wx.cloud.callFunction({
      name: 'joinRoom',
      data: {
        roomId: roomId,
        nickName: nickName
      },
      success: res => {
        const result = res.result;
        if (result.success) {
          // 保存房间信息到本地缓存
          wx.setStorageSync('roomId', roomId);
          wx.setStorageSync('isHost', false);
          wx.setStorageSync('nickName', nickName);
          
          // 跳转到房间页面
          wx.navigateTo({
            url: `/pages/room/room?roomId=${roomId}&isHost=false`
          });
        } else {
          wx.showToast({
            title: '加入房间失败：' + (result.error || '未知错误'),
            icon: 'none'
          });
        }
      },
      fail: error => {
        console.error('加入房间失败：', error);
        wx.showToast({
          title: '加入房间失败，请检查网络连接',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 输入房间号
  onRoomIdInput(e) {
    this.setData({
      roomId: e.detail.value
    });
  },

  // 输入昵称
  onNickNameInput(e) {
    const nickName = e.detail.value;
    this.setData({ nickName });
    wx.setStorageSync('nickName', nickName);
  }
})