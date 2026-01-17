// 云函数：获取游戏状态
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId } = event;
  
  try {
    // 查找游戏状态
    const gameState = await db.collection('gameStates').doc(roomId).get();
    
    if (!gameState.data) {
      return {
        success: false,
        error: '游戏状态不存在'
      };
    }
    
    return {
      success: true,
      gameState: gameState.data
    };
  } catch (error) {
    console.error('获取游戏状态失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};