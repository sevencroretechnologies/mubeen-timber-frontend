import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';
import { Users, TrendingUp, ShoppingCart, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  total_customers?: number;
  total_leads?: number;
  total_opportunities?: number;
  total_campaigns?: number;
  sales_overview?: Record<string, unknown>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await dashboardService.getStats();
        setStats(response.data?.data || response.data || {});
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border-0 shadow-md rounded-lg p-6">
              <div className="h-4 w-24 bg-solarized-base2/50 rounded mb-2 animate-pulse"></div>
              <div className="h-8 w-16 bg-solarized-base2/50 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Customers',
      value: stats.total_customers ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Leads',
      value: stats.total_leads ?? 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Opportunities',
      value: stats.total_opportunities ?? 0,
      icon: ShoppingCart,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Campaigns',
      value: stats.total_campaigns ?? 0,
      icon: AlertTriangle,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">CRM & Timber Management Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="border-0 shadow-md rounded-lg p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
