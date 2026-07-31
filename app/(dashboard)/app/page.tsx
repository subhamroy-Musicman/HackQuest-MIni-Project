'use client'

import { useState } from 'react'
import { useData } from '@/contexts/DataContext'
import { motion } from 'framer-motion'
import { Search, Filter, Plus, TrendingUp, Users, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { AddCreatorModal } from '@/components/creators/AddCreatorModal'

export default function DashboardPage() {
  const { creators, analytics } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddCreatorOpen, setIsAddCreatorOpen] = useState(false)

  const filteredCreators = creators.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Discover Creators</h1>
            <p className="text-slate-500 mt-1">Support your favorite builders directly on-chain.</p>
          </div>
          <button 
            onClick={() => setIsAddCreatorOpen(true)}
            className="gradient-btn h-11 px-5 text-sm font-semibold flex items-center gap-2 w-fit"
          >
            <Plus className="h-4 w-4" />
            Register Creator
          </button>
        </div>

        {/* Analytics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <TrendingUp className="h-4 w-4 text-[#00C8FF]" />
              <span className="text-sm font-semibold uppercase tracking-wider">Total Volume</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{analytics.totalDonations.toLocaleString()} <span className="text-sm text-slate-400">INJ</span></span>
          </div>
          <div className="glass-card p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Users className="h-4 w-4 text-[#7C5CFF]" />
              <span className="text-sm font-semibold uppercase tracking-wider">Active Creators</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{analytics.totalCreators}</span>
          </div>
          <div className="glass-card p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold uppercase tracking-wider">Total Txs</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{analytics.totalTransactions}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search creators or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-[#00C8FF] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2 hover:border-slate-300 transition-colors">
            <Filter className="h-4 w-4" />
            Category
          </button>
          <button className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2 hover:border-slate-300 transition-colors">
            Sort by: Newest
          </button>
        </div>
      </div>

      {/* Creator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCreators.map((creator, i) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#00C8FF]/30 transition-all duration-300"
          >
            {/* Banner (placeholder gradient) */}
            <div className={`h-24 w-full bg-gradient-to-r ${i % 2 === 0 ? 'from-[#00C8FF]/20 to-[#7C5CFF]/20' : 'from-rose-500/20 to-orange-400/20'}`} />
            
            <div className="px-5 pb-5 relative">
              {/* Avatar */}
              <div className="absolute -top-10 left-5 h-20 w-20 rounded-2xl bg-white p-1.5 shadow-sm">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#00C8FF] to-[#7C5CFF] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{creator.avatar || creator.name.charAt(0)}</span>
                </div>
              </div>

              {/* Verified Badge placeholder */}
              {creator.verified && (
                <div className="absolute top-3 right-5">
                  <div className="bg-[#00C8FF]/10 text-[#00C8FF] text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    Verified
                  </div>
                </div>
              )}

              <div className="mt-12 flex flex-col gap-1">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{creator.name}</h3>
                <span className="text-sm text-slate-500">{creator.username}</span>
              </div>

              <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                {creator.bio}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Raised</span>
                  <span className="text-sm font-bold text-slate-900">{creator.totalRaised.toLocaleString()} INJ</span>
                </div>
                
                <Link 
                  href={`/app/creator/${creator.id}`}
                  className="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium flex items-center hover:bg-[#00C8FF] transition-colors"
                >
                  Tip
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredCreators.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Search className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No creators found</h3>
          <p className="text-slate-500">Try adjusting your search or filters.</p>
        </div>
      )}

      <AddCreatorModal 
        isOpen={isAddCreatorOpen}
        onClose={() => setIsAddCreatorOpen(false)}
      />
    </div>
  )
}
