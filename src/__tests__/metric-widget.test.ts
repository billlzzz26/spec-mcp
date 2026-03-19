import { describe, it, expect } from 'vitest'
import { 
  getMetricWidgetData, 
  formatValue, 
  calculateTrend,
  METRIC_CONFIGS 
} from '@/lib/metric-widget'
import type { TimeRange, MetricType } from '@/lib/metric-widget'

describe('Metric Widget Service', () => {
  // ─── formatValue tests ────────────────────────────────────────────────
  describe('formatValue', () => {
    it('ควร format percentage ถูกต้อง', () => {
      expect(formatValue(97.3, '%')).toContain('97')
      expect(formatValue(100, '%')).toContain('100')
    })

    it('ควร format latency (ms) ถูกต้อง', () => {
      const result = formatValue(342, 'ms')
      expect(result).toBeTruthy()
      expect(result).toMatch(/\d+/)
    })

    it('ควร format large numbers ด้วย K/M suffix', () => {
      expect(formatValue(1_500_000, 'tokens')).toContain('M')
      expect(formatValue(5_000, 'calls')).toContain('K')
    })
  })

  // ─── calculateTrend tests ──────────────────────────────────────────────
  describe('calculateTrend', () => {
    it('ควร return neutral สำหรับ changePercent เล็กน้อย', () => {
      expect(calculateTrend(0.1)).toBe('neutral')
      expect(calculateTrend(-0.3)).toBe('neutral')
    })

    it('ควร return up สำหรับ positive percent', () => {
      expect(calculateTrend(5)).toBe('up')
      expect(calculateTrend(50)).toBe('up')
    })

    it('ควร return down สำหรับ negative percent', () => {
      expect(calculateTrend(-5)).toBe('down')
      expect(calculateTrend(-50)).toBe('down')
    })
  })

  // ─── getMetricWidgetData tests ────────────────────────────────────────
  describe('getMetricWidgetData', () => {
    const metricTypes: MetricType[] = ['invocations', 'success_rate', 'avg_latency', 'token_usage', 'error_rate']
    const timeRanges: TimeRange[] = ['1h', '24h', '7d', '30d', '90d']

    it.each(metricTypes)('ควร return valid data สำหรับ %s', (type) => {
      const data = getMetricWidgetData(type, '24h')
      
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('description')
      expect(data).toHaveProperty('currentValue')
      expect(data).toHaveProperty('currentValueRaw')
      expect(data).toHaveProperty('unit')
      expect(data).toHaveProperty('trend')
      expect(data).toHaveProperty('changePercent')
      expect(data).toHaveProperty('chartData')
      expect(data).toHaveProperty('comparisons')
      expect(data).toHaveProperty('timeRange')
      expect(data).toHaveProperty('lastUpdatedAt')
    })

    it.each(timeRanges)('ควร return consistent data สำหรับ timeRange %s', (range) => {
      const data1 = getMetricWidgetData('invocations', range)
      const data2 = getMetricWidgetData('invocations', range)
      
      // seeded random ต้อง return ค่าเดียวกัน
      expect(data1.currentValueRaw).toBe(data2.currentValueRaw)
      expect(data1.changePercent).toBe(data2.changePercent)
    })

    it('ควร return chartData ตามจำนวนที่ถูกต้องตาม timeRange', () => {
      const ranges: Record<TimeRange, number> = {
        '1h': 20, '24h': 24, '7d': 7, '30d': 30, '90d': 30
      }

      Object.entries(ranges).forEach(([range, expectedCount]) => {
        const data = getMetricWidgetData('invocations', range as TimeRange)
        expect(data.chartData).toHaveLength(expectedCount)
      })
    })

    it('ควร return comparisons อย่างน้อย 1 รายการ', () => {
      const data = getMetricWidgetData('success_rate', '24h')
      expect(data.comparisons.length).toBeGreaterThan(0)
      
      data.comparisons.forEach(comp => {
        expect(comp).toHaveProperty('currentLabel')
        expect(comp).toHaveProperty('currentValue')
        expect(comp).toHaveProperty('previousLabel')
        expect(comp).toHaveProperty('previousValue')
        expect(comp).toHaveProperty('changePercent')
      })
    })
  })

  // ─── METRIC_CONFIGS tests ──────────────────────────────────────────────
  describe('METRIC_CONFIGS', () => {
    it.each(metricTypes)('ควร มี config สำหรับ %s', (type) => {
      expect(METRIC_CONFIGS[type]).toBeDefined()
      
      const config = METRIC_CONFIGS[type]
      expect(config.type).toBe(type)
      expect(config.title).toBeTruthy()
      expect(config.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(config.compareColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(['up', 'down']).toContain(config.positiveDirection)
    })
  })
})
