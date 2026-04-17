import axios from 'axios'
import { getCloudApp } from '../utils/cloudbase.js'

const IS_DEV = import.meta.env.DEV

class WxCloudAPI {
  async callFunction(name, payload = {}) {
    const {
      needToken = true,
      ...data
    } = payload

    // 兼容历史 key：admin_token；当前登录流程使用 token
    const adminToken = needToken
      ? (localStorage.getItem('token') || localStorage.getItem('admin_token'))
      : ''

    const requestData = needToken
      ? { ...data, token: adminToken }
      : data

    if (IS_DEV) {
      const response = await axios.post('/api/cloudfunction', {
        name,
        data: requestData
      })
      const result = response.data
      if (result.errcode && result.errcode !== 0) {
        throw new Error(result.errmsg || '云函数调用失败')
      }
      return JSON.parse(result.resp_data)
    }

    // 生产环境走 CloudBase JS SDK
    const app = await getCloudApp()
    const res = await app.callFunction({
      name,
      data: requestData
    })
    return res.result
  }
}

export default new WxCloudAPI()
