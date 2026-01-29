import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      // 本地代理中间件：自动管理 access_token，转发云函数调用
      {
        name: 'wx-cloud-proxy',
        configureServer(server) {
          let accessToken = ''
          let tokenExpireTime = 0

          async function getAccessToken() {
            if (accessToken && Date.now() < tokenExpireTime) {
              return accessToken
            }
            const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${env.WX_APPID}&secret=${env.WX_APPSECRET}`
            const res = await fetch(url)
            const data = await res.json()
            if (data.access_token) {
              accessToken = data.access_token
              tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000
              return accessToken
            }
            throw new Error(data.errmsg || '获取 access_token 失败')
          }

          // cloud:// 文件链接转换为临时 HTTP 下载链接
          server.middlewares.use('/api/cloudfile', async (req, res) => {
            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const body = Buffer.concat(chunks).toString()

            try {
              const { fileIds } = JSON.parse(body)
              const token = await getAccessToken()
              const cloudEnv = env.VITE_WX_CLOUD_ENV

              const wxRes = await fetch(
                `https://api.weixin.qq.com/tcb/batchdownloadfile?access_token=${token}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    env: cloudEnv,
                    file_list: fileIds.map(id => ({ fileid: id, max_age: 7200 }))
                  })
                }
              )
              const wxData = await wxRes.json()

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(wxData))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })

          server.middlewares.use('/api/cloudfunction', async (req, res) => {
            // 读取请求体
            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const body = Buffer.concat(chunks).toString()

            try {
              const { name, data } = JSON.parse(body)
              const token = await getAccessToken()
              const cloudEnv = env.VITE_WX_CLOUD_ENV

              const wxRes = await fetch(
                `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${token}&env=${cloudEnv}&name=${name}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                }
              )
              const wxData = await wxRes.json()

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(wxData))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        }
      }
    ]
  }
})
