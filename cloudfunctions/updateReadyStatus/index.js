// 云函数：更新准备状态
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { roomId, ready } = event;
  
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
    
    // 更新玩家准备状态
    const updatedPlayers = roomData.players.map(player => {
      if (player.openid === wxContext.OPENID) {
        return {
          ...player,
          ready: ready
        };
      }
      return player;
    });
    
    // 更新房间
    await db.collection('rooms').doc(roomIdDb).update({
      data: {
        players: updatedPlayers,
        updatedAt: db.serverDate()
      }
    });
    
    return {
      success: true,
      message: '准备状态更新成功'
    };
  } catch (error) {
    console.error('更新准备状态失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};