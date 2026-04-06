import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { estimationsApi } from "@/services/api";
import api from "@/services/api";
import Swal from "sweetalert2";
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
  Pencil,
  Clock,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import CollectMaterialModal from "./CollectMaterialModal";

const statusStyles: Record<
  string,
  { bg: string; text: string; label: string; icon: React.ReactNode }
> = {
  draft: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: "Draft",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Approved",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Rejected",
    icon: <XCircle className="h-3 w-3" />,
  },
  pending_approval: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Pending Approval",
    icon: <Clock className="h-3 w-3" />,
  },
  collected: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    label: "Material Collected",
    icon: <Package className="h-3 w-3" />,
  },
  partially_collected: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Partial",
    icon: <Package className="h-3 w-3" />,
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const style = statusStyles[status] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: status ? status.replace(/_/g, " ") : "Unknown",
    icon: <Clock className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}
    >
      {style.icon}
      {style.label}
    </span>
  );
};

// Action button component
const ActionButton = ({
  onClick,
  variant = "view",
  children,
  disabled = false,
  title,
}: {
  onClick: () => void;
  variant?: "approve" | "reject" | "collect" | "edit" | "view" | "secondary";
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) => {
  const styles: Record<string, string> = {
    approve:
      "bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm",
    reject:
      "bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm",
    collect:
      "bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm",
    edit:
      "bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm",
    view:
      "bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 shadow-sm",
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
  const isRejected = status === "rejected" || status === "cancelled";
  const isApproved = status === "approved" || status === "partially_collected";

  if (status === "draft" || status === "pending_approval") {
    return (
      <div className="flex items-center justify-end gap-2">
        <ActionButton
          variant="approve"
          onClick={() => onApprove(row.id)}
          title="Approve estimation"
        >
          <CheckCircle className="h-4 w-4 mr-1" /> Approve
        </ActionButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
              aria-label="More actions"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[190px]">
            <DropdownMenuItem onSelect={() => onEdit(row.id)}>
              <Pencil className="h-4 w-4 text-blue-600" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(row.id)}>
              <XCircle className="h-4 w-4 text-red-600" />
              Reject
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onView(row.id)}>
              <Eye className="h-4 w-4 text-slate-600" />
              View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="flex items-center justify-end gap-2">
        <ActionButton
          variant="collect"
          onClick={() => onCollect(row)}
          title="Collect material"
        >
          <Package className="h-4 w-4 mr-1" /> Collect Material
        </ActionButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
              aria-label="More actions"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[190px]">
            <DropdownMenuItem onSelect={() => onView(row.id)}>
              <Eye className="h-4 w-4 text-slate-600" />
              View
            </DropdownMenuItem>
            {status === "partially_collected" && (
              <DropdownMenuItem onSelect={() => onMarkComplete(row.id)}>
                <CheckCircle className="h-4 w-4 text-green-600" />
                Mark as Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onCancel(row.id)}>
              <XCircle className="h-4 w-4 text-red-600" />
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="flex items-center justify-end gap-2">
        <ActionButton
          variant="view"
          onClick={() => onView(row.id)}
          title="View estimation"
        >
          <Eye className="h-4 w-4 mr-1" /> View
        </ActionButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
              aria-label="More actions"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[190px]">
            <DropdownMenuItem onSelect={() => onEdit(row.id)}>
              <Pencil className="h-4 w-4 text-blue-600" />
              Reconsider
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <ActionButton
        variant="view"
        onClick={() => onView(row.id)}
        title="View estimation"
      >
        <Eye className="h-4 w-4 mr-1" /> View
      </ActionButton>
    </div>
  );
};

export default function EstimationsList() {
  const navigate = useNavigate();
  const [estimations, setEstimations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [perPage, setPerPage] = useState(25);
  const [collectModal, setCollectModal] = useState<{
    open: boolean;
    estimation: any;
  }>({
    open: false,
    estimation: null,
  });

  // const statusOptions = [
  //   { value: "all", label: "All" },
  //   { value: "draft", label: "Draft" },
  //   { value: "pending_approval", label: "Pending Approval" },
  //   { value: "approved", label: "Approved" },
  //   { value: "rejected", label: "Rejected" },
  //   { value: "partially_collected", label: "Partial" },
  //   { value: "collected", label: "Material Collected" },
  //   { value: "cancelled", label: "Cancelled" },
  // ];

  const statusCounts = useMemo(
    () =>
      estimations.reduce(
        (acc, estimation) => {
          const current = estimation.status || "unknown";
          acc[current] = (acc[current] || 0) + 1;
          acc.total += 1;
          return acc;
        },
        { total: 0 } as Record<string, number>,
      ),
    [estimations],
  );

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Reject Estimation",
      input: "textarea",
      inputLabel: "Enter rejection reason",
      inputPlaceholder: "Provide a short reason for rejection...",
      inputAttributes: {
        "aria-label": "Rejection reason",
      },
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "swal-solarized",
        title: "swal-title",
        htmlContainer: "swal-text",
      },
      preConfirm: (value) => {
        if (!value || !String(value).trim()) {
          Swal.showValidationMessage("Please enter a rejection reason.");
        }
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    if (!result.isConfirmed) return;

    try {
      await estimationsApi.delete(id);
      showAlert("success", "Rejected!", "Estimation rejected successfully.", 2000);
      fetchEstimations();
    } catch (error) {
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to reject estimation"),
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
    const value = debouncedSearch || search;
    const matchesSearch =
      (est.customer?.name || "").toLowerCase().includes(value.toLowerCase()) ||
      (est.product?.name || "").toLowerCase().includes(value.toLowerCase()) ||
      (est.project?.name || "").toLowerCase().includes(value.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || est.status === statusFilter;

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
      minWidth: "160px",
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{row.customer?.name || "Unknown"}</div>
          <div className="text-xs text-slate-500">{row.product?.name || ""}</div>
        </div>
      ),
    },
    {
      name: "Project",
      selector: (row) => row.project?.name || "-",
      sortable: true,
      minWidth: "140px",
      cell: (row) => <div className="text-sm text-slate-700">{row.project?.name || "-"}</div>,
    },
    {
      name: "Product",
      selector: (row) => row.product?.name || "Unknown",
      sortable: true,
      minWidth: "140px",
      cell: (row) => <div className="text-sm text-slate-700">{row.product?.name || "Unknown"}</div>,
    },
    {
      name: "Type",
      selector: (row) => getEstimationTypeLabel(row.estimation_type),
      sortable: true,
      width: "90px",
      center: true,
    },
    // {
    //   name: "CFT",
    //   selector: (row) => `${Number(row.cft || 0).toFixed(2)} CFT`,
    //   sortable: true,
    //   width: "90px",
    //   right: true,
    // },
    {
      name: "Amount (₹)",
      selector: (row) => row.total_amount || 0,
      sortable: true,
      width: "140px",
      right: true,
      cell: (row) => (
        <div className="text-right font-semibold text-slate-900">
          {row.total_amount
            ? `₹${Number(row.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "-"}
        </div>
      ),
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
        paddingLeft: "16px",
        paddingRight: "16px",
        fontSize: "14px",
        borderBottom: "1px solid #f3f4f6",
      },
    },
    rows: {
      style: {
        minHeight: "64px",
        backgroundColor: "#ffffff",
        transition: "background-color 0.2s ease",
        "&:hover": {
          backgroundColor: "#f8fafc",
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
        <CardContent className="pt-6 pb-6">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by customer, project, or product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11 rounded-2xl border border-slate-200 shadow-sm"
                />
              </div>

              {/* <div className="flex flex-wrap items-center gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      statusFilter === option.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div> */}
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total estimations</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{statusCounts.total || 0}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Draft</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{statusCounts.draft || 0}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Approved</p>
                <p className="mt-3 text-2xl font-semibold text-emerald-700">{statusCounts.approved || 0}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pending / Rejected</p>
                <p className="mt-3 text-2xl font-semibold text-amber-700">{(statusCounts.pending_approval || 0) + (statusCounts.rejected || 0)}</p>
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
