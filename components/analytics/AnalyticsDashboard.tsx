'use client'

import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import CountUp from 'react-countup'
import { Activity, Users, Zap, Wallet } from 'lucide-react'

// --- Mock Data ---
const volumeData = [
  { name: 'Mon', volume: 120 },
  { name: 'Tue', volume: 240 },
  { name: 'Wed', volume: 180 },
  { name: 'Thu', volume: 420 },
  { name: 'Fri', volume: 380 },
  { name: 'Sat', volume: 600 },
  { name: 'Sun', volume: 850 },
]

const categoryData = [
  { name: 'DeFi', tips: 450, color: '#00E5FF' },
  { name: 'NFTs', tips: 320, color: '#6D5DF6' },
  { name: 'Gaming', tips: 280, color: '#10b981' },
  { name: 'Content', tips: 190, color: '#f59e0b' },
]

export default function AnalyticsDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Tip Volume',
            value: 12543,
            prefix: '',
            suffix: ' INJ',
            icon: Activity,
            color: 'text-[#00E5FF]',
            bg: 'bg-[#00E5FF]/10',
          },
          {
            title: 'Active Creators',
            value: 48,
            prefix: '',
            suffix: '',
            icon: Users,
            color: 'text-[#6D5DF6]',
            bg: 'bg-[#6D5DF6]/10',
          },
          {
            title: 'Total Transactions',
            value: 3912,
            prefix: '',
            suffix: '',
            icon: Zap,
            color: 'text-[#10b981]',
            bg: 'bg-[#10b981]/10',
          },
          {
            title: 'Unique Supporters',
            value: 1842,
            prefix: '',
            suffix: '',
            icon: Wallet,
            color: 'text-[#f59e0b]',
            bg: 'bg-[#f59e0b]/10',
          },
        ].map((metric, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-elevated)] p-6 transition-all hover:border-[#00E5FF]/30 hover:shadow-[0_0_30px_rgba(0,229,255,0.05)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--color-content-muted)]">
                {metric.title}
              </p>
              <div className={`rounded-xl p-2.5 ${metric.bg}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--color-content-primary)] tracking-tight">
                {metric.prefix}
                <CountUp
                  end={metric.value}
                  duration={2.5}
                  separator=","
                  useEasing={true}
                />
                {metric.suffix}
              </span>
            </div>
            {/* Subtle bottom glow */}
            <div className="absolute -bottom-[20px] left-[10%] h-[40px] w-[80%] rounded-full bg-gradient-to-r from-transparent via-[#00E5FF]/10 to-transparent opacity-0 blur-xl transition-opacity group-hover:opacity-100"></div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Volume Area Chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 overflow-hidden rounded-2xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-elevated)] p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-content-primary)]">7-Day Tip Volume</h2>
            <div className="rounded-full bg-[#10192A] px-3 py-1 text-xs font-medium text-[#00E5FF] border border-[#00E5FF]/20">
              INJ Network
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={volumeData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-line-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-content-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="var(--color-content-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030A0E',
                    borderColor: 'rgba(0, 229, 255, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                  itemStyle={{ color: '#00E5FF', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--color-content-secondary)' }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#00E5FF"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Categories Bar Chart */}
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-2xl border border-[var(--color-line-subtle)] bg-[var(--color-surface-elevated)] p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-content-primary)]">Top Categories</h2>
            <p className="text-xs text-[var(--color-content-muted)] mt-1">
              By total tips received
            </p>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-line-subtle)"
                  horizontal={false}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--color-content-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{
                    backgroundColor: '#030A0E',
                    borderColor: 'var(--color-line-subtle)',
                    borderRadius: '12px',
                  }}
                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                  labelStyle={{ display: 'none' }}
                />
                <Bar dataKey="tips" radius={[0, 4, 4, 0]} barSize={24}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
