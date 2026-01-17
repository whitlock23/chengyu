// 云函数：加入房间
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { roomId, nickName } = event;
  
  try {
    // 查找房间
    const room = await db.collection('rooms').where({
      roomId: roomId
    }).get();
    
    if (room.data.length === 0) {
      return {
        success: false,
        error: '房间不存在或已解散'
      };
    }
    
    const roomData = room.data[0];
    
    // 检查房间状态
    if (roomData.status === 'closed') {
      return {
        success: false,
        error: '房间已解散'
      };
    }
    
    // 检查是否已在房间中
    const isInRoom = roomData.players.some(player => player.openid === wxContext.OPENID);
    if (isInRoom) {
      return {
        success: true,
        room: roomData
      };
    }
    
    // 检查房间人数是否已满
    if (roomData.players.length >= 10) {
      return {
        success: false,
        error: '房间人数已满'
      };
    }
    
    // 添加新玩家
    const updatedPlayers = [...roomData.players, {
      openid: wxContext.OPENID,
      nickName: nickName || '玩家',
      ready: false,
      isHost: false,
      score: 0
    }];
    
    // 更新房间
    await db.collection('rooms').doc(roomData._id).update({
      data: {
        players: updatedPlayers,
        updatedAt: db.serverDate()
      }
    });
    
    return {
      success: true,
      room: {
        ...roomData,
        players: updatedPlayers
      }
    };
  } catch (error) {
    console.error('加入房间失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};