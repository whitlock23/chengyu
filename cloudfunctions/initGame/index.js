// 云函数：初始化游戏状态
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId, initialIdiom } = event;
  
  try {
    // 查找房间
    const room = await db.collection('rooms').where({
      roomId: roomId
    }).get();
    
    if (room.data.length === 0) {
      return {
        success: false,
        error: '房间不存在'
      };
    }
    
    const roomData = room.data[0];
    const roomIdDb = roomData._id;
    
    // 初始化游戏状态
    const gameState = {
      roomId: roomId,
      currentIdiom: initialIdiom,
      usedIdioms: [initialIdiom],
      currentPlayerIndex: 0, // 房主先答
      scores: roomData.players.map(() => 0),
      gameStartTime: Date.now(),
      roundStartTime: Date.now(),
      status: 'playing',
      updatedAt: db.serverDate()
    };
    
    // 保存游戏状态到数据库
    await db.collection('gameStates').doc(roomId).set({
      data: gameState
    });
    
    return {
      success: true,
      gameState: gameState
    };
  } catch (error) {
    console.error('初始化游戏状态失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};