<template>
  <div class="candidates-page">
    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input
            v-model="keyword"
            placeholder="搜索姓名"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </el-col>
        <el-col :span="18">
          <el-radio-group v-model="activeFilter" @change="handleFilterChange">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="pending">待审核</el-radio-button>
            <el-radio-button value="approved">待面试安排</el-radio-button>
            <el-radio-button value="interview_scheduled">已安排面试</el-radio-button>
            <el-radio-button value="rejected">未通过</el-radio-button>
            <el-radio-button value="signed">已签约</el-radio-button>
          </el-radio-group>
        </el-col>
      </el-row>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" style="margin-top: 16px">
      <el-table :data="list" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="姓名" width="120">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="32" :src="row.images?.facePhoto" />
              <span>{{ row.basicInfo?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="基本信息" width="180">
          <template #default="{ row }">
            {{ row.basicInfo?.gender || '-' }} / {{ row.basicInfo?.age || '-' }}岁 / {{ row.basicInfo?.height || '-' }}cm
          </template>
        </el-table-column>
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ row.basicInfo?.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="才艺" width="180">
          <template #default="{ row }">
            <el-tag
              v-for="t in (row.talent?.talents || []).slice(0, 3)"
              :key="t"
              size="small"
              style="margin-right: 4px"
            >{{ t }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type || 'info'" size="small">
              {{ STATUS_MAP[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="面试时间" width="170">
          <template #default="{ row }">
            <span v-if="row.interview">{{ row.interview.date }} {{ row.interview.time }}</span>
            <span v-else style="color: #999">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="240">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.status === 'pending'" link type="success" @click="handleApprove(row)">通过</el-button>
            <el-button v-if="row.status === 'pending'" link type="danger" @click="handleReject(row)">拒绝</el-button>
            <el-button v-if="row.status === 'approved'" link type="warning" @click="handleSchedule(row)">安排面试</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="fetchList"
          @size-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="drawerVisible" title="候选人详情" width="900px" top="3vh" align-center>
      <template v-if="currentCandidate">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentCandidate.basicInfo?.name }}</el-descriptions-item>
          <el-descriptions-item label="艺名">{{ currentCandidate.basicInfo?.artName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ currentCandidate.basicInfo?.gender }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ currentCandidate.basicInfo?.age }}岁</el-descriptions-item>
          <el-descriptions-item label="身高">{{ currentCandidate.basicInfo?.height }}cm</el-descriptions-item>
          <el-descriptions-item label="体重">{{ currentCandidate.basicInfo?.weight }}kg</el-descriptions-item>
          <el-descriptions-item label="手机">{{ currentCandidate.basicInfo?.phone }}</el-descriptions-item>
          <el-descriptions-item label="微信">{{ currentCandidate.basicInfo?.wechat || '-' }}</el-descriptions-item>
          <el-descriptions-item label="抖音">{{ currentCandidate.basicInfo?.douyin || '-' }}（{{ currentCandidate.basicInfo?.douyinFans || 0 }}粉丝）</el-descriptions-item>
          <el-descriptions-item label="小红书">{{ currentCandidate.basicInfo?.xiaohongshu || '-' }}（{{ currentCandidate.basicInfo?.xiaohongshuFans || 0 }}粉丝）</el-descriptions-item>
          <el-descriptions-item label="MBTI">{{ currentCandidate.basicInfo?.mbti || '-' }}</el-descriptions-item>
          <el-descriptions-item label="才艺等级">{{ currentCandidate.talent?.level || '-' }}</el-descriptions-item>
          <el-descriptions-item label="才艺" :span="2">
            <el-tag v-for="t in (currentCandidate.talent?.talents || [])" :key="t" style="margin-right: 4px">{{ t }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="直播经验">{{ currentCandidate.experience?.hasExperience ? '有' : '无' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentCandidate.experience?.hasExperience" label="所属公会">
            {{ currentCandidate.experience?.guild || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="STATUS_MAP[currentCandidate.status]?.type">
              {{ STATUS_MAP[currentCandidate.status]?.label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="报名时间">{{ formatDate(currentCandidate.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 面试信息 -->
        <template v-if="currentCandidate.interview">
          <h4 style="margin: 20px 0 12px">面试安排</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="面试日期">{{ currentCandidate.interview.date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="面试时间">{{ currentCandidate.interview.time || '-' }}</el-descriptions-item>
            <el-descriptions-item label="面试地点" v-if="currentCandidate.interview.location">{{ currentCandidate.interview.location }}</el-descriptions-item>
            <el-descriptions-item label="面试官" v-if="currentCandidate.interview.interviewers?.length">{{ currentCandidate.interview.interviewers.join('、') }}</el-descriptions-item>
            <el-descriptions-item label="备注" v-if="currentCandidate.interview.notes" :span="2">{{ currentCandidate.interview.notes }}</el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 照片 -->
        <h4 style="margin: 20px 0 12px">照片</h4>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center">
          <el-image
            v-for="(url, key) in candidatePhotos"
            :key="key"
            :src="url"
            style="width: 120px; height: 120px; border-radius: 8px"
            fit="cover"
            :preview-src-list="Object.values(candidatePhotos)"
          />
        </div>

        <!-- 视频 -->
        <template v-if="candidateVideos.length > 0">
          <h4 style="margin: 20px 0 12px">才艺视频</h4>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center">
            <video
              v-for="(v, i) in candidateVideos"
              :key="i"
              :src="v.url"
              :poster="v.thumb"
              controls
              style="width: 280px; border-radius: 8px; background: #000"
            />
          </div>
        </template>

        <!-- 操作按钮 -->
        <div v-if="currentCandidate.status === 'pending'" style="margin-top: 24px; display: flex; justify-content: center; gap: 12px">
          <el-button type="success" @click="handleApprove(currentCandidate)">审核通过</el-button>
          <el-button type="danger" @click="handleReject(currentCandidate)">拒绝</el-button>
        </div>
        <div v-if="currentCandidate.status === 'approved'" style="margin-top: 24px; display: flex; justify-content: center">
          <el-button type="primary" @click="handleSchedule(currentCandidate)">安排面试</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 拒绝原因对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝原因" width="400px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入拒绝原因（可选）" />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 安排面试对话框 -->
    <el-dialog v-model="scheduleDialogVisible" title="安排面试" width="500px">
      <el-form :model="scheduleForm" label-width="80px">
        <el-form-item label="面试日期" required>
          <el-date-picker v-model="scheduleForm.interviewDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="面试时间" required>
          <el-time-picker v-model="scheduleForm.interviewTime" placeholder="选择时间" format="HH:mm" value-format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="面试地点">
          <el-input v-model="scheduleForm.location" placeholder="如：公司会议室A / 线上链接" />
        </el-form-item>
        <el-form-item label="面试官">
          <el-input v-model="scheduleForm.interviewers" placeholder="多个面试官用逗号分隔" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="scheduleForm.notes" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmSchedule">确认安排</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminAPI } from '../../api/admin'
import { STATUS_MAP, formatDate } from '../../utils/constants'
import { resolveCandidateImages } from '../../utils/cloudfile'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const activeFilter = ref('all')
const keyword = ref('')

// 详情抽屉
const drawerVisible = ref(false)
const currentCandidate = ref(null)

const candidatePhotos = computed(() => {
  if (!currentCandidate.value?.images) return {}
  const imgs = currentCandidate.value.images
  const result = {}
  for (const [key, url] of Object.entries(imgs)) {
    if (url) result[key] = url
  }
  return result
})

const candidateVideos = computed(() => {
  return (currentCandidate.value?.talent?.videos || []).filter(v => v.url)
})

// 拒绝对话框
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingCandidate = ref(null)

// 面试安排对话框
const scheduleDialogVisible = ref(false)
const schedulingCandidate = ref(null)
const scheduleForm = reactive({
  interviewDate: '',
  interviewTime: '',
  location: '',
  interviewers: '',
  notes: ''
})

const submitting = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const res = await adminAPI.getCandidateList({
      page: currentPage.value,
      pageSize: pageSize.value,
      status: activeFilter.value,
      keyword: keyword.value
    })
    if (res.success) {
      list.value = await resolveCandidateImages(res.data.list)
      total.value = res.data.total
    }
  } catch (err) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchList()
}

function handleFilterChange() {
  currentPage.value = 1
  fetchList()
}

function handleView(row) {
  currentCandidate.value = row
  drawerVisible.value = true
}

async function handleApprove(row) {
  await ElMessageBox.confirm(`确认通过 ${row.basicInfo?.name} 的报名审核？`, '审核确认')
  submitting.value = true
  try {
    const res = await adminAPI.updateCandidateStatus(row._id, 'approved')
    if (res.success) {
      ElMessage.success('审核通过')
      drawerVisible.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

function handleReject(row) {
  rejectingCandidate.value = row
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function confirmReject() {
  submitting.value = true
  try {
    const res = await adminAPI.updateCandidateStatus(
      rejectingCandidate.value._id,
      'rejected',
      rejectReason.value
    )
    if (res.success) {
      ElMessage.success('已拒绝')
      rejectDialogVisible.value = false
      drawerVisible.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

function handleSchedule(row) {
  schedulingCandidate.value = row
  scheduleForm.interviewDate = ''
  scheduleForm.interviewTime = ''
  scheduleForm.location = '成都市成华区府青路街道二环路北4段3号俊屹中心下沉广场奥米光年传媒'
  scheduleForm.interviewers = ''
  scheduleForm.notes = ''
  scheduleDialogVisible.value = true
}

async function confirmSchedule() {
  if (!scheduleForm.interviewDate || !scheduleForm.interviewTime) {
    ElMessage.warning('请选择面试日期和时间')
    return
  }
  submitting.value = true
  try {
    const res = await adminAPI.scheduleInterview({
      candidateId: schedulingCandidate.value._id,
      interviewDate: scheduleForm.interviewDate,
      interviewTime: scheduleForm.interviewTime,
      location: scheduleForm.location,
      interviewers: scheduleForm.interviewers
        ? scheduleForm.interviewers.split(',').map(s => s.trim())
        : [],
      notes: scheduleForm.notes
    })
    if (res.success) {
      ElMessage.success('面试安排成功')
      scheduleDialogVisible.value = false
      drawerVisible.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.filter-card {
  margin-bottom: 0;
}
</style>
