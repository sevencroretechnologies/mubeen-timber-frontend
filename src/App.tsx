import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import { Toaster } from "./components/ui/toaster";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";
import TimberDashboard from "./pages/dashboard/TimberDashboard";

// Profile
import Profile from "./pages/profile/Profile";

// Organization
import OrganizationList from "./pages/organization/OrganizationList";
import OrganizationCreate from "./pages/organization/OrganizationCreate";
import OrganizationEdit from "./pages/organization/OrganizationEdit";
import CompanyList from "./pages/company/CompanyList";
import CompanyEdit from "./pages/company/CompanyEdit";
import CompanyCreate from "./pages/company/CompanyCreate";

// Admin
import Users from "./pages/admin/Users";
import UsersByOrg from "./pages/admin/UsersByOrg";
import UsersByCompany from "./pages/admin/UsersByCompany";
import Roles from "./pages/admin/Roles";
import RolePermissions from "./pages/admin/RolePermissions";
import Permissions from "./pages/admin/Permissions";

// CRM Module
import CrmDashboard from "@/modules/crm/dashboard/CrmDashboard";
import LeadsList from "@/modules/crm/leads/LeadsList";
import LeadForm from "@/modules/crm/leads/LeadForm";
import OpportunitiesList from "@/modules/crm/opportunities/OpportunitiesList";
import OpportunityForm from "@/modules/crm/opportunities/OpportunityForm";
import OpportunityLostReasonList from "@/modules/crm/opportunities/OpportunityLostReasonList";
import CampaignsList from "@/modules/crm/campaigns/CampaignsList";
import AppointmentsList from "@/modules/crm/appointments/AppointmentsList";
import ProspectsList from "@/modules/crm/prospects/ProspectsList";
import ProspectForm from "@/modules/crm/prospects/prospectForm";
import ContractsList from "@/modules/crm/contracts/ContractsList";
import SalesStagesList from "@/modules/crm/sales-stages/SalesStagesList";
import SalesTaskList from "@/modules/crm/sales-tasks/SalesTaskList";
import SalesTaskDetail from "@/modules/crm/sales-tasks/SalesTaskDetail";
import SalesTaskDetailList from "@/modules/crm/sales-tasks/SalesTaskDetailList";
import SourceList from "@/modules/crm/sources/SourceList";
import TerritoryList from "@/modules/crm/territories/TerritoryList";
import ProductList from "@/modules/crm/products/ProductList";
import ProductCategoryList from "@/modules/crm/products/ProductCategoryList";
import CustomerList from "@/modules/crm/customers/customerList";
import CustomerForm from "@/modules/crm/customers/customerForm";
import ContactForm from "@/modules/crm/contacts/contactForm";
import ContactList from "@/modules/crm/contacts/contactList";
import CustomerProjects from "@/modules/crm/customers/CustomerProjects";
import ProjectsList from "@/modules/crm/projects/ProjectsList";
import CrmSettings from "@/modules/crm/settings/CrmSettings";

// Estimations
import EstimationsList from "@/modules/crm/estimations/EstimationsList";
import EstimationView from "@/modules/crm/estimations/EstimationView";
import CreateEstimation from "@/modules/crm/estimations/CreateEstimation";
import EditEstimation from "@/modules/crm/estimations/EditEstimation";

// Timber Inventory & Purchases
import StockOverview from "@/modules/timber/inventory/StockOverview";
import StockMovements from "@/modules/timber/inventory/StockMovements";
import StockAdjustmentForm from "@/modules/timber/inventory/StockAdjustmentForm";
import LowStockAlerts from "@/modules/timber/inventory/LowStockAlerts";
import WoodTypesList from "@/modules/timber/inventory/WoodTypesList";
import MaterialRequisitionList from "@/modules/timber/inventory/MaterialRequisitionList";
import MaterialRequisitionForm from "@/modules/timber/inventory/MaterialRequisitionForm";
import WarehouseList from "@/modules/timber/purchases/orders/WarehouseList";
import SupplierList from "@/modules/timber/purchases/suppliers/SupplierList";
import SupplierForm from "@/modules/timber/purchases/suppliers/SupplierForm";
import PurchaseOrderList from "@/modules/timber/purchases/orders/PurchaseOrderList";
import PurchaseOrderForm from "@/modules/timber/purchases/orders/PurchaseOrderForm";
import PurchaseOrderView from "@/modules/timber/purchases/orders/PurchaseOrderView";
import ReceivedOrderView from "./modules/timber/purchases/orders/ReceivedOrderView";
import PurchaseOrderReceivedList from "./modules/timber/purchases/orders/PurchaseOrderReceivedList";
import ReceiveGoodsForm from "@/modules/timber/purchases/orders/ReceiveGoodsForm";
import TaxRateList from "@/modules/timber/purchases/tax-rates/TaxRateList";

