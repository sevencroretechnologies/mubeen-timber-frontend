import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { estimationsApi } from "@/services/api";
import api from "@/services/api";
import {
  showAlert,
  showConfirmDialog,
  getErrorMessage,
} from "@/lib/sweetalert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DataTable, { TableColumn } from "react-data-table-component";
import {
  Search,
  FileSignature,
  Eye,
  CheckCircle,
  XCircle,
  Package,
  Edit3,
  Ban,
  Check,
  Filter,
} from "lucide-react";
import CollectMaterialModal from "./CollectMaterialModal";

// Status badge component with icons
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<
    string,
    { bg: string; text: string; label: string; icon: React.ReactNode }
  > = {
    draft: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: "Draft",
      icon: <Edit3 className="h-3 w-3" />,
    },
    approved: {
      bg: "bg-green-100",
      text: "text-green-700",
      label: "Approved",
      icon: <Check className="h-3 w-3" />,
    },
    partially_collected: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      label: "Partial",
      icon: <Package className="h-3 w-3" />,
    },
    collected: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      label: "Collected",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    cancelled: {
      bg: "bg-red-100",
      text: "text-red-700",
      label: "Cancelled",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const style = styles[status] || styles.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}
    >
      {style.icon}
      {style.label}
    </span>
  );
};

// Collection progress component
const CollectionProgress = ({
  collected,
  total,
}: {
  collected: number | string;
  total: number | string;
}) => {
  const collectedNum = parseFloat(String(collected || 0));
  const totalNum = parseFloat(String(total || 0));

  if (!totalNum || totalNum === 0)
    return <span className="text-gray-400">-</span>;

  const percentage = Math.min(100, (collectedNum / totalNum) * 100);
  const remaining = Math.max(0, totalNum - collectedNum);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-gray-700">
          {collectedNum.toFixed(2)} / {totalNum.toFixed(2)} CFT
        </span>
        {remaining > 0 && (
          <span className="text-amber-600 font-medium">
            ({remaining.toFixed(2)} left)
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor:
              percentage >= 100
                ? "#22c55e"
                : percentage >= 50
                  ? "#eab308"
                  : "#3b82f6",
          }}
        />
      </div>
      <div className="text-right text-xs text-gray-500">
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
};

// Action button component
const ActionButton = ({
  onClick,
  variant = "edit",
  children,
  disabled = false,
  title,
}: {
  onClick: () => void;
  variant?: "approve" | "reject" | "collect" | "edit" | "view" | "cancel";
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) => {
  const styles = {
    approve:
      "bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-medium rounded-md",
    reject:
      "bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-xs font-medium rounded-md",
    collect:
      "bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-medium rounded-md",
    edit: "bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-xs font-medium rounded-md",
    view: "bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 text-xs font-medium rounded-md",
    cancel:
      "bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 text-xs font-medium rounded-md",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${styles[variant]} transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
};

// Actions cell component
const ActionsCell = ({
  row,
  onApprove,
  onEdit,
  onDelete,
  onCollect,
  onMarkComplete,
  onCancel,
  onView,
}: {
  row: any;
  onApprove: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onCollect: (estimation: any) => void;
  onMarkComplete: (id: number) => void;
  onCancel: (id: number) => void;
  onView: (id: number) => void;
}) => {
  const status = row.status;

  if (status === "draft") {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <ActionButton
          variant="approve"
          onClick={() => onApprove(row.id)}
          title="Approve estimation"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
        </ActionButton>
        <ActionButton
          variant="edit"
          onClick={() => onEdit(row.id)}
          title="Edit estimation"
        >
          <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
        </ActionButton>
        <ActionButton
          variant="reject"
          onClick={() => onDelete(row.id)}
          title="Delete estimation"
        >
          <XCircle className="h-3.5 w-3.5 mr-1" /> Delete
        </ActionButton>
      </div>
    );
  }

  if (status === "approved" || status === "partially_collected") {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <ActionButton
          variant="collect"
          onClick={() => onCollect(row)}
          title="Collect material"
        >
          <Package className="h-3.5 w-3.5 mr-1" /> Collect Material
        </ActionButton>
        {status === "partially_collected" && (
          <ActionButton
            variant="approve"
            onClick={() => onMarkComplete(row.id)}
            title="Mark as complete"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
          </ActionButton>
        )}
        <ActionButton
          variant="cancel"
          onClick={() => onCancel(row.id)}
          title="Cancel estimation"
        >
          <Ban className="h-3.5 w-3.5 mr-1" /> Cancel
        </ActionButton>
      </div>
    );
  }

  // For collected or cancelled - only view
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <ActionButton
        variant="view"
        onClick={() => onView(row.id)}
        title="View details"
      >
        <Eye className="h-3.5 w-3.5 mr-1" /> View
      </ActionButton>
    </div>
  );
};

