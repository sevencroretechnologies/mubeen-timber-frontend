import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Target,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Warehouse,
  ShoppingCart,
  Hammer,
  BarChart3,
  TreesIcon
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { showAlert, showLogoutDialog } from "../lib/sweetalert";
import { authService } from "../services/api";

const API_BASE_URL = "http://127.0.0.1:8000";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  check?: (user: any) => boolean;
  children?: {
    name: string;
    href: string;
    permission?: string;
    check?: (user: any) => boolean;
  }[];
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard/timber",
    icon: LayoutDashboard,
  },
  {
    name: "CRM",
    href: "/crm",
    icon: Target,
    children: [
      { name: "Dashboard", href: "/crm/dashboard" },
      { name: "Leads", href: "/crm/leads" },
      // { name: "Customers", href: "/crm/customers" },
      { name: "Opportunities", href: "/crm/opportunities" },
      // { name: "Estimations", href: "/crm/estimations" },
      { name: "Campaigns", href: "/crm/campaigns" },
      { name: "Sources", href: "/crm/sources" },
      { name: "Territories", href: "/crm/territories" },
      { name: "Product List", href: "/crm/products" },
      { name: "Projects", href: "/crm/projects" },
      { name: "Prospects", href: "/crm/prospects" },
      { name: "Contacts", href: "/crm/contacts" },
      { name: "Opportunity Lost Reasons", href: "/crm/opportunity-lost-reasons" },
      { name: "Sales Task", href: "/crm/sales-tasks" },
    ],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Warehouse,
    children: [
      { name: "Stock Overview", href: "/inventory" },
      { name: "Stock Movements", href: "/inventory/movements" },
      { name: "Stock Adjustment", href: "/inventory/adjust" },
      { name: "Low Stock Alerts", href: "/inventory/alerts" },
      { name: "Wood Types", href: "/inventory/wood-types" },
      { name: "Requisitions", href: "/inventory/requisitions" },
      { name: "Warehouses", href: "/inventory/warehouses" },
    ],
  },
  {
    name: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    children: [
      { name: "Purchase Orders", href: "/purchases/orders" },
      { name: "Suppliers", href: "/purchases/suppliers" },
    ],
  },

  {
    name: "Timber",
    href: "/timber",
    icon: Hammer,
    children: [
      { name: "Dashboard", href: "/dashboard/timber" },
      { name: "Estimations", href: "/crm/estimations" },
       { name: "Customers", href: "/crm/customers" },
      { name: "Projects", href: "/crm/projects" },
    ],
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Shield,
    permission: "view_roles",
    children: [
      {
        name: "Users",
        href: "/admin/users/org",
        permission: "view_roles",
        check: (user: any) => user?.roles?.includes("admin"),
      },
      {
        name: "Users",
        href: "/admin/users/company",
        permission: "view_roles",
        check: (user: any) =>
          user?.roles?.includes("company") || user?.roles?.includes("org"),
      },
      { name: "Roles", href: "/admin/roles", permission: "view_roles" },
      {
        name: "Permissions",
        href: "/admin/permissions",
        permission: "view_roles",
      },
    ],
  },
];

function NavItemComponent({
  item,
  isCollapsed,
}: {
  item: NavItem;
  isCollapsed: boolean;
}) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isActive =
    location.pathname === item.href ||
    location.pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  if (item.children && !isCollapsed) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
            ? "bg-solarized-blue/10 text-solarized-blue"
            : "text-solarized-base01 hover:bg-solarized-base2 hover:text-solarized-base02"
            }`}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && (
          <div className="ml-8 space-y-1">
            {item.children.map((child) => (
              <Link
                key={child.href}
                to={child.href}
                className={`block px-3 py-2 text-sm rounded-lg transition-colors ${location.pathname === child.href
                  ? "bg-solarized-blue/10 text-solarized-blue"
                  : "text-solarized-base01 hover:bg-solarized-base2 hover:text-solarized-base02"
                  }`}
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
        ? "bg-solarized-blue/10 text-solarized-blue"
        : "text-solarized-base01 hover:bg-solarized-base2 hover:text-solarized-base02"
        }`}
      title={isCollapsed ? item.name : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span>{item.name}</span>}
    </Link>
  );
}

export default function AppLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Fetch user profile data to get profile image
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authService.getProfile();
        const profileImagePath =
          response.data.data?.user?.profile_image || response.data.data?.user?.staff_member?.profile_image;
        if (profileImagePath) {
          // Convert to full URL if it's a relative path
          const imageUrl = profileImagePath.startsWith("http")
            ? profileImagePath
            : `${API_BASE_URL}${profileImagePath}`;
          setProfileImage(imageUrl);
        }
      } catch (error) {
        console.error("Failed to fetch profile image:", error);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleLogout = async () => {
    // Show confirmation dialog
    const result = await showLogoutDialog();

    if (result.isConfirmed) {
      await logout();

      // Show success message
      showAlert(
        "success",
        "Logged Out",
        "You have been logged out successfully.",
        2000,
      );

      // Navigate after showing the alert
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-solarized-base3">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-white border-r border-solarized-base2 transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-solarized-base2">
            {!sidebarCollapsed && (
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-solarized-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TM</span>
                </div>
                <span className="font-semibold text-solarized-base02">
                  Timber CRM
                </span>
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-solarized-base2"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 rounded-lg hover:bg-solarized-base2"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation
              .filter((item) => {
                // Filter based on permission requirements
                if (item.permission && !hasPermission(item.permission)) {
                  return false;
                }
                if (item.check && !item.check(user)) {
                  return false;
                }
                return true;
              })
              .map((item) => {
                // Also filter children based on permissions
                const filteredItem = item.children
                  ? {
                    ...item,
                    children: item.children.filter((child) => {
                      if (
                        child.permission &&
                        !hasPermission(child.permission)
                      )
                        return false;
                      if (child.check && !child.check(user)) return false;
                      return true;
                    }),
                  }
                  : item;
                // Only show parent if it has visible children or no children
                if (
                  filteredItem.children &&
                  filteredItem.children.length === 0
                ) {
                  return null;
                }
                return (
                  <NavItemComponent
                    key={item.href}
                    item={filteredItem}
                    isCollapsed={sidebarCollapsed}
                  />
                );
              })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-solarized-base2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-solarized-red hover:bg-solarized-red/10 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-solarized-base2">
          <div className="flex items-center justify-between h-full px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-solarized-base2"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              {/* Notifications */}
              {/* <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-solarized-base01" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-solarized-red rounded-full" />
              </Button> */}

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    {profileImage ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-solarized-cyan">
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-solarized-cyan rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-solarized-base02">
                      {user?.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-solarized-base01" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-solarized-base01">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-solarized-red"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
