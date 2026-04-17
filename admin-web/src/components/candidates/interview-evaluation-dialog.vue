<template>
  <el-dialog
    :model-value="modelValue"
    title="面试评价"
    width="960px"
    top="4vh"
    class="evaluation-dialog"
    @close="emit('update:modelValue', false)"
  >
    <div v-loading="loading" class="evaluation-dialog-body">
      <template v-if="payload">
        <div class="candidate-summary">
          <div>
            <div class="candidate-name">
              {{ payload.candidate.name || '-' }}
              <span v-if="payload.candidate.artName" class="candidate-art-name">
                ({{ payload.candidate.artName }})
              </span>
            </div>
            <div class="candidate-meta">
              <span v-if="payload.candidate.interview?.date">
                面试时间：{{ payload.candidate.interview.date }} {{ payload.candidate.interview?.time || '' }}
              </span>
              <span v-if="payload.candidate.interview?.location">
                面试地点：{{ payload.candidate.interview.location }}
              </span>
            </div>
            <div v-if="payload.candidate.interview?.notes" class="candidate-notes">
              备注：{{ payload.candidate.interview.notes }}
            </div>
          </div>
        </div>

        <div v-if="canCurrentAdminEvaluate" class="section-block">
          <div class="section-title">我的面试评价</div>
          <div v-loading="editorLoading" class="shared-card">
            <div class="evaluation-editor-head">
              <div>
                <div class="role-name">{{ currentAdminAssignment?.interviewerRoleLabel || '管理员' }}</div>
                <div class="role-meta">
                  <span>评价人：{{ currentAdminAssignment?.interviewerName || currentUser.name || currentUser.username || '-' }}</span>
                  <span v-if="currentAdminEvaluation?.submittedAt">提交时间：{{ formatDate(currentAdminEvaluation.submittedAt) }}</span>
                </div>
              </div>
              <el-tag :type="currentAdminEditable ? 'warning' : 'success'" effect="plain" round>
                {{ currentAdminEditable ? '待提交' : '已提交' }}
              </el-tag>
            </div>

            <div class="editor-grid">
              <div
                v-for="dimension in INTERVIEW_DIMENSIONS"
                :key="dimension.key"
                class="editor-dimension-card"
              >
                <div class="editor-dimension-head">
                  <span class="editor-dimension-title">{{ dimension.label }}</span>
                  <span class="editor-required">*</span>
                </div>
                <el-radio-group
                  v-model="evaluationForm.dimensions[dimension.key]"
                  :disabled="!currentAdminEditable"
                  class="grade-group"
                >
                  <el-radio-button
                    v-for="grade in GRADE_OPTIONS"
                    :key="grade"
                    :label="grade"
                    :value="grade"
                  />
                </el-radio-group>
                <el-input
                  v-model="evaluationForm.dimensionRemarks[dimension.key]"
                  type="textarea"
                  :rows="2"
                  :disabled="!currentAdminEditable"
                  :placeholder="`填写${dimension.label}备注；S/C 必填`"
                />
              </div>
            </div>

            <div class="content-block">
              <div class="content-label">风格标签</div>
              <el-checkbox-group
                v-model="evaluationForm.styleTags"
                :disabled="!currentAdminEditable"
                class="style-tag-group"
              >
                <el-checkbox
                  v-for="tag in STYLE_TAG_OPTIONS"
                  :key="tag"
                  :label="tag"
                  :value="tag"
                  :disabled="!evaluationForm.styleTags.includes(tag) && evaluationForm.styleTags.length >= 2"
                >
                  {{ tag }}
                </el-checkbox>
              </el-checkbox-group>
              <div class="editor-tip">必须选择 1-2 个风格标签。</div>
            </div>

            <div v-if="currentAdminEditable" class="editor-actions">
              <el-button
                type="primary"
                :loading="editorSubmitting"
                @click="handleSubmitMyEvaluation"
              >
                提交我的评价
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="hasSharedMaterials" class="section-block">
          <div class="section-title">面试资料</div>
          <div class="shared-card">
            <div v-if="payload.sharedMaterials?.uploadedBy || payload.sharedMaterials?.uploadedAt" class="shared-meta">
              <span v-if="payload.sharedMaterials?.uploadedBy">上传人：{{ payload.sharedMaterials.uploadedBy }}</span>
              <span v-if="payload.sharedMaterials?.uploadedAt">上传时间：{{ formatDate(payload.sharedMaterials.uploadedAt) }}</span>
            </div>
            <div v-if="payload.sharedMaterials?.comment" class="comment-text">
              {{ payload.sharedMaterials.comment }}
            </div>
            <div v-if="payload.sharedMaterials?.images?.length" class="media-grid">
              <el-image
                v-for="(image, index) in payload.sharedMaterials.images"
                :key="`${image.url}-${index}`"
                :src="image.url"
                class="media-image"
                fit="cover"
                :preview-src-list="payload.sharedMaterials.images.map(item => item.url)"
                :initial-index="index"
                preview-teleported
              />
            </div>
            <div v-if="payload.sharedMaterials?.videos?.length" class="video-grid">
              <video
                v-for="(video, index) in payload.sharedMaterials.videos"
                :key="`${video.url}-${index}`"
                :src="video.url"
                controls
                class="media-video"
              />
            </div>
          </div>
        </div>

        <div v-if="payload.evaluations?.length" class="section-block">
          <div class="section-title">面试评价内容</div>
          <div class="evaluation-list">
            <div
              v-for="item in payload.evaluations"
              :key="item.roleKey"
              class="evaluation-card"
            >
              <div class="evaluation-header">
                <div>
                  <div class="role-name">{{ item.roleName || '-' }}</div>
                  <div class="role-meta">
                    <span v-if="item.evaluatorName">评价人：{{ item.evaluatorName }}</span>
                    <span v-if="item.evaluatedAt">提交时间：{{ formatDate(item.evaluatedAt) }}</span>
                  </div>
                </div>
                <div class="header-right">
                  <el-tag :type="item.completed ? 'success' : 'info'" effect="plain" round>
                    {{ item.completed ? '已完成评价' : '未完成评价' }}
                  </el-tag>
                  <el-tag v-if="item.score !== '' && item.score !== null && item.score !== undefined" type="warning" round>
                    评分：{{ formatScore(item.score) }}
                  </el-tag>
                </div>
              </div>

              <div v-if="item.comment" class="content-block">
                <div class="content-label">评价内容</div>
                <div class="comment-text">
                  {{ item.comment }}
                </div>
              </div>

              <div v-if="getLocalizedScoreSections(item).length" class="content-block">
                <div class="content-label">环节评价</div>
                <div class="score-section-list">
                  <div
                    v-for="section in getLocalizedScoreSections(item)"
                    :key="section.key"
                    class="score-section-card"
                  >
                    <div class="score-section-title">{{ section.label }}</div>
                    <div class="score-detail-list">
                      <div
                        v-for="detail in section.details"
                        :key="detail.key"
                        class="score-detail-item"
                      >
                        <span class="score-detail-label">{{ detail.label }}</span>
                        <span class="score-detail-value">{{ detail.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="hasSectionMedia(item)" class="content-block">
                <div class="content-label">图片与视频资料</div>
                <div class="media-section-list">
                  <div
                    v-for="section in item.mediaSections || getMediaSections(item)"
                    :key="section.key"
                    class="media-section-card"
                  >
                    <div class="media-section-title">{{ section.label }}</div>
                    <div v-if="section.images.length" class="media-grid">
                      <el-image
                        v-for="(image, index) in section.images"
                        :key="`${image.url}-${index}`"
                        :src="image.url"
                        class="media-image"
                        fit="cover"
                        :preview-src-list="section.images.map(media => media.url)"
                        :initial-index="index"
                        preview-teleported
                      />
                    </div>
                    <div v-if="section.videos.length" class="video-grid">
                      <video
                        v-for="(video, index) in section.videos"
                        :key="`${video.url}-${index}`"
                        :src="video.url"
                        controls
                        class="media-video"
                      />
                    </div>
                    <div v-if="section.videoLinks.length" class="link-list">
                      <a
                        v-for="(link, index) in section.videoLinks"
                        :key="`${link}-${index}`"
                        :href="link"
                        target="_blank"
                        rel="noreferrer"
                        class="video-link"
                      >
                        {{ link }}
                      </a>
                    </div>
                    <div v-if="!section.images.length && !section.videos.length && !section.videoLinks.length" class="media-empty">
                      暂无资料
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <el-empty
          v-if="!payload.evaluations?.length && !hasSharedMaterials"
          description="暂无面试评价"
        />
      </template>

      <el-empty
        v-else-if="!loading"
        description="暂无面试评价"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { adminAPI } from '../../api/admin'
import { interviewAPI } from '../../api/interview'
import { formatDate } from '../../utils/constants'
import { resolveCloudFileIds } from '../../utils/cloudfile'
import { getUserInfo } from '../../utils/permission'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  candidateId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const payload = ref(null)
const editorLoading = ref(false)
const editorSubmitting = ref(false)
const currentAdminAssignment = ref(null)
const currentAdminEvaluation = ref(null)
const currentAdminEditable = ref(false)
const currentUser = computed(() => getUserInfo() || {})
const MEDIA_SECTION_META = [
  { key: 'talent', label: '才艺展示', keywords: ['talent', '才艺', 'show'] },
  { key: 'teaching', label: '现场教学', keywords: ['teaching', 'live_teaching', 'teachingdemo', '教学'] },
  { key: 'introQa', label: '自我介绍&基础问答', keywords: ['selfintro', 'self_intro', 'intro', 'qa', '问答', '自我介绍', '基础问答'] }
]
const GRADE_OPTIONS = ['S', 'A', 'B', 'C']
const INTERVIEW_DIMENSIONS = [
  { key: 'appearance', label: '形象气质' },
  { key: 'talent', label: '才艺表现' },
  { key: 'teaching', label: '现场教学' },
  { key: 'selfIntro', label: '自我介绍' },
  { key: 'qa', label: '基础问答' }
]
const STYLE_TAG_OPTIONS = ['体育生', '霸总', '奶狗', '盐系', '肌肉男', '忧郁', '沙雕']
const SCORE_SECTION_META = [
  { key: 'talent', label: '才艺展示', dimensions: ['talent'] },
  { key: 'teaching', label: '现场教学', dimensions: ['teaching'] },
  { key: 'introQa', label: '自我介绍&基础问答', dimensions: ['selfIntro', 'qa'] }
]
const evaluationForm = reactive(createEmptyEvaluationForm())

const canCurrentAdminEvaluate = computed(() => Boolean(currentAdminAssignment.value))

const hasSharedMaterials = computed(() => {
  const shared = payload.value?.sharedMaterials
  return Boolean(
    shared &&
    (
      shared.comment ||
      shared.images?.length ||
      shared.videos?.length
    )
  )
})

function isCloudFileId(value) {
  return typeof value === 'string' && value.startsWith('cloud://')
}

function isTemporaryMediaUrl(value) {
  return typeof value === 'string' && (
    value.startsWith('wxfile://') ||
    value.startsWith('http://tmp') ||
    value.startsWith('https://tmp')
  )
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.some(hasMeaningfulValue)
  if (typeof value === 'object') return Object.values(value).some(hasMeaningfulValue)
  return true
}

function formatFieldLabel(key) {
  const labelMap = {
    appearance: '形象气质',
    talent: '才艺展示',
    teaching: '现场教学',
    selfIntro: '自我介绍',
    qa: '基础问答',
    styleTags: '风格标签',
    dimensionRemarks: '维度备注',
    dimensionPresetTags: '维度标签',
    expression: '表达能力',
    personality: '个性特点',
    cooperation: '配合度',
    cameraSense: '镜头感',
    stagePresence: '舞台表现',
    communication: '沟通表达',
    adaptability: '适应能力',
    learningAbility: '学习能力',
    potential: '发展潜力',
    professionalism: '专业度',
    overall: '综合表现'
  }

  if (labelMap[key]) return labelMap[key]

  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value
      .map(item => formatFieldValue(item))
      .filter(item => item !== '-')
      .join('、') || '-'
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, item]) => hasMeaningfulValue(item))
      .map(([key, item]) => `${formatFieldLabel(key)}：${formatFieldValue(item)}`)
      .join('；') || '-'
  }
  return String(value)
}

