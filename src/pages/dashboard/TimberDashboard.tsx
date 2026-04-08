import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Warehouse,
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  ShoppingCart,
  FileText,
  Activity,
  TreesIcon,
  Briefcase,
  Users,
} from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, BarChart, Bar
} from 'recharts';
import { dashboardService } from '../../services/api';

const COLORS = ['#556ee6', '#34c38f', '#f46a6a', '#f1b44c', '#50a5f1', '#6c757d', '#fd7e14', '#20c997'];

interface TimberDashboardData {
  kpi: {
    total_stock_cft: number;
    stock_value: number;
    wood_types_count: number;
    warehouses_count: number;
    pending_pos: number;
    pending_pos_value: number;
    low_stock_items: number;
    pending_requisitions: number;
    material_issued_this_month: number;
    projects_count: number;
    customers_count: number;
  };
  stock_by_warehouse: Array<{
    warehouse_id: number;
    warehouse_name: string;
    total_cft: number;
    wood_types_count: number;
    value: number;
  }>;
  stock_by_wood_type: Array<{
    wood_type_id: number;
    wood_type_name: string;
    wood_type_code: string | null;
    total_current_quantity: number;
    total_available_quantity: number;
    total_reserved_quantity: number;
    warehouses: Array<{
      warehouse_id: number;
      warehouse_name: string;
      available_quantity: number;
      average_cost: number;
      value: number;
    }>;
    total_value: number;
  }>;
  low_stock_items: Array<{
    id: number;
    wood_type: { id: number; name: string; code: string | null };
    warehouse: { id: number; name: string };
    available_quantity: number;
    minimum_threshold: number;
    maximum_threshold: number;
    average_cost: number;
    reorder_quantity: number;
  }>;
  stock_movements: Array<{
    id: number;
    date: string;
    wood_type: string;
    warehouse: string;
    movement_type: string;
    quantity: number;
    balance_after: number;
    reference_type: string | null;
    notes: string | null;
  }>;
  pending_requisitions: Array<{
    id: number;
    requisition_number: string;
    warehouse: string;
    required_by: string;
    items_count: number;
    created_at: string;
  }>;
  recent_purchase_orders: Array<{
    id: number;
    po_number: string;
    supplier: string;
    warehouse: string;
    total_amount: number;
    status: string;
    expected_date: string;
  }>;
  purchase_orders_summary: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
    pending_value: number;
  };
  top_wood_types_by_value: Array<{
    wood_type_id: number;
    wood_type_name: string;
    total_cft: number;
    value: number;
  }>;
}

