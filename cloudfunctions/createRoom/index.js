// 云函数：创建房间
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 主函数入口
exports.main = async (event, context) => {
  console.log('=== createRoom函数开始执行 ===');
  console.log('收到的参数:', event);
  
  try {
    const wxContext = cloud.getWXContext();
    
    // 生成6位随机房间号
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('生成的房间号:', roomId);
    
    // 检查房间号是否已存在
    const existingRoom = await db.collection('rooms').where({
      roomId: roomId
    }).get();
    
    if (existingRoom.data.length > 0) {
      // 房间号已存在，重新生成
      return await exports.main(event, context);
    }
    
    // 尝试写入数据库
    console.log('准备写入数据库...');
    const dbResult = await db.collection('rooms').add({
      data: {
        roomId: roomId,
        hostOpenid: wxContext.OPENID,
        players: [
          {
            openid: wxContext.OPENID,
            nickName: event.nickName || '玩家',
            ready: false,
            isHost: true,
            score: 0
          }
        ],
        status: 'waiting', // waiting, playing, ended, closed
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    
    console.log('数据库写入成功:', dbResult);
    
    // 返回成功结果
    const returnResult = {
      success: true,
      roomId: roomId,
      message: '房间创建成功'
    };
    console.log('返回结果:', returnResult);
    
    return returnResult;
  } catch (error) {
    console.error('创建房间失败:', error);
    
    // 返回错误结果
    const errorResult = {
      success: false,
      error: error.message,
      message: '房间创建失败'
    };
    console.error('错误返回结果:', errorResult);
    
    return errorResult;
  } finally {
    console.log('=== createRoom函数执行结束 ===');
  }
};