function formatScore(value) {
  const scoreLabelMap = {
    pass_s: '通过 S',
    pass_a: '通过 A',
    pass_b: '通过 B',
    fail: '不通过',
    pending: '待定'
  }

  return scoreLabelMap[value] || value
}

function createEmptyEvaluationForm() {
  return {
    dimensions: INTERVIEW_DIMENSIONS.reduce((result, item) => {
      result[item.key] = ''
      return result
    }, {}),
    dimensionRemarks: INTERVIEW_DIMENSIONS.reduce((result, item) => {
      result[item.key] = ''
      return result
    }, {}),
    styleTags: []
  }
}

function resetEvaluationForm() {
  const nextForm = createEmptyEvaluationForm()
  Object.keys(nextForm.dimensions).forEach((key) => {
    evaluationForm.dimensions[key] = nextForm.dimensions[key]
    evaluationForm.dimensionRemarks[key] = nextForm.dimensionRemarks[key]
  })
  evaluationForm.styleTags = []
}

function hydrateEvaluationForm(evaluation) {
  resetEvaluationForm()
  if (!evaluation) return

  INTERVIEW_DIMENSIONS.forEach((dimension) => {
    evaluationForm.dimensions[dimension.key] = evaluation.dimensions?.[dimension.key] || ''
    evaluationForm.dimensionRemarks[dimension.key] = evaluation.dimensionRemarks?.[dimension.key] || ''
  })
  evaluationForm.styleTags = Array.isArray(evaluation.styleTags) ? evaluation.styleTags.slice(0, 2) : []
}

