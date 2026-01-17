// 云函数：更新游戏状态
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId, nextIdiom, currentPlayerIndex, scores, usedIdioms } = event;
  
  try {
    // 查找游戏状态
    const gameState = await db.collection('gameStates').doc(roomId).get();
    
    if (!gameState.data) {
      return {
        success: false,
        error: '游戏状态不存在'
      };
    }
    
    // 计算下一个玩家索引
    let nextPlayerIndex = currentPlayerIndex + 1;
    const room = await db.collection('rooms').where({
      roomId: roomId
    }).get();
    
    if (room.data.length === 0) {
      return {
        success: false,
        error: '房间不存在'
      };
    }
    
    const playerCount = room.data[0].players.length;
    if (nextPlayerIndex >= playerCount) {
      nextPlayerIndex = 0;
    }
    
    // 更新游戏状态
    const updatedGameState = {
      currentIdiom: nextIdiom,
      usedIdioms: usedIdioms,
      currentPlayerIndex: nextPlayerIndex,
      scores: scores,
      roundStartTime: Date.now(),
      updatedAt: db.serverDate()
    };
    
    await db.collection('gameStates').doc(roomId).update({
      data: updatedGameState
    });
    
    return {
      success: true,
      gameState: {
        ...gameState.data,
        ...updatedGameState
      }
    };
  } catch (error) {
    console.error('更新游戏状态失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};