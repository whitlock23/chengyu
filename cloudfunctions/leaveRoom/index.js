// 云函数：离开房间
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
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
    
    // 检查玩家是否在房间中
    const playerIndex = roomData.players.findIndex(player => player.openid === wxContext.OPENID);
    if (playerIndex === -1) {
      return {
        success: false,
        error: '玩家不在该房间中'
      };
    }
    
    // 移除玩家
    let updatedPlayers = roomData.players.filter(player => player.openid !== wxContext.OPENID);
    
    // 如果房主离开，转让房主身份
    let updatedHostOpenid = roomData.hostOpenid;
    if (wxContext.OPENID === roomData.hostOpenid) {
      if (updatedPlayers.length > 0) {
        // 转让给第一个玩家
        updatedHostOpenid = updatedPlayers[0].openid;
        updatedPlayers[0].isHost = true;
      }
    }
    
    if (updatedPlayers.length === 0) {
      // 最后一个玩家离开，关闭房间
      await db.collection('rooms').doc(roomIdDb).update({
        data: {
          status: 'closed',
          players: [],
          updatedAt: db.serverDate()
        }
      });
      
      return {
        success: true,
        message: '房间已解散',
        roomClosed: true
      };
    } else {
      // 更新房间信息
      await db.collection('rooms').doc(roomIdDb).update({
        data: {
          players: updatedPlayers,
          hostOpenid: updatedHostOpenid,
          updatedAt: db.serverDate()
        }
      });
      
      return {
        success: true,
        message: '成功离开房间',
        roomClosed: false,
        updatedPlayers: updatedPlayers
      };
    }
  } catch (error) {
    console.error('离开房间失败：', error);
    return {
      success: false,
      error: error.message
    };
  }
};