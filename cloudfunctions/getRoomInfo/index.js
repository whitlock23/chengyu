// 云函数：获取房间信息
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
    
    return {
      success: true,
      room: roomData
    };
  } catch (error) {
    console.error('获取房间信息失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};