function buildIdentifierSet(source = {}) {
  if (!source) return new Set()
  if (typeof source === 'string') return new Set([String(source)])

  return new Set(
    [
      source._id,
      source.id,
      source.username,
      source.account,
      source.name,
      source.userId,
      source.adminId
    ]
      .filter(Boolean)
      .map((item) => String(item))
  )
}

function findCurrentAdminAssignment(summaryPayload) {
  if (currentUser.value.role !== 'admin') return null

  const userIdentifiers = buildIdentifierSet(currentUser.value)
  const assignedInterviewers = summaryPayload?.progress?.assignedInterviewers || []

  return assignedInterviewers.find((item) => {
    if (item?.interviewerRole !== 'admin') return false
    const interviewerIdentifiers = buildIdentifierSet({
      id: item.interviewerId,
      _id: item.interviewerId,
      userId: item.interviewerId,
      adminId: item.interviewerId,
      username: item.interviewerName,
      account: item.interviewerName,
      name: item.interviewerName
    })
    return [...interviewerIdentifiers].some((identifier) => userIdentifiers.has(identifier))
  }) || null
}

function getScoreDetailEntries(item) {
  const scoreSource = (
    item?.rawFields?.scores ||
    item?.rawFields?.dimensions ||
    null
  )

  if (!scoreSource || typeof scoreSource !== 'object' || Array.isArray(scoreSource)) {
    return []
  }

  const remarks = item?.rawFields?.dimensionRemarks || {}
  const presetTags = item?.rawFields?.dimensionPresetTags || {}

  return Object.entries(scoreSource)
    .filter(([, value]) => hasMeaningfulValue(value))
    .map(([key, value]) => ({
      key,
      label: formatFieldLabel(key),
      value: [
        formatFieldValue(value),
        hasMeaningfulValue(remarks[key]) ? `备注：${formatFieldValue(remarks[key])}` : '',
        hasMeaningfulValue(presetTags[key]) ? `标签：${formatFieldValue(presetTags[key])}` : ''
      ].filter(Boolean).join(' | ')
    }))
}

