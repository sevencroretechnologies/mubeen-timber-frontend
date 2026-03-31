import { useState, useEffect, useCallback } from "react";
import { assetService, assetTypeService } from "../../services/api";
import { showAlert, showConfirmDialog, getErrorMessage } from "../../lib/sweetalert";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { StatusBadge } from "../../components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Package,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import DataTable, { TableColumn } from "react-data-table-component";

interface Asset {
  id: number;
  name: string;
  asset_code: string;
  asset_type_id: number;
  asset_type?: { id: number; title: string };
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  condition?: string;
  location?: string;
  status: string;
  current_value?: number;
  supplier?: string;
  warranty_info?: string;
  warranty_expiry?: string;
  assigned_employee?: {
    id: number;
    full_name: string;
  };
}

interface AssetType {
  id: number;
  title: string;
}

export default function AssetsList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    asset_type_id: "",
    serial_number: "",
    purchase_date: "",
    purchase_cost: "",
    condition: "",
    location: "",
    supplier: "",
    warranty_info: "",
    warranty_expiry: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch assets with pagination
  const fetchAssets = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      try {
        const params: {
          page?: number;
          per_page?: number;
          search?: string;
          order_by?: string;
          order?: string;
        } = {
          page: currentPage,
          per_page: perPage,
        };

        if (searchQuery) {
          params.search = searchQuery;
        }

        if (sortField) {
          params.order_by = sortField;
          params.order = sortDirection;
        }

        const response = await assetService.getAll(params);
        const payload = response.data.data;

        if (payload && typeof payload === "object" && !Array.isArray(payload) && Array.isArray(payload.data)) {
          setAssets(payload.data);
          setTotalRows(payload.total ?? 0);
        } else if (Array.isArray(payload)) {
          setAssets(payload);
          setTotalRows(payload.length);
        } else {
          setAssets([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error("Failed to fetch assets:", error);
        setAssets([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, sortField, sortDirection]
  );

  useEffect(() => {
    fetchAssets(page);
  }, [page, fetchAssets]);

  useEffect(() => {
    fetchAssetTypes();
  }, []);

  const fetchAssetTypes = async () => {
    try {
      const response = await assetTypeService.getAll({});
      const payload = response.data.data;
      if (Array.isArray(payload)) {
        setAssetTypes(payload);
      } else if (payload && Array.isArray(payload.data)) {
        setAssetTypes(payload.data);
      }
    } catch (error) {
      console.error("Failed to fetch asset types:", error);
    }
  };

  // Search Handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  // Pagination Handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // Sorting Handler
  const handleSort = (column: TableColumn<Asset>, direction: "asc" | "desc") => {
    const columnId = String(column.id || "");

    const fieldMap: Record<string, string> = {
      name: "name",
      asset_code: "asset_code",
      purchase_cost: "purchase_cost",
      status: "status",
    };

    const fieldName = fieldMap[columnId];

    if (fieldName) {
      setSortField(fieldName);
      setSortDirection(direction);
      setPage(1);
    }
  };



  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Asset Name is required';
      isValid = false;
    }
    if (!formData.asset_type_id) {
      errors.asset_type_id = 'Asset Type is required';
      isValid = false;
    }

    if (!formData.condition) {
      errors.condition = 'Asset Condition is required';
      isValid = false;
    }
    if (formData.purchase_cost) {
      if (Number(formData.purchase_cost) < 0) {
        errors.purchase_cost = 'Cost cannot be negative';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const payload = {
        name: formData.name,
        asset_type_id: Number(formData.asset_type_id),
        serial_number: formData.serial_number || null,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost
          ? Number(formData.purchase_cost)
          : null,
        condition: formData.condition,
        location: formData.location || null,
        supplier: formData.supplier || null,
        warranty_info: formData.warranty_info || null,
        warranty_expiry: formData.warranty_expiry || null,
      };

      if (editingAsset) {
        await assetService.update(editingAsset.id, payload);
        showAlert("success", "Updated!", "Asset updated successfully");
      } else {
        await assetService.create(payload);
        showAlert("success", "Created!", "Asset created successfully");
      }
      setIsDialogOpen(false);
      setEditingAsset(null);
      resetForm();
      fetchAssets(page);
    } catch (err: any) {
      console.error("Failed to save asset:", err);
      const msg = getErrorMessage(err, "Failed to save asset");

      if (err.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          apiErrors[key] = err.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
        showAlert('error', 'Validation Failure', 'Please fix the errors highlighted below.');
      } else {
        showAlert("error", "Error", msg);
      }
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFieldErrors({});

    const formattedPurchaseDate = asset.purchase_date
      ? new Date(asset.purchase_date).toISOString().slice(0, 10)
      : "";

    const formattedWarrantyExpiry = asset.warranty_expiry
      ? new Date(asset.warranty_expiry).toISOString().slice(0, 10)
      : "";

    setFormData({
      name: asset.name,
      asset_type_id: String(asset.asset_type_id),
      serial_number: asset.serial_number || "",
      purchase_date: formattedPurchaseDate,
      purchase_cost: asset.purchase_cost ? String(asset.purchase_cost) : "",
      condition: asset.condition || "good",
      location: asset.location || "",
      supplier: asset.supplier || "",
      warranty_info: asset.warranty_info || "",
      warranty_expiry: formattedWarrantyExpiry,
    });
    setIsDialogOpen(true);
  };

  const handleView = (asset: Asset) => {
    setViewingAsset(asset);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (asset: Asset) => {
    const result = await showConfirmDialog(
      "Delete Asset",
      `Are you sure you want to delete "${asset.name}"?`
    );
    if (!result.isConfirmed) return;
    try {
      await assetService.delete(asset.id);
      showAlert("success", "Deleted!", "Asset deleted successfully", 2000);
      fetchAssets(page);
    } catch (error) {
      console.error("Failed to delete asset:", error);
      const msg = getErrorMessage(error, "Failed to delete asset");
      showAlert("error", "Error", msg);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      asset_type_id: "",
      serial_number: "",
      purchase_date: "",
      purchase_cost: "",
      condition: "good",
      location: "",
      supplier: "",
      warranty_info: "",
      warranty_expiry: "",
    });
    setFieldErrors({});
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      currencyDisplay: "code",
    })
      .format(amount || 0)
      .replace("USD", "")
      .trim();
  };

  // Table Columns
  const columns: TableColumn<Asset>[] = [
    {
      id: "asset_code",
      name: "Asset Code",
      selector: (row) => row.asset_code,
      cell: (row) => <span className="font-mono text-sm">{row.asset_code}</span>,
      sortable: true,
      minWidth: "130px",
    },
    {
      id: "name",
      name: "Name",
      selector: (row) => row.name,
      cell: (row) => <span className="font-medium">{row.name}</span>,
      sortable: true,
      minWidth: "150px",
    },
    {
      name: "Type",
      selector: (row) => row.asset_type?.title || "-",
    },
    {
      name: "Assigned To",
      selector: (row) => row.assigned_employee?.full_name || "-",
    },
    {
      id: "purchase_cost",
      name: "Purchase Cost",
      selector: (row) => row.purchase_cost || 0,
      cell: (row) => <span>{formatCurrency(row.purchase_cost || 0)}</span>,
      sortable: true,
    },
    {
      id: "status",
      name: "Status",
      selector: (row) => row.status,
      cell: (row) => (
        <StatusBadge status={row.status} />
      ),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(row)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row)}
              className="text-solarized-red"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      ignoreRowClick: true,
      width: "80px",
    },
  ];

  // Custom Styles for DataTable
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
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
        paddingLeft: "16px",
        paddingRight: "16px",
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Assets</h1>
          <p className="text-solarized-base01">
            Manage company assets and equipment
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                setEditingAsset(null);
                resetForm();
                setFieldErrors({});
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? "Edit Asset" : "Add Asset"}
              </DialogTitle>
              <DialogDescription>
                {editingAsset
                  ? "Update asset details."
                  : "Add a new asset to the inventory."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={fieldErrors.name ? 'text-red-500' : ''}>Asset Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                      }}
                      placeholder="e.g., MacBook Pro"
                      className={fieldErrors.name ? 'border-red-500' : ''}
                    />
                    {renderError('name')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset_type_id" className={fieldErrors.asset_type_id ? 'text-red-500' : ''}>Asset Type *</Label>
                    <Select
                      value={formData.asset_type_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, asset_type_id: value });
                        if (fieldErrors.asset_type_id) setFieldErrors(prev => ({ ...prev, asset_type_id: '' }));
                      }}
                    >
                      <SelectTrigger className={fieldErrors.asset_type_id ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type.id} value={String(type.id)}>
                            {type.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderError('asset_type_id')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serial_number">Serial Number</Label>
                    <Input
                      id="serial_number"
                      value={formData.serial_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serial_number: e.target.value,
                        })
                      }
                      placeholder="e.g., SN123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData({ ...formData, supplier: e.target.value })
                      }
                      placeholder="e.g., Apple Inc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_date">Purchase Date</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchase_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase_cost" className={fieldErrors.purchase_cost ? 'text-red-500' : ''}>Purchase Cost</Label>
                    <Input
                      id="purchase_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchase_cost}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          purchase_cost: e.target.value,
                        });
                        if (fieldErrors.purchase_cost) setFieldErrors(prev => ({ ...prev, purchase_cost: '' }));
                      }}
                      placeholder="e.g., 1500"
                      className={fieldErrors.purchase_cost ? 'border-red-500' : ''}
                    />
                    {renderError('purchase_cost')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="condition" className={fieldErrors.condition ? 'text-red-500' : ''}>
                      Condition *
                    </Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => {
                        setFormData({ ...formData, condition: value });
                        if (fieldErrors.condition) setFieldErrors(prev => ({ ...prev, condition: '' }));
                      }}
                      required
                    >
                      <SelectTrigger className={fieldErrors.condition ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.condition && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.condition}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder="e.g., Office Floor 2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="warranty_info">Warranty Info</Label>
                    <Input
                      id="warranty_info"
                      value={formData.warranty_info}
                      onChange={(e) =>
                        setFormData({ ...formData, warranty_info: e.target.value })
                      }
                      placeholder="e.g., 2 years warranty"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                    <Input
                      id="warranty_expiry"
                      type="date"
                      value={formData.warranty_expiry}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warranty_expiry: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-solarized-blue hover:bg-solarized-blue/90"
                >
                  {editingAsset ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {viewingAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-solarized-base01">Asset Code</p>
                  <p className="font-mono">{viewingAsset.asset_code}</p>
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Name</p>
                  <p className="font-medium">{viewingAsset.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-solarized-base01">Type</p>
                  <p>{viewingAsset.asset_type?.title || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Status</p>
                  <StatusBadge status={viewingAsset.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-solarized-base01">Purchase Date</p>
                  <p>
                    {viewingAsset.purchase_date
                      ? new Date(viewingAsset.purchase_date).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Purchase Cost</p>
                  <p>{formatCurrency(viewingAsset.purchase_cost || 0)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-solarized-base01">Supplier</p>
                  <p>{viewingAsset.supplier || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Warranty Expiry</p>
                  <p>
                    {viewingAsset.warranty_expiry
                      ? new Date(viewingAsset.warranty_expiry).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Assigned To</p>
                <p>{viewingAsset.assigned_employee?.full_name || "Not assigned"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Assets</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {totalRows}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Available</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {assets.filter((a) => a.status === "available").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-cyan/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-solarized-cyan" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Assigned</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {assets.filter((a) => a.status === "assigned").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-solarized-yellow" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Maintenance</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {assets.filter((a) => a.status === "maintenance").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DataTable */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Assets List</CardTitle>
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
            <Input
              placeholder="Search by name, code, or serial number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && assets.length === 0 && !searchQuery ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">
                No assets found
              </h3>
              <p className="text-solarized-base01 mt-1">
                Add assets to track company equipment.
              </p>
              <Button
                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={assets}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              onSort={handleSort}
              customStyles={customStyles}
              sortServer
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}