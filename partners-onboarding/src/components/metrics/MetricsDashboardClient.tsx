'use client';

import { useState } from 'react';
import { BarChart3, BookOpen, Users, Clock, FileText } from 'lucide-react';
import type { MetricsData } from '@/lib/metrics';
import { OverviewTab } from './OverviewTab';
import { TrailsTab } from './TrailsTab';
import { UsersTab } from './UsersTab';
import { DeadlinesTab } from './DeadlinesTab';
import { ContentTab } from './ContentTab';

interface MetricsDashboardClientProps {
  data: MetricsData;
}

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { id: 'trails', label: 'Trilhas', icon: BookOpen },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'deadlines', label: 'Prazos', icon: Clock },
  { id: 'content', label: 'Conteúdo', icon: FileText },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function MetricsDashboardClient({ data }: MetricsDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-[#EDE9E3] dark:bg-[#262626] rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${
                  isActive
                    ? 'bg-white dark:bg-[#3D3D3D] text-[#1B4D3E] dark:text-[#6EE7B7] shadow-sm'
                    : 'text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          statusDistribution={data.statusDistribution}
          areaComparison={data.areaComparison}
          timeline={data.timeline}
          isAdmin={data.isAdmin}
        />
      )}
      {activeTab === 'trails' && (
        <TrailsTab trails={data.trailAnalytics} />
      )}
      {activeTab === 'users' && (
        <UsersTab users={data.userRanking} />
      )}
      {activeTab === 'deadlines' && (
        <DeadlinesTab deadlines={data.deadlines} />
      )}
      {activeTab === 'content' && (
        <ContentTab data={data.contentAnalytics} />
      )}
    </div>
  );
}
