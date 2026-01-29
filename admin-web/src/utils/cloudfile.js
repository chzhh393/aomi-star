import axios from 'axios'
import { getCloudApp } from './cloudbase.js'

const IS_DEV = import.meta.env.DEV

// 缓存已转换的链接
const cache = new Map()

/**
 * 将 cloud:// 文件ID 批量转换为临时 HTTP 下载链接
 */
export async function resolveCloudFileIds(fileIds) {
  const uncached = fileIds.filter(id => id && id.startsWith('cloud://') && !cache.has(id))

  if (uncached.length > 0) {
    try {
      if (IS_DEV) {
        const res = await axios.post('/api/cloudfile', { fileIds: uncached })
        const fileList = res.data.file_list || []
        for (const item of fileList) {
          if (item.download_url) {
            cache.set(item.fileid, item.download_url)
          }
        }
      } else {
        // 生产环境通过云函数获取临时链接
        const app = await getCloudApp()
        const res = await app.callFunction({
          name: 'admin-api',
          data: {
            apiPath: '/cloudfile',
            apiBody: { fileIds: uncached }
          }
        })
        const result = typeof res.result === 'string' ? JSON.parse(res.result) : res.result
        const body = typeof result.body === 'string' ? JSON.parse(result.body) : result
        const fileList = body.file_list || []
        for (const item of fileList) {
          if (item.download_url) {
            cache.set(item.fileid, item.download_url)
          }
        }
      }
    } catch (err) {
      console.error('转换云文件链接失败:', err)
    }
  }

  const result = {}
  for (const id of fileIds) {
    result[id] = cache.get(id) || id
  }
  return result
}

/**
 * 解析候选人数据中的所有 cloud:// 链接
 */
export async function resolveCandidateImages(candidates) {
  const fileIds = []
  for (const c of candidates) {
    if (c.images) {
      for (const url of Object.values(c.images)) {
        if (url && url.startsWith('cloud://')) fileIds.push(url)
      }
    }
    if (c.talent?.videos) {
      for (const v of c.talent.videos) {
        if (v.url && v.url.startsWith('cloud://')) fileIds.push(v.url)
        if (v.thumb && v.thumb.startsWith('cloud://')) fileIds.push(v.thumb)
      }
    }
  }

  if (fileIds.length === 0) return candidates

  const urlMap = await resolveCloudFileIds(fileIds)

  return candidates.map(c => {
    const result = { ...c }
    if (c.images) {
      const newImages = {}
      for (const [key, url] of Object.entries(c.images)) {
        newImages[key] = urlMap[url] || url
      }
      result.images = newImages
    }
    if (c.talent?.videos) {
      result.talent = {
        ...c.talent,
        videos: c.talent.videos.map(v => ({
          url: urlMap[v.url] || v.url,
          thumb: urlMap[v.thumb] || v.thumb
        }))
      }
    }
    return result
  })
}
