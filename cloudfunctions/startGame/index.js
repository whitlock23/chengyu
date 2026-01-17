// 云函数：开始游戏
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId } = event;
  
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
    
    // 更新房间状态为游戏中
    await db.collection('rooms').doc(roomIdDb).update({
      data: {
        status: 'playing',
        updatedAt: db.serverDate()
      }
    });
    
    return {
      success: true,
      message: '游戏开始成功'
    };
  } catch (error) {
    console.error('开始游戏失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};