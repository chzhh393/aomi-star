<template>
  <div class="metric-grid">
    <button
      v-for="card in cards"
      :key="card.key"
      type="button"
      class="metric-card"
      :class="[
        card.tone || 'default',
        {
          active: Boolean(card.active) || (activeKey !== undefined && activeKey !== null && activeKey === card.key),
          clickable: clickable
        }
      ]"
      :disabled="!clickable"
      @click="handleClick(card.selectKey ?? card.key)"
    >
      <div class="metric-card__content">
        <div class="metric-card__value">{{ card.value }}</div>
        <div class="metric-card__label">{{ card.label }}</div>
      </div>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  cards: {
    type: Array,
    default: () => []
  },
  activeKey: {
    type: [String, Number],
    default: undefined
  },
  clickable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['select'])

const handleClick = (key) => {
  if (!props.clickable) {
    return
  }
  emit('select', key)
}
</script>

<style scoped>
.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.metric-card {
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: #252525;
  text-align: left;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.metric-card.clickable {
  cursor: pointer;
}

.metric-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(64, 158, 255, 0.18);
}

.metric-card.active {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(64, 158, 255, 0.18);
  outline: 1px solid rgba(64, 158, 255, 0.65);
}

.metric-card__content {
  padding: 20px 16px;
  text-align: center;
}

.metric-card__value {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.metric-card__label {
  font-size: 14px;
  color: #999;
}

.metric-card.default {
  border-left: 3px solid #409eff;
}

.metric-card.pending {
  border-left: 3px solid #e6a23c;
}

.metric-card.approved {
  border-left: 3px solid #409eff;
}

.metric-card.signed {
  border-left: 3px solid #67c23a;
}

.metric-card.paid {
  border-left: 3px solid #67c23a;
}

.metric-card.total {
  border-left: 3px solid #409eff;
}

.metric-card.active-card {
  border-left: 3px solid #67c23a;
}

.metric-card.rejected {
  border-left: 3px solid #f56c6c;
}

.metric-card.rookie {
  border-left: 3px solid #909399;
}

.metric-card.special {
  border-left: 3px solid #e6a23c;
}

.metric-card.partner {
  border-left: 3px solid #f56c6c;
}

.metric-card.scheduled {
  border-left: 3px solid #9b59b6;
}

@media (max-width: 767px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-card__content {
    min-height: 112px;
    padding: 16px 12px;
  }

  .metric-card__value {
    font-size: 30px;
  }

  .metric-card__label {
    font-size: 13px;
  }
}
</style>
