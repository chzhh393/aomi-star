// 管理后台 HTTP API 代理
// 通过 HTTP 触发访问，前端生产环境直接调用
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  // HTTP 触发时，参数在 event 中
  // 支持两种调用：/cloudfunction 和 /cloudfile
  const { path, body } = parseEvent(event);

  // CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (path === '/cloudfunction' || path === '') {
      // 调用云函数
      const { name, data } = body;
      const res = await cloud.callFunction({
        name,
        data
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          errcode: 0,
          resp_data: JSON.stringify(res.result)
        })
      };
    }

    if (path === '/cloudfile') {
      // 批量获取文件临时下载链接
      const { fileIds } = body;
      const res = await cloud.getTempFileURL({
        fileList: fileIds
      });
      // 转换为与微信 HTTP API 一致的格式
      const fileList = res.fileList.map(f => ({
        fileid: f.fileID,
        download_url: f.tempFileURL,
        status: f.status,
        errmsg: f.errMsg
      }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ file_list: fileList })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: '未知路径' })
    };
  } catch (err) {
    console.error('[admin-api] 错误:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};

function parseEvent(event) {
  let path = '';
  let body = {};

  // HTTP 触发场景
  if (event.path) {
    path = event.path.replace(/^\/admin-api/, '');
  }

  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      body = {};
    }
  }

  // 直接调用场景（非 HTTP）
  if (!event.path && !event.body) {
    path = event.apiPath || '';
    body = event.apiBody || event;
  }

  return { path, body };
}