export default function EstimationsList() {
  const navigate = useNavigate();
  const [estimations, setEstimations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [perPage, setPerPage] = useState(25);
  const [collectModal, setCollectModal] = useState<{
    open: boolean;
    estimation: any;
  }>({
    open: false,
    estimation: null,
  });

  const fetchEstimations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await estimationsApi.list();
      const data = response?.data?.data || response?.data || response;
      setEstimations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch estimations:", error);
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to load estimations"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstimations();
  }, [fetchEstimations]);

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      "Delete Estimation",
      "Are you sure you want to delete this estimation? This action cannot be undone.",
    );
    if (!result.isConfirmed) return;
    try {
      await estimationsApi.delete(id);
      showAlert("success", "Deleted!", "Estimation deleted successfully", 2000);
      fetchEstimations();
    } catch (error) {
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to delete estimation"),
      );
    }
  };

  const handleApprove = async (id: number) => {
    const result = await showConfirmDialog(
      "Approve Estimation",
      "Do you want to approve this estimation? Material collection can only begin after approval.",
    );
    if (!result.isConfirmed) return;

    try {
      await api.post(`/estimations/${id}/approve`);
      showAlert(
        "success",
        "Approved!",
        "Estimation approved successfully. You can now collect materials.",
        2000,
      );
      fetchEstimations();
    } catch (error) {
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to approve estimation"),
      );
    }
  };

  const handleCancel = async (id: number) => {
    const result = await showConfirmDialog(
      "Cancel Estimation",
      "Are you sure you want to cancel this estimation? No further actions can be performed on cancelled estimations.",
    );
    if (!result.isConfirmed) return;

    try {
      await api.post(`/estimations/${id}/cancel`);
      showAlert(
        "success",
        "Cancelled!",
        "Estimation cancelled successfully",
        2000,
      );
      fetchEstimations();
    } catch (error) {
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to cancel estimation"),
      );
    }
  };

  const handleMarkComplete = async (id: number) => {
    const result = await showConfirmDialog(
      "Mark as Complete",
      "Has all material been collected for this estimation? This will mark it as fully collected.",
    );
    if (!result.isConfirmed) return;

    try {
      await api.post(`/estimations/${id}/mark-complete`);
      showAlert(
        "success",
        "Completed!",
        "Estimation marked as collected successfully",
        2000,
      );
      fetchEstimations();
    } catch (error) {
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to mark as complete"),
      );
    }
  };

  const openCollectModal = (estimation: any) => {
    setCollectModal({ open: true, estimation });
  };

  const closeCollectModal = () => {
    setCollectModal({ open: false, estimation: null });
  };

  const handleCollected = () => {
    closeCollectModal();
    fetchEstimations();
  };

  const handleEdit = (id: number) => {
    navigate(`/crm/estimations/${id}/edit`);
  };

  const handleView = (id: number) => {
    navigate(`/crm/estimations/${id}`);
  };

  const getEstimationTypeLabel = (type: number) => {
    const types = {
      1: "Inches",
      2: "Feet",
      3: "Thk (In)",
      4: "Thk (Ft)",
      5: "Direct Entry",
    };
    return types[type as keyof typeof types] || "Unknown";
  };

  // Filter estimations by search and status
  const filteredData = estimations.filter((est: any) => {
    const matchesSearch =
      (est.customer?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (est.product?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (est.project?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || est.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns: TableColumn<any>[] = [
    {
      name: "#",
      cell: (_row, index) => index + 1,
      width: "50px",
      center: true,
    },
    {
      name: "Customer",
      selector: (row) => row.customer?.name || "Unknown",
      sortable: true,
      minWidth: "140px",
    },
    {
      name: "Project",
      selector: (row) => row.project?.name || "-",
      sortable: true,
      minWidth: "120px",
    },
    {
      name: "Product",
      selector: (row) => row.product?.name || "Unknown",
      sortable: true,
      minWidth: "120px",
    },
    {
      name: "Type",
      selector: (row) => getEstimationTypeLabel(row.estimation_type),
      sortable: true,
      width: "90px",
      center: true,
    },
    {
      name: "CFT",
      selector: (row) => `${Number(row.cft || 0).toFixed(2)} CFT`,
      sortable: true,
      width: "90px",
      right: true,
    },
    {
      name: "Amount (₹)",
      selector: (row) =>
        row.total_amount
          ? `₹${Number(row.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "-",
      sortable: true,
      width: "120px",
      right: true,
    },
    {
      name: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortable: true,
      width: "120px",
      center: true,
    },
    // {
    //     name: 'Collection Progress',
    //     cell: row => (
    //         <CollectionProgress
    //             collected={row.total_collected_cft || 0}
    //             total={row.cft || 0}
    //         />
    //     ),
    //     width: '180px',
    // },
    {
      name: "Actions",
      cell: (row) => (
        <ActionsCell
          row={row}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCollect={openCollectModal}
          onMarkComplete={handleMarkComplete}
          onCancel={handleCancel}
          onView={handleView}
        />
      ),
      width: "280px",
      right: true,
    },
  ];

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: "#f9fafb",
        borderBottomWidth: "1px",
        borderBottomColor: "#e5e7eb",
        borderBottomStyle: "solid" as const,
        minHeight: "56px",
      },
    },
    headCells: {
      style: {
        fontSize: "12px",
        fontWeight: "600",
        color: "#6b7280",
        paddingLeft: "12px",
        paddingRight: "12px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em" as const,
      },
    },
    cells: {
      style: {
        paddingLeft: "12px",
        paddingRight: "12px",
        fontSize: "14px",
        borderBottom: "1px solid #f3f4f6",
      },
    },
    rows: {
      style: {
        "&:hover": {
          backgroundColor: "#f9fafb",
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">
            Estimations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track project estimations
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, project, or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="partially_collected">Partially Collected</option>
                <option value="collected">Collected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                <span className="text-gray-600">
                  Draft:{" "}
                  {estimations.filter((e) => e.status === "draft").length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-gray-600">
                  Approved:{" "}
                  {estimations.filter((e) => e.status === "approved").length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-gray-600">
                  Partial:{" "}
                  {
                    estimations.filter(
                      (e) => e.status === "partially_collected",
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredData}
            progressPending={isLoading}
            pagination
            paginationPerPage={perPage}
            paginationRowsPerPageOptions={[10, 25, 50, 100]}
            onChangeRowsPerPage={(newPerPage) => setPerPage(newPerPage)}
            customStyles={customStyles}
            highlightOnHover
            responsive
            noDataComponent={
              <div className="text-center py-16 text-muted-foreground">
                <FileSignature className="mx-auto h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">No estimations found</p>
                <p className="text-sm mt-1">
                  Create your first estimation to get started
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Collect Material Modal */}
      {collectModal.open && collectModal.estimation && (
        <CollectMaterialModal
          estimation={collectModal.estimation}
          onClose={closeCollectModal}
          onCollected={handleCollected}
        />
      )}
    </div>
  );
}