// Error Pages
import Unauthorized from "@/pages/Unauthorized";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster />
        <Routes>
          {/* Public Routes - Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route
              path="/"
              element={<Navigate to="/dashboard/timber" replace />}
            />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/timber" element={<TimberDashboard />} />

            {/* Profile */}
            <Route path="/profile" element={<Profile />} />

            {/* Organization */}
            <Route path="/organizations" element={<OrganizationList />} />
            <Route
              path="/organizations/create"
              element={<OrganizationCreate />}
            />
            <Route
              path="/organizations/:id/edit"
              element={<OrganizationEdit />}
            />
            <Route path="/companies" element={<CompanyList />} />
            <Route path="/companies/create" element={<CompanyCreate />} />
            <Route path="/companies/:id/edit" element={<CompanyEdit />} />

            {/* CRM */}
            <Route path="/crm" element={<CrmDashboard />} />
            <Route path="/crm/dashboard" element={<CrmDashboard />} />
            <Route path="/crm/estimations" element={<EstimationsList />} />
            <Route
              path="/crm/estimations/create/:project_id"
              element={<CreateEstimation />}
            />
            <Route path="/crm/estimations/:id" element={<EstimationView />} />
            <Route
              path="/crm/estimations/:id/edit"
              element={<EditEstimation />}
            />
            <Route path="/crm/leads" element={<LeadsList />} />
            <Route path="/crm/leads/create" element={<LeadForm />} />
            <Route path="/crm/leads/:id/edit" element={<LeadForm />} />
            <Route path="/crm/customers" element={<CustomerList />} />
            <Route path="/crm/customers/create" element={<CustomerForm />} />
            <Route path="/crm/customers/:id/edit" element={<CustomerForm />} />
            <Route
              path="/crm/customers/:id/projects"
              element={<CustomerProjects />}
            />
            <Route path="/crm/opportunities" element={<OpportunitiesList />} />
            <Route
              path="/crm/opportunities/create"
              element={<OpportunityForm />}
            />
            <Route
              path="/crm/opportunities/:id/edit"
              element={<OpportunityForm />}
            />
            <Route
              path="/crm/opportunity-lost-reasons"
              element={<OpportunityLostReasonList />}
            />
            <Route path="/crm/campaigns" element={<CampaignsList />} />
            <Route path="/crm/sources" element={<SourceList />} />
            <Route path="/crm/territories" element={<TerritoryList />} />
            <Route path="/crm/products" element={<ProductList />} />
            <Route
              path="/crm/product-categories"
              element={<ProductCategoryList />}
            />
            <Route path="/crm/projects" element={<ProjectsList />} />
            <Route path="/crm/appointments" element={<AppointmentsList />} />
            <Route path="/crm/prospects" element={<ProspectsList />} />
            <Route path="/crm/prospects/create" element={<ProspectForm />} />
            <Route path="/crm/prospects/:id/edit" element={<ProspectForm />} />
            <Route path="/crm/contacts" element={<ContactList />} />
            <Route path="/crm/contacts/create" element={<ContactForm />} />
            <Route path="/crm/contacts/:id/edit" element={<ContactForm />} />
            <Route path="/crm/sales-tasks" element={<SalesTaskList />} />
            <Route
              path="/crm/sales-task-details"
              element={<SalesTaskDetailList />}
            />
            <Route path="/crm/sales-tasks/:id" element={<SalesTaskDetail />} />
            <Route path="/crm/contracts" element={<ContractsList />} />
            <Route path="/crm/sales-stages" element={<SalesStagesList />} />
            <Route path="/crm/settings" element={<CrmSettings />} />

            {/* Timber Inventory */}
            <Route path="/inventory" element={<StockOverview />} />
            <Route path="/inventory/movements" element={<StockMovements />} />
            <Route path="/inventory/adjust" element={<StockAdjustmentForm />} />
            <Route path="/inventory/alerts" element={<LowStockAlerts />} />
            <Route path="/inventory/wood-types" element={<WoodTypesList />} />
            <Route
              path="/inventory/requisitions"
              element={<MaterialRequisitionList />}
            />
            <Route
              path="/inventory/requisitions/create"
              element={<MaterialRequisitionForm />}
            />
            <Route path="/inventory/warehouses" element={<WarehouseList />} />

            {/* Timber Purchases */}
            <Route path="/purchases/orders" element={<PurchaseOrderList />} />
            <Route
              path="/purchases/orders/received"
              element={<PurchaseOrderReceivedList />}
            />
            <Route
              path="/purchases/orders/create"
              element={<PurchaseOrderForm />}
            />
            <Route
              path="/purchases/orders/:id"
              element={<PurchaseOrderView />}
            />
            <Route
              path="/purchases/orders/:id/received"
              element={<ReceivedOrderView />}
            />
            <Route
              path="/purchases/orders/:id/edit"
              element={<PurchaseOrderForm />}
            />
            <Route
              path="/purchases/orders/:id/receive"
              element={<ReceiveGoodsForm />}
            />
            <Route path="/purchases/suppliers" element={<SupplierList />} />
            <Route
              path="/purchases/suppliers/create"
              element={<SupplierForm />}
            />
            <Route
              path="/purchases/suppliers/:id/edit"
              element={<SupplierForm />}
            />

            {/* Tax Rates */}
            <Route path="/purchases/tax-rates" element={<TaxRateList />} />

            {/* Admin */}
            <Route path="/admin" element={<Users />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/users/org" element={<UsersByOrg />} />
            <Route path="/admin/users/company" element={<UsersByCompany />} />
            <Route path="/admin/roles" element={<Roles />} />
            <Route
              path="/admin/roles/:id/permissions"
              element={<RolePermissions />}
            />
            <Route path="/admin/permissions" element={<Permissions />} />
          </Route>

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