function normalizeMediaSectionKey(value = '') {
  const text = String(value || '').toLowerCase().replace(/[\s_-]/g, '')
  if (!text) {
    return 'talent'
  }

  for (const section of MEDIA_SECTION_META) {
    if (section.keywords.some((keyword) => text.includes(String(keyword).toLowerCase().replace(/[\s_-]/g, '')))) {
      return section.key
    }
  }

  return 'talent'
}

function inferMediaSection(media) {
  const source = [
    media?.section,
    media?.type,
    media?.name,
    media?.label,
    media?.description,
    media?.rawUrl,
    media?.url
  ].filter(Boolean).join(' ')

  return normalizeMediaSectionKey(source)
}

function buildEmptyMediaSection(section) {
  return {
    key: section.key,
    label: section.label,
    images: [],
    videos: [],
    videoLinks: []
  }
}

function getMediaSections(item) {
  const sectionMap = MEDIA_SECTION_META.reduce((result, section) => {
    result[section.key] = buildEmptyMediaSection(section)
    return result
  }, {})

  ;(item?.images || []).forEach((media) => {
    sectionMap[inferMediaSection(media)].images.push(media)
  })

  ;(item?.videos || []).forEach((media) => {
    sectionMap[inferMediaSection(media)].videos.push(media)
  })

  ;(item?.videoLinks || []).forEach((link) => {
    sectionMap[inferMediaSection({ rawUrl: link, url: link })].videoLinks.push(link)
  })

  return MEDIA_SECTION_META.map((section) => sectionMap[section.key])
}

