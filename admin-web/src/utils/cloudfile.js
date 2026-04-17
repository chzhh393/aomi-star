import axios from 'axios'
import { getCloudApp } from './cloudbase.js'

const IS_DEV = import.meta.env.DEV

// 缓存已转换的链接
const cache = new Map()

const CHUNK_SIZE = 40
const RETRY_DELAY_MS = 250

function isCloudFileId(value) {
  return typeof value === 'string' && value.startsWith('cloud://')
}

function chunkArray(list, size) {
  const chunks = []
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size))
  }
  return chunks
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseFileList(payload) {
  let data = payload
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return []
    }
  }

  if (data && typeof data.body === 'string') {
    try {
      data = JSON.parse(data.body)
    } catch {
      return []
    }
  }

  if (!data || typeof data !== 'object') return []

  if (Array.isArray(data.file_list)) return data.file_list
  if (Array.isArray(data.fileList)) {
    return data.fileList.map((f) => ({
      fileid: f.fileid || f.fileID,
      download_url: f.download_url || f.tempFileURL,
      status: f.status,
      errmsg: f.errmsg || f.errMsg
    }))
  }
  return []
}

function saveFileListToCache(fileList = []) {
  for (const item of fileList) {
    const fileId = item.fileid || item.fileID
    const downloadUrl = item.download_url || item.tempFileURL
    if (fileId && downloadUrl) {
      cache.set(fileId, downloadUrl)
    }
  }
}

async function requestViaDevProxy(fileIds) {
  const res = await axios.post('/api/cloudfile', { fileIds })
  return parseFileList(res.data)
}

async function requestViaAdminApi(fileIds) {
  const app = await getCloudApp()
  const res = await app.callFunction({
    name: 'admin-api',
    data: {
      apiPath: '/cloudfile',
      apiBody: { fileIds }
    }
  })
  return parseFileList(res.result)
}

async function resolveByRequester(fileIds, requester, options = {}) {
  if (!fileIds.length) return
  const {
    maxAttempts = 1,
    retryDelayMs = RETRY_DELAY_MS
  } = options

  let unresolved = [...fileIds]

  for (let attempt = 0; attempt < maxAttempts && unresolved.length; attempt += 1) {
    const chunks = chunkArray(unresolved, CHUNK_SIZE)
    for (const chunk of chunks) {
      const fileList = await requester(chunk)
      saveFileListToCache(fileList)
    }

    unresolved = unresolved.filter((id) => !cache.has(id))
    if (unresolved.length && attempt < maxAttempts - 1) {
      await sleep(retryDelayMs)
    }
  }
}

/**
 * 将 cloud:// 文件ID 批量转换为临时 HTTP 下载链接
 */
export async function resolveCloudFileIds(fileIds) {
  const uncached = [...new Set(fileIds.filter(id => isCloudFileId(id) && !cache.has(id)))]

  if (uncached.length > 0) {
    try {
      if (IS_DEV) {
        await resolveByRequester(uncached, requestViaDevProxy, {
          maxAttempts: 2
        })
      } else {
        await resolveByRequester(uncached, requestViaAdminApi, {
          maxAttempts: 2
        })
      }
    } catch (err) {
      console.error('转换云文件链接失败（主通道）:', err)
    }

    // 兜底：主通道失败或部分未命中时，统一再走 admin-api 一次
    const unresolved = uncached.filter(id => !cache.has(id))
    if (unresolved.length > 0) {
      try {
        await resolveByRequester(unresolved, requestViaAdminApi, {
          maxAttempts: 3,
          retryDelayMs: 400
        })
      } catch (err) {
        console.error('转换云文件链接失败（兜底通道）:', err)
      }

      const stillUnresolved = unresolved.filter(id => !cache.has(id))
      if (stillUnresolved.length > 0) {
        console.warn(`仍有 ${stillUnresolved.length} 个云文件链接未转换成功`)
      }
    }
  }

  const result = {}
  for (const id of fileIds) {
    if (isCloudFileId(id)) {
      result[id] = cache.get(id) || ''
    } else {
      result[id] = id
    }
  }
  return result
}

/**
 * 解析候选人数据中的所有 cloud:// 链接
 */
export async function resolveCandidateImages(candidates) {
  const fileIds = []
  const pushCloudId = (value) => {
    if (isCloudFileId(value)) fileIds.push(value)
  }
  const mapDisplayUrl = (url, urlMap) => (isCloudFileId(url) ? (urlMap[url] || '') : url)
  const mapMediaEntry = (entry, urlMap) => {
    if (!entry) return entry
    if (typeof entry === 'string') {
      return {
        url: mapDisplayUrl(entry, urlMap)
      }
    }
    if (typeof entry !== 'object') return entry

    return {
      ...entry,
      url: mapDisplayUrl(entry.url || entry.fileId || entry.fileID || entry.path || '', urlMap),
      thumb: mapDisplayUrl(entry.thumb, urlMap)
    }
  }

  for (const c of candidates) {
    if (c.images) {
      for (const url of Object.values(c.images)) {
        pushCloudId(url)
      }
    }
    pushCloudId(c.experience?.incomeScreenshot)
    if (c.talent?.videos) {
      for (const v of c.talent.videos) {
        if (typeof v === 'string') {
          pushCloudId(v)
          continue
        }
        pushCloudId(v?.url)
        pushCloudId(v?.thumb)
      }
    }
    if (c.interview?.materials?.photos) {
      for (const photo of c.interview.materials.photos) {
        if (typeof photo === 'string') {
          pushCloudId(photo)
          continue
        }
        pushCloudId(photo?.url)
        pushCloudId(photo?.fileId)
        pushCloudId(photo?.fileID)
        pushCloudId(photo?.path)
        pushCloudId(photo?.thumb)
      }
    }
    if (c.interview?.materials?.videos) {
      for (const video of c.interview.materials.videos) {
        if (typeof video === 'string') {
          pushCloudId(video)
          continue
        }
        pushCloudId(video?.url)
        pushCloudId(video?.fileId)
        pushCloudId(video?.fileID)
        pushCloudId(video?.path)
        pushCloudId(video?.thumb)
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
        newImages[key] = mapDisplayUrl(url, urlMap)
      }
      result.images = newImages
    }
    if (c.talent?.videos) {
      result.talent = {
        ...c.talent,
        videos: c.talent.videos.map(v => {
          if (typeof v === 'string') {
            return {
              url: urlMap[v] || '',
              thumb: ''
            }
          }
          return {
            ...v,
            url: mapDisplayUrl(v.url, urlMap),
            thumb: mapDisplayUrl(v.thumb, urlMap)
          }
        })
      }
    }
    if (c.experience?.incomeScreenshot) {
      result.experience = {
        ...c.experience,
        incomeScreenshot: mapDisplayUrl(c.experience.incomeScreenshot, urlMap)
      }
    }
    if (c.interview?.materials) {
      result.interview = {
        ...c.interview,
        materials: {
          ...c.interview.materials,
          photos: Array.isArray(c.interview.materials.photos)
            ? c.interview.materials.photos.map((photo) => mapMediaEntry(photo, urlMap))
            : c.interview.materials.photos,
          videos: Array.isArray(c.interview.materials.videos)
            ? c.interview.materials.videos.map((video) => mapMediaEntry(video, urlMap))
            : c.interview.materials.videos
        }
      }
    }
    return result
  })
}
