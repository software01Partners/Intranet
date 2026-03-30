import type { TrailType, ModuleType } from './types';

// ============================================
// Tipos do Dashboard de Métricas
// ============================================

export interface MetricsData {
  kpis: KPIData;
  statusDistribution: StatusDistributionItem[];
  areaComparison: AreaComparisonItem[];
  trailAnalytics: TrailAnalyticsItem[];
  userRanking: UserRankingItem[];
  timeline: TimelinePoint[];
  deadlines: DeadlineItem[];
  contentAnalytics: ContentAnalyticsData;
  isAdmin: boolean;
}

export interface KPIData {
  totalUsers: number;
  activeUsers: number;
  averageProgress: number;
  totalTrailsCompleted: number;
  certificatesIssued: number;
  overdueCount: number;
  quizBlockedCount: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface AreaComparisonItem {
  areaId: string;
  areaName: string;
  areaColor: string;
  memberCount: number;
  averageProgress: number;
  trailsCompleted: number;
  overdueCount: number;
}

export interface TrailAnalyticsItem {
  trailId: string;
  trailName: string;
  trailType: TrailType;
  totalEnrolled: number;
  completedCount: number;
  averageProgress: number;
  averageQuizScore: number | null;
  deadline: string | null;
  overdueCount: number;
}

export interface UserRankingItem {
  userId: string;
  userName: string;
  email: string;
  avatarUrl: string | null;
  areaName: string;
  overallProgress: number;
  trailsCompleted: number;
  totalTrails: number;
  lastActivity: string | null;
  status: 'em_dia' | 'regular' | 'atrasado';
}

export interface TimelinePoint {
  date: string;
  completions: number;
  certificates: number;
}

export interface DeadlineItem {
  trailId: string;
  trailName: string;
  trailType: TrailType;
  deadline: string;
  totalUsers: number;
  completedUsers: number;
  overdueUsers: string[];
}

export interface ContentAnalyticsData {
  moduleTypeBreakdown: { type: ModuleType; count: number; avgCompletion: number }[];
  quizPerformance: {
    trailName: string;
    moduleName: string;
    averageScore: number;
    attemptCount: number;
  }[];
  timeByType: { type: ModuleType; label: string; totalSeconds: number; avgSeconds: number }[];
  timeByUser: { userName: string; totalSeconds: number }[];
}

export interface QuizBlockedMetric {
  userId: string;
  userName: string;
  moduleId: string;
  moduleName: string;
  trailId: string;
  trailName: string;
  totalAttempts: number;
  lastScore: number;
  blockedUntil: string;
}