function hasSectionMedia(item) {
  const sections = item?.mediaSections?.length ? item.mediaSections : getMediaSections(item)
  return sections.some((section) => (
    section.images.length ||
    section.videos.length ||
    section.videoLinks.length
  ))
}

function getLocalizedScoreSections(item) {
  const detailMap = new Map(getScoreDetailEntries(item).map((detail) => [detail.key, detail]))

  return SCORE_SECTION_META.map((section) => ({
    key: section.key,
    label: section.label,
    details: section.dimensions
      .map((dimensionKey) => detailMap.get(dimensionKey))
      .filter(Boolean)
  })).filter((section) => section.details.length > 0)
}

function normalizeMediaEntry(entry) {
  if (!entry) return null

  if (typeof entry === 'string') {
    return {
      url: entry,
      rawUrl: entry
    }
  }

  if (typeof entry !== 'object') return null

  const url = entry.url || entry.fileId || entry.fileID || entry.path || entry.link || ''
  if (!url) return null

  return {
    ...entry,
    url,
    rawUrl: entry.rawUrl || url
  }
}

function normalizeMediaList(list) {
  if (!Array.isArray(list)) return []
  return list
    .map(normalizeMediaEntry)
    .filter(Boolean)
}

function normalizeDialogPayload(data) {
  if (!data || typeof data !== 'object') return data

  const nextData = {
    ...data,
    sharedMaterials: data.sharedMaterials
      ? {
          ...data.sharedMaterials,
          images: normalizeMediaList(data.sharedMaterials.images),
          videos: normalizeMediaList(data.sharedMaterials.videos)
        }
      : null,
    evaluations: Array.isArray(data.evaluations)
      ? data.evaluations.map(item => ({
          ...item,
          images: normalizeMediaList(item.images),
          videos: normalizeMediaList(item.videos),
          videoLinks: Array.isArray(item.videoLinks)
            ? item.videoLinks.map(link => {
                const normalized = normalizeMediaEntry(link)
                return normalized ? normalized.rawUrl : link
              }).filter(Boolean)
            : [],
          mediaSections: []
        }))
      : []
  }

  nextData.evaluations = nextData.evaluations.map((item) => ({
    ...item,
    mediaSections: getMediaSections(item)
  }))

  return nextData
}

function collectMediaIds(data) {
  const fileIds = []
  const addUrl = (url) => {
    if (isCloudFileId(url)) {
      fileIds.push(url)
    }
  }

  data?.sharedMaterials?.images?.forEach(item => addUrl(item.rawUrl || item.url))
  data?.sharedMaterials?.videos?.forEach(item => addUrl(item.rawUrl || item.url))
  data?.evaluations?.forEach((item) => {
    item.images?.forEach(media => addUrl(media.rawUrl || media.url))
    item.videos?.forEach(media => addUrl(media.rawUrl || media.url))
    item.videoLinks?.forEach(addUrl)
  })

  return [...new Set(fileIds)]
}

