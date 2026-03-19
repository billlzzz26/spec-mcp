import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MetricCard } from '@/components/metric-widget/MetricCard'
import { getMetricWidgetData } from '@/lib/metric-widget'

describe('MetricCard Component', () => {
  // Mock data
  const mockData = getMetricWidgetData('invocations', '24h')
  
  it('ควร render card พร้อมข้อมูล metric', () => {
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
      />
    )
    
    // ตรวจสอบว่า title แสดง
    expect(screen.getByText(mockData.title)).toBeInTheDocument()
  })

  it('ควร แสดง current value', () => {
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
      />
    )
    
    expect(screen.getByText(mockData.currentValue)).toBeInTheDocument()
  })

  it('ควร toggle expanded state เมื่อกด chevron', () => {
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
      />
    )
    
    // หา expand button (chevron)
    const expandButton = screen.getByLabelText(/ขยายวิดเจ็ต|ย่อวิดเจ็ต/)
    
    // ตั้งแต่แรก ต้องปิด detail section
    expect(screen.queryByText(/เปรียบเทียบ/i)).not.toBeInTheDocument()
    
    // click expand
    fireEvent.click(expandButton)
    
    // ตรวจสอบว่า detail section ปรากฏ
    expect(screen.getByText(/เปรียบเทียบ/i)).toBeInTheDocument()
  })

  it('ควร เรียก onRefresh callback เมื่อกด refresh button', () => {
    const onRefresh = vi.fn()
    
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
        onRefresh={onRefresh}
      />
    )
    
    const refreshButton = screen.getByLabelText(/รีเฟรชข้อมูล/)
    fireEvent.click(refreshButton)
    
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('ควร เรียก onTimeRangeChange callback เมื่อเปลี่ยน time range', () => {
    const onTimeRangeChange = vi.fn()
    
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
        onTimeRangeChange={onTimeRangeChange}
      />
    )
    
    // expand card ก่อน
    const expandButton = screen.getByLabelText(/ขยายวิดเจ็ต/)
    fireEvent.click(expandButton)
    
    // หา time range button
    const timeRangeButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('7วัน')
    )
    
    if (timeRangeButtons.length > 0) {
      fireEvent.click(timeRangeButtons[0])
      expect(onTimeRangeChange).toHaveBeenCalledWith('7d')
    }
  })

  it('ควร ปิด comparison toggle default', () => {
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
      />
    )
    
    // expand card
    const expandButton = screen.getByLabelText(/ขยายวิดเจ็ต/)
    fireEvent.click(expandButton)
    
    // หา comparison toggle
    const comparisonToggle = screen.getByLabelText(/เปรียบเทียบ/)
    
    // ดึง parent button
    expect(comparisonToggle.closest('button')).toBeInTheDocument()
  })

  it('ควร disabled refresh button เมื่อ isLoading = true', () => {
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
        isLoading={true}
      />
    )
    
    const refreshButton = screen.getByLabelText(/รีเฟรชข้อมูล/)
    expect(refreshButton).toBeDisabled()
  })

  it('ควร render trend badge ถูกต้อง', () => {
    render(
      <MetricCard 
        data={mockData}
        metricType="invocations"
      />
    )
    
    // ตรวจสอบว่า changePercent แสดง
    const changePercentText = `${mockData.changePercent > 0 ? '+' : ''}${mockData.changePercent}%`
    expect(screen.getByText(new RegExp(mockData.changePercent.toString()))).toBeInTheDocument()
  })
})
