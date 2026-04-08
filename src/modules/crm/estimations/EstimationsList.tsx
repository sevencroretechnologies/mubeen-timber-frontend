import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { estimationsApi } from "@/services/api";
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
  Clock,
  Edit2,
  Loader2,
} from "lucide-react";
import CollectMaterialModal from "./CollectMaterialModal";

const normalizeStatus = (status?: string) => {
  if (!status || status === "draft" || status === "pending_approval") return "draft";
  if (status === "cancelled" || status === "rejected") return "rejected";
  if (status === "collected") return "collected";
  return "approved"; // approved, partially_collected
};

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
  collected: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Collected",
    icon: <Package className="h-3 w-3" />,
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Rejected",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const normalized = normalizeStatus(status);
  const style = statusStyles[normalized] || statusStyles.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${style.bg} ${style.text}`}
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
  isLoading = false,
  title,
}: {
  onClick: () => void;
  variant?: "approve" | "reject" | "collect" | "edit" | "view" | "secondary";
  children: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
}) => {
  const styles: Record<string, string> = {
    approve:
      "bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md shadow-sm",
    reject:
      "bg-rose-500 hover:bg-rose-600 text-white px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md shadow-sm",
    collect:
      "bg-amber-500 hover:bg-amber-600 text-white px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md shadow-sm",
    edit:
      "bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md shadow-sm",
    view:
      "bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md shadow-sm",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-700 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md border border-gray-200 shadow-sm",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      className={`${styles[variant]} flex items-center justify-center gap-1 sm:gap-2 transition-colors whitespace-nowrap ${disabled || isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

// Actions cell component
const ActionsCell = ({
  row,
  onApprove,
  onCollect,
  onView,
  onCancel, // Reject
  onEdit,
  isProcessing = false,
}: {
  row: any;
  onApprove: (id: number) => void;
  onCollect: (estimation: any) => void;
  onView: (id: number) => void;
  onCancel: (id: number) => void;
  onEdit: (id: number) => void;
  isProcessing?: boolean;
}) => {
  const status = normalizeStatus(row.status);
  const realStatus = row.status || "draft";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
      {status === "draft" && (
        <>
          <ActionButton
            variant="approve"
            onClick={() => onApprove(row.id)}
            isLoading={isProcessing}
            title="Approve estimation"
          >
            <CheckCircle className="h-4 w-4" /> Approve
          </ActionButton>
          <ActionButton
            variant="edit"
            onClick={() => onEdit(row.id)}
            title="Edit draft estimation"
          >
            <Edit2 className="h-4 w-4" /> Edit
          </ActionButton>
          <ActionButton
            variant="reject"
            onClick={() => onCancel(row.id)}
            isLoading={isProcessing}
            title="Reject estimation"
          >
            <XCircle className="h-4 w-4" /> Reject
          </ActionButton>
        </>
      )}

      {status === "approved" && (
        <ActionButton
          variant="collect"
          onClick={() => onCollect(row)}
          disabled={realStatus === "collected"}
          title={
            realStatus === "collected"
              ? "All material already collected"
              : "Collect material"
          }
        >
          <Package className="h-4 w-4" />{" "}
          {realStatus === "collected" ? "Collected" : "Collect"}
        </ActionButton>
      )}

      <ActionButton
        variant="view"
        onClick={() => onView(row.id)}
        title="View estimation"
      >
        <Eye className="h-4 w-4" /> {status === "rejected" ? "Details" : "View"}
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
  const [perPage, setPerPage] = useState(25);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set()); // Track IDs being processed
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
          const current = normalizeStatus(estimation.status);
          acc[current] = (acc[current] || 0) + 1;
          acc.total += 1;
          return acc;
        },
        { total: 0, draft: 0, approved: 0, rejected: 0, collected: 0 } as Record<string, number>,
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

  const handleReject = async (id: number) => {
    const result = await showConfirmDialog(
      "Reject Estimation",
      "Are you sure you want to reject this estimation?",
    );

    if (!result.isConfirmed) return;

    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await estimationsApi.cancel(id);
      showAlert("success", "Rejected!", "Estimation rejected successfully.", 2000);
      fetchEstimations();
    } catch (error) {
      console.error(error);
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to reject estimation"),
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleApprove = async (id: number) => {
    const result = await showConfirmDialog(
      "Approve Estimation",
      "Do you want to approve this estimation?",
    );
    if (!result.isConfirmed) return;

    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await estimationsApi.approve(id);
      showAlert("success", "Approved!", "Estimation approved successfully.", 2000);
      fetchEstimations();
    } catch (error) {
      console.error(error);
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to approve estimation"),
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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



  const handleView = (id: number) => {
    navigate(`/crm/estimations/${id}`);
  };

  const handleEdit = (id: number) => {
    navigate(`/crm/estimations/${id}/edit`);
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

    const matchesStatus = true; // No status filter in 3-state system yet or always true if "all"

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
          onCollect={openCollectModal}
          onView={handleView}
          onCancel={handleReject}
          onEdit={handleEdit}
          isProcessing={processingIds.has(row.id)}
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

            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm overflow-hidden">
                <p className="text-[9px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Total Estimations</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{statusCounts.total || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm overflow-hidden">
                <p className="text-[9px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Draft</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{statusCounts.draft || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm border-t-4 border-t-emerald-500 overflow-hidden">
                <p className="text-[9px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Approved / Collected</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-emerald-600">{(statusCounts.approved || 0) + (statusCounts.collected || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm border-t-4 border-t-rose-500 overflow-hidden">
                <p className="text-[9px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Rejected</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-rose-600">{statusCounts.rejected || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Data Table */}
      <Card className="hidden md:block shadow-sm">
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

      {/* Mobile view */}
      <div className="md:hidden flex flex-col gap-3">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-white rounded-xl border border-slate-200">
            <FileSignature className="mx-auto h-12 w-12 mb-3 opacity-20" />
            <p className="text-base font-medium">No estimations found</p>
          </div>
        ) : (
          filteredData.map((row, index) => (
            <Card key={row.id || index} className="overflow-hidden shadow-sm border-slate-200">
              <div className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{row.customer?.name || "Unknown Customer"}</span>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {row.project?.name || "No Project"} • <span className="text-amber-600">{row.product?.name || "Misc Product"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-zinc-50 rounded-lg p-3 border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Type</p>
                    <p className="text-xs font-semibold text-slate-700">{getEstimationTypeLabel(row.estimation_type)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Amount</p>
                    <p className="text-sm font-black text-slate-900">
                      {row.total_amount
                        ? `₹${Number(row.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end w-full border-t border-slate-100">
                  <ActionsCell
                    row={row}
                    onApprove={handleApprove}
                    onCollect={openCollectModal}
                    onView={handleView}
                    onCancel={handleReject}
                    onEdit={handleEdit}
                    isProcessing={processingIds.has(row.id)}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

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