export default function TimberDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<TimberDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // SINGLE API CALL - Get all data at once
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await dashboardService.getTimberDashboard({
          stock_movements_days: 30,
          recent_pos_limit: 5,
        });
        setData(response.data.data);
      } catch (error) {
        console.error('Failed to load timber dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-lg m-4">
        Failed to load dashboard data
      </div>
    );
  }

  // KPI Cards Data
  const kpiCards = [
    {
      title: 'Total Stock (CFT)',
      value: data.kpi.total_stock_cft.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      subtitle: `${data.kpi.wood_types_count} Wood Types`,
      icon: Package,
      color: 'bg-blue-500',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Stock Value',
      value: `₹${(data.kpi.stock_value / 100000).toFixed(1)}L`,
      subtitle: `${data.kpi.warehouses_count} Warehouses`,
      icon: IndianRupee,
      color: 'bg-green-500',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Pending POs',
      value: data.kpi.pending_pos,
      subtitle: `₹${(data.kpi.pending_pos_value / 1000).toFixed(0)}K Value`,
      icon: ShoppingCart,
      color: 'bg-amber-500',
      onClick: () => navigate('/purchases/orders'),
      alert: data.kpi.pending_pos > 0,
    },
    {
      title: 'Low Stock Items',
      value: data.kpi.low_stock_items,
      subtitle: 'Need Attention',
      icon: AlertTriangle,
      color: 'bg-red-500',
      onClick: () => navigate('/inventory/alerts'),
      alert: data.kpi.low_stock_items > 0,
    },
    {
      title: 'Pending Requisitions',
      value: data.kpi.pending_requisitions,
      subtitle: 'Awaiting Approval',
      icon: FileText,
      color: 'bg-purple-500',
      onClick: () => navigate('/inventory/requisitions'),
      alert: data.kpi.pending_requisitions > 0,
    },
    {
      title: 'Issued This Month',
      value: `${data.kpi.material_issued_this_month.toFixed(0)} CFT`,
      subtitle: 'Material to Projects',
      icon: Activity,
      color: 'bg-teal-500',
      onClick: () => navigate('/inventory/movements'),
    },
    {
      title: 'Total Projects',
      value: data.kpi.projects_count,
      subtitle: 'All Projects',
      icon: Briefcase,
      color: 'bg-indigo-500',
      onClick: () => navigate('/crm/projects'),
    },
    {
      title: 'Total Customers',
      value: data.kpi.customers_count,
      subtitle: 'All Customers',
      icon: Users,
      color: 'bg-orange-500',
      onClick: () => navigate('/crm/customers'),
    },
  ];

  // Prepare chart data
  const warehouseChartData = data.stock_by_warehouse.map(item => ({
    name: item.warehouse_name,
    cft: item.total_cft,
    value: item.value,
  }));

  const woodTypePieData = data.top_wood_types_by_value.map(item => ({
    name: item.wood_type_name,
    value: item.value,
    cft: item.total_cft,
  }));

  // Movement type badge color
  const getMovementBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'purchase': return 'bg-green-100 text-green-700';
      case 'issue': return 'bg-blue-100 text-blue-700';
      case 'transfer': return 'bg-purple-100 text-purple-700';
      case 'adjustment': return 'bg-amber-100 text-amber-700';
      case 'return': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // PO status badge color
  const getPOStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TreesIcon className="h-6 w-6 text-amber-600" />
            Timber Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Inventory, Purchases & Requisitions Overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            onClick={kpi.onClick}
            className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border ${
              kpi.alert ? 'border-amber-300' : 'border-gray-100'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{kpi.subtitle}</p>
                </div>
                <div className={`p-3 rounded-full ${kpi.color} bg-opacity-10`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Warehouse - Bar Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-600" />
              Stock by Warehouse
            </h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={warehouseChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#74788d', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#74788d', fontSize: 11 }}
                  tickFormatter={(val) => `${val.toFixed(0)}`}
                />
                <Tooltip
                  cursor={{ fill: '#f8f9fa' }}
                  formatter={(value?: number, name?: string) => {
                    if (value === undefined) return ['', ''];
                    return [
                      name === 'cft' ? `${value.toFixed(2)} CFT` : `₹${(value / 1000).toFixed(1)}K`,
                      name === 'cft' ? 'Quantity' : 'Value'
                    ];
                  }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="cft" fill="#556ee6" radius={[4, 4, 0, 0]} name="Quantity (CFT)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Wood Types by Value - Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <TreesIcon className="h-5 w-5 text-green-600" />
              Top Wood Types by Value
            </h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={woodTypePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {woodTypePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value?: number) => value !== undefined ? `₹${(value / 1000).toFixed(1)}K` : ''}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Pending Requisitions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Low Stock Alerts
            </h3>
            <button
              onClick={() => navigate('/inventory/alerts')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Wood Type</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Available</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Min</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.low_stock_items.length > 0 ? data.low_stock_items.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{item.wood_type.name}</p>
                        <p className="text-xs text-gray-400">{item.warehouse.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-red-600">
                        {item.available_quantity.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {item.minimum_threshold.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-amber-600">
                      {item.reorder_quantity.toFixed(2)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No low stock items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Requisitions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Pending Requisitions
            </h3>
            <button
              onClick={() => navigate('/inventory/requisitions')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Req. #</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Items</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Required By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.pending_requisitions.length > 0 ? data.pending_requisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">
                      {req.requisition_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{req.warehouse}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      {req.items_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{req.required_by}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No pending requisitions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stock by Wood Type - Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-500" />
            Stock by Wood Type
          </h3>
          <button
            onClick={() => navigate('/inventory/wood-types')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            Manage Wood Types <ArrowRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Wood Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Current Qty</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Available</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Reserved</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Total Value</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Warehouses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.stock_by_wood_type.slice(0, 8).map((item) => (
                <tr key={item.wood_type_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-700">
                    {item.wood_type_name}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{item.wood_type_code || '-'}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">
                    {item.total_current_quantity.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-green-600">
                    {item.total_available_quantity.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-amber-600">
                    {item.total_reserved_quantity.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-700">
                    ₹{(item.total_value / 1000).toFixed(1)}K
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {item.warehouses.map(w => w.warehouse_name).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Purchase Orders & Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-500" />
              Recent Purchase Orders
            </h3>
            <button
              onClick={() => navigate('/purchases/orders')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">PO #</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Amount</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recent_purchase_orders.length > 0 ? data.recent_purchase_orders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/purchases/orders/${po.id}`)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{po.po_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{po.supplier}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      ₹{po.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPOStatusBadgeColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No purchase orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Movements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500" />
              Recent Stock Movements
            </h3>
            <button
              onClick={() => navigate('/inventory/movements')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Wood Type</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Qty</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.stock_movements.length > 0 ? data.stock_movements.slice(0, 10).map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(movement.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{movement.wood_type}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMovementBadgeColor(movement.movement_type)}`}>
                        {movement.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                      {movement.quantity.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-500">
                      {movement.balance_after.toFixed(2)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No stock movements found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