function collectUnresolvedMediaIds(data) {
  const unresolved = []
  const addMedia = (media) => {
    const rawUrl = media?.rawUrl || media?.url || ''
    if (isCloudFileId(rawUrl) && !media?.url) {
      unresolved.push(rawUrl)
    }
  }

  data?.sharedMaterials?.images?.forEach(addMedia)
  data?.sharedMaterials?.videos?.forEach(addMedia)
  data?.evaluations?.forEach((item) => {
    item.images?.forEach(addMedia)
    item.videos?.forEach(addMedia)
  })

  return [...new Set(unresolved)]
}

function replaceMediaUrls(data, urlMap) {
  const mapUrl = (url) => (isCloudFileId(url) ? (urlMap[url] || '') : url)
  const mapMedia = (media) => {
    const sourceUrl = media?.rawUrl || media?.url || ''
    if (isTemporaryMediaUrl(sourceUrl)) {
      return {
        ...media,
        rawUrl: sourceUrl,
        url: ''
      }
    }
    const resolvedUrl = mapUrl(sourceUrl)
    return {
      ...media,
      rawUrl: sourceUrl,
      url: resolvedUrl
    }
  }
  const hasResolvedUrl = (media) => !!media?.url

  if (data.sharedMaterials) {
    data.sharedMaterials.images = (data.sharedMaterials.images || [])
      .map(mapMedia)
      .filter(hasResolvedUrl)
    data.sharedMaterials.videos = (data.sharedMaterials.videos || [])
      .map(mapMedia)
      .filter(hasResolvedUrl)
  }

  data.evaluations = (data.evaluations || []).map(item => ({
    ...item,
    images: (item.images || [])
      .map(mapMedia)
      .filter((media) => hasResolvedUrl(media) || media?.rawUrl),
    videos: (item.videos || [])
      .map(mapMedia)
      .filter((media) => hasResolvedUrl(media) || media?.rawUrl),
    videoLinks: (item.videoLinks || [])
      .map(mapUrl)
      .filter(Boolean)
  })).map((item) => ({
    ...item,
    mediaSections: getMediaSections(item)
  }))
}

async function loadData() {
  if (!props.candidateId) {
    payload.value = null
    currentAdminAssignment.value = null
    currentAdminEvaluation.value = null
    currentAdminEditable.value = false
    resetEvaluationForm()
    return
  }

  loading.value = true
  try {
    const [res, summaryRes] = await Promise.all([
      adminAPI.getCandidateInterviewEvaluations(props.candidateId),
      currentUser.value.role === 'admin'
        ? interviewAPI.getCandidateSummary(props.candidateId)
        : Promise.resolve({ success: true, data: null })
    ])
    if (!res.success) {
      throw new Error(res.error || '获取面试评价失败')
    }

    const nextPayload = normalizeDialogPayload(res.data || null)
    const fileIds = collectMediaIds(nextPayload)
    if (fileIds.length) {
      const urlMap = await resolveCloudFileIds(fileIds)
      replaceMediaUrls(nextPayload, urlMap)

      const unresolvedIds = collectUnresolvedMediaIds(nextPayload)
      if (unresolvedIds.length) {
        const retryUrlMap = await resolveCloudFileIds(unresolvedIds)
        replaceMediaUrls(nextPayload, retryUrlMap)
      }
    }

    payload.value = nextPayload

    currentAdminAssignment.value = findCurrentAdminAssignment(summaryRes?.data || null)
    currentAdminEvaluation.value = null
    currentAdminEditable.value = false
    resetEvaluationForm()

    if (currentAdminAssignment.value) {
      editorLoading.value = true
      try {
        const detailRes = await interviewAPI.getRoleEvaluationDetail(props.candidateId, 'admin')
        if (!detailRes.success) {
          throw new Error(detailRes.error || '获取我的面试评价失败')
        }
        currentAdminEvaluation.value = detailRes.data?.evaluation || null
        currentAdminEditable.value = Boolean(detailRes.data?.editable)
        hydrateEvaluationForm(currentAdminEvaluation.value)
      } finally {
        editorLoading.value = false
      }
    }
  } catch (error) {
    payload.value = null
    currentAdminAssignment.value = null
    currentAdminEvaluation.value = null
    currentAdminEditable.value = false
    ElMessage.error(error.message || '获取面试评价失败')
  } finally {
    loading.value = false
  }
}

