// app.js
const idiomUtils = require('./utils/idiom');

App({
  onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: 'cloud1-2g8hfh3vb9388a1e', // 替换为你的云开发环境ID
      traceUser: true
    })
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        console.log('登录成功', res.code)
      }
    })
    
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo

              // 存储用户信息到本地
              wx.setStorageSync('userInfo', res.userInfo)
              wx.setStorageSync('nickName', res.userInfo.nickName)

              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    })
    
    // 预加载成语词典，避免游戏开始时卡顿
    console.log('小程序启动，开始预加载成语词典...');
    idiomUtils.loadIdioms().then(() => {
      console.log('成语词典预加载完成');
    }).catch((error) => {
      console.error('成语词典预加载失败:', error);
    });
  },
  globalData: {
    userInfo: null
  }
})