async function handleSubmitMyEvaluation() {
  if (!props.candidateId || !currentAdminAssignment.value || !currentAdminEditable.value) {
    return
  }

  editorSubmitting.value = true
  try {
    const res = await interviewAPI.submitEvaluation({
      candidateId: props.candidateId,
      role: currentAdminAssignment.value.interviewerRole || 'admin',
      round: '1',
      dimensions: { ...evaluationForm.dimensions },
      dimensionRemarks: { ...evaluationForm.dimensionRemarks },
      styleTags: [...evaluationForm.styleTags]
    })

    if (!res.success) {
      throw new Error(res.error || '提交评价失败')
    }

    ElMessage.success(res.message || '评价提交成功')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '提交评价失败')
  } finally {
    editorSubmitting.value = false
  }
}

watch(
  () => [props.modelValue, props.candidateId],
  ([visible, candidateId]) => {
    if (visible && candidateId) {
      loadData()
      return
    }

    if (!visible) {
      payload.value = null
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.evaluation-dialog-body {
  min-height: 240px;
}

.candidate-summary {
  padding: 16px 18px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 12px;
}

.candidate-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.candidate-art-name {
  font-size: 13px;
  color: #888;
}

.candidate-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 13px;
  color: #aaa;
}

.candidate-notes {
  margin-top: 8px;
  font-size: 13px;
  color: #ccc;
  line-height: 1.7;
}

.section-block {
  margin-top: 18px;
}

.section-title {
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid var(--color-cyan, #13e8dd);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.shared-card,
.evaluation-card {
  padding: 16px 18px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 12px;
}

.evaluation-list {
  display: grid;
  gap: 12px;
}

.evaluation-editor-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.editor-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.editor-dimension-card {
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.editor-dimension-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.editor-dimension-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.editor-required {
  color: #f56c6c;
}

.grade-group {
  margin-bottom: 12px;
}

.style-tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
}

.editor-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.editor-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.evaluation-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.role-meta,
.shared-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  color: #888;
}

.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.comment-text {
  padding: 12px 14px;
  background: rgba(19, 232, 221, 0.06);
  border: 1px solid rgba(19, 232, 221, 0.12);
  border-radius: 8px;
  color: #d5d5d5;
  line-height: 1.7;
}

.content-block {
  margin-top: 12px;
}

.content-label {
  margin-bottom: 8px;
  font-size: 12px;
  color: #888;
}

.media-grid,
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.media-image,
.media-video {
  width: 100%;
  height: 180px;
  border-radius: 10px;
  background: #1d1d1d;
  object-fit: cover;
}

.link-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.video-link {
  color: var(--color-cyan, #13e8dd);
  text-decoration: none;
  word-break: break-all;
}

.video-link:hover {
  text-decoration: underline;
}

.score-detail-list {
  display: grid;
  gap: 10px;
}

.score-section-list,
.media-section-list {
  display: grid;
  gap: 12px;
}

.score-section-card,
.media-section-card {
  padding: 12px;
  background: #1f1f1f;
  border: 1px solid #2f2f2f;
  border-radius: 10px;
}

.score-section-title,
.media-section-title {
  margin-bottom: 10px;
  color: #f5f5f5;
  font-size: 13px;
  font-weight: 600;
}

.score-detail-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #1f1f1f;
  border: 1px solid #2f2f2f;
  border-radius: 8px;
}

.score-detail-label {
  color: #888;
  font-size: 13px;
}

.score-detail-value {
  color: #ddd;
  font-size: 13px;
  text-align: right;
  word-break: break-word;
}

.media-empty {
  color: #7f7f7f;
  font-size: 12px;
}

@media (max-width: 768px) {
  .evaluation-header {
    flex-direction: column;
  }

  .header-right {
    justify-content: flex-start;
  }

  .media-grid,
  .video-grid {
    grid-template-columns: 1fr;
  }

  .score-detail-item {
    flex-direction: column;
  }

  .score-detail-value {
    text-align: left;
  }
}
</style>
