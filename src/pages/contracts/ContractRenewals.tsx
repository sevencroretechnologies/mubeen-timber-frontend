import { useState, useEffect, useCallback } from 'react';
import { contractService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { RefreshCw, FileText, Eye, MoreHorizontal, Search } from 'lucide-react';

interface Contract {
    id: number;
    reference_number: string;
    start_date: string;
    end_date: string | null;
    salary: string;
    status: string;
    staff_member?: {
        id: number;
        full_name: string;
    };
    contract_type?: {
        id: number;
        title: string;
    };
}

interface RenewalFormData {
    contract_id: string;
    new_end_date: string;
    new_salary: string;
    notes: string;
}

export default function ContractRenewals() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination & Sorting State
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);
    const [sortField, setSortField] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Dialog states
    const [isRenewOpen, setIsRenewOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [renewalData, setRenewalData] = useState<RenewalFormData>({
        contract_id: '',
        new_end_date: '',
        new_salary: '',
        notes: '',
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // ================= VALIDATION =================
    const validateRenewalForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // New end date validation (required, must be after current end date)
        if (!renewalData.new_end_date) {
            errors.new_end_date = 'New end date is required';
            isValid = false;
        } else if (selectedContract?.end_date) {
            const currentEndDate = new Date(selectedContract.end_date);
            const newEndDate = new Date(renewalData.new_end_date);
            
            // IMPORTANT: New end date must be STRICTLY AFTER current end date (not same day)
            if (newEndDate <= currentEndDate) {
                errors.new_end_date = `New end date must be after ${formatDate(selectedContract.end_date)}`;
                isValid = false;
            }
        }

        // New salary validation (nullable, numeric, min: 0 if provided)
        if (renewalData.new_salary && renewalData.new_salary.trim() !== '') {
            const salary = Number(renewalData.new_salary);
            if (isNaN(salary)) {
                errors.new_salary = 'Salary must be a number';
                isValid = false;
            } else if (salary < 0) {
                errors.new_salary = 'Salary must be 0 or greater';
                isValid = false;
            }
        }

        // Notes validation (nullable, string)
        // No validation needed as it's optional string

        setFieldErrors(errors);
        return isValid;
    };

    // Helper to render error messages
    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    // Clear error for specific field when user starts typing
    const clearFieldError = (field: string) => {
        setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    // ================= FETCH CONTRACTS =================
    const fetchExpiredContracts = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    page: currentPage,
                    per_page: perPage,
                    status: 'expired',
                    search: searchQuery,
                };

                if (sortField) {
                    params.order_by = sortField;
                    params.order = sortDirection;
                }

                const response = await contractService.getAll(params);
                const { data, meta } = response.data;

                if (Array.isArray(data)) {
                    setContracts(data);
                    setTotalRows(meta?.total ?? 0);
                } else {
                    setContracts([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch contracts:', error);
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch contracts'));
                setContracts([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, searchQuery, sortField, sortDirection]
    );

    useEffect(() => {
        fetchExpiredContracts(page);
    }, [page, fetchExpiredContracts]);

    // ================= SEARCH =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(1);
    };

    // ================= PAGINATION =================
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    // ================= SORTING =================
    const handleSort = (column: TableColumn<Contract>, direction: 'asc' | 'desc') => {
        const columnId = String(column.id || '');
        if (columnId === 'employee' || column.name === 'Employee') {
            setSortField('staff_member_id');
            setSortDirection(direction);
            setPage(1);
        }
    };

    // ================= ACTIONS =================
    const handleViewDetails = (contract: Contract) => {
        setSelectedContract(contract);
        setIsDetailsOpen(true);
    };

    const handleRenewClick = (contract: Contract) => {
        setSelectedContract(contract);
        setRenewalData({
            contract_id: contract.id.toString(),
            new_end_date: '',
            new_salary: contract.salary,
            notes: '',
        });
        setFieldErrors({}); // Clear previous errors
        setIsRenewOpen(true);
    };

    const handleRenew = async () => {
        if (!selectedContract) return;

        // Validate form before submission
        if (!validateRenewalForm()) {
            // showAlert('error', 'Validation Error', 'Please check the form for errors.');
            return;
        }

        try {
            await contractService.renewContract(selectedContract.id, {
                new_end_date: renewalData.new_end_date,
                new_salary: renewalData.new_salary,
                notes: renewalData.notes,
            });

            showAlert('success', 'Success', 'Contract renewed successfully', 2000);
            setIsRenewOpen(false);
            setSelectedContract(null);
            setFieldErrors({});
            fetchExpiredContracts(page);
        } catch (error: any) {
            console.error('Failed to renew contract:', error);
            
            // Handle API validation errors
            if (error.response?.data?.errors) {
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to renew contract'));
            }
        }
    };

    // ================= HELPERS =================
    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            draft: 'bg-solarized-base01/10 text-solarized-base01',
            active: 'bg-solarized-green/10 text-solarized-green',
            expired: 'bg-solarized-red/10 text-solarized-red',
            terminated: 'bg-solarized-base01/10 text-solarized-base01',
        };
        return variants[status] || variants.draft;
    };

    const formatCurrency = (amount: string) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(Number(amount || 0));

    const formatDate = (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : 'Indefinite';

    // Calculate minimum date for input (next day after current end date)
    const getMinEndDate = () => {
        if (!selectedContract?.end_date) return '';
        
        const currentEndDate = new Date(selectedContract.end_date);
        const nextDay = new Date(currentEndDate);
        nextDay.setDate(currentEndDate.getDate() + 1);
        return nextDay.toISOString().split('T')[0];
    };

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<Contract>[] = [
        {
            id: 'employee',
            name: 'Employee',
            selector: (row) => row.staff_member?.full_name || 'Unknown',
            cell: (row) => (
                <span className="font-medium">
                    {row.staff_member?.full_name || 'Unknown'}
                </span>
            ),
            sortable: true,
            minWidth: '200px',
        },
        {
            name: 'Contract Type',
            selector: (row) => row.contract_type?.title || '-',
            cell: (row) => (
                <span className="text-sm">{row.contract_type?.title || '-'}</span>
            ),
            minWidth: '150px',
        },
        {
            name: 'End Date',
            selector: (row) => row.end_date || '',
            cell: (row) => (
                <span className="text-solarized-red font-medium">
                    {formatDate(row.end_date)}
                </span>
            ),
            minWidth: '120px',
        },
        {
            name: 'Salary',
            selector: (row) => row.salary,
            cell: (row) => <span>{formatCurrency(row.salary)}</span>,
            minWidth: '130px',
        },
        {
            name: 'Status',
            cell: (row) => (
                <Badge className={getStatusBadge(row.status)}>
                    {row.status}
                </Badge>
            ),
            width: '110px',
        },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(row)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleRenewClick(row)}
                            className="text-solarized-green"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" /> Renew Contract
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            ignoreRowClick: true,
            width: '80px',
        },
    ];

    // Custom Styles for DataTable
    const customStyles = {
        headRow: {
            style: {
                backgroundColor: '#f9fafb',
                borderBottomWidth: '1px',
                borderBottomColor: '#e5e7eb',
                borderBottomStyle: 'solid' as const,
                minHeight: '56px',
            },
        },
        headCells: {
            style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                paddingLeft: '16px',
                paddingRight: '16px',
            },
        },
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Contract Renewals</h1>
                    <p className="text-solarized-base01">
                        Renew expired contracts to extend employment
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 sm:grid-cols-2">
                <Card className="border-0 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-solarized-red/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-solarized-red" />
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Expired Contracts</p>
                                <p className="text-xl font-bold text-solarized-base02">{totalRows || contracts.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-solarized-green" />
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Ready for Renewal</p>
                                <p className="text-xl font-bold text-solarized-base02">{contracts.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TABLE */}
            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Expired Contracts</CardTitle>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
                        <Input
                            placeholder="Search by employee name..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {!isLoading && contracts.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No expired contracts found</h3>
                            <p className="text-sm text-solarized-base01 mt-2">
                                All contracts are currently active or terminated
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={contracts}
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
                            defaultSortFieldId="employee"
                            defaultSortAsc={true}
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>

            {/* VIEW DETAILS DIALOG */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Contract Details</DialogTitle>
                        <DialogDescription>View the details of this expired contract</DialogDescription>
                    </DialogHeader>

                    {selectedContract && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-solarized-base01">Employee</Label>
                                    <p className="font-medium">{selectedContract.staff_member?.full_name || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-solarized-base01">Contract Type</Label>
                                    <p>{selectedContract.contract_type?.title || '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-solarized-base01">Start Date</Label>
                                    <p>{formatDate(selectedContract.start_date)}</p>
                                </div>
                                <div>
                                    <Label className="text-solarized-base01">End Date</Label>
                                    <p className="text-solarized-red font-medium">{formatDate(selectedContract.end_date)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-solarized-base01">Salary</Label>
                                    <p className="font-medium">{formatCurrency(selectedContract.salary)}</p>
                                </div>
                                <div>
                                    <Label className="text-solarized-base01">Status</Label>
                                    <div className="mt-1">
                                        <Badge className={getStatusBadge(selectedContract.status)}>
                                            {selectedContract.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label className="text-solarized-base01">Reference Number</Label>
                                <p className="font-mono text-sm">{selectedContract.reference_number}</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                            Close
                        </Button>
                        {/* {selectedContract && (
                            <Button
                                className="bg-solarized-green hover:bg-solarized-green/90"
                                onClick={() => {
                                    setIsDetailsOpen(false);
                                    handleRenewClick(selectedContract);
                                }}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Renew Contract
                            </Button>
                        )} */}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RENEW DIALOG */}
            <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Renew Contract</DialogTitle>
                        <DialogDescription>Extend the contract with new terms</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {selectedContract && (
                            <>
                                <div className="p-3 bg-solarized-blue/10 border border-solarized-blue/20 rounded-md">
                                    <p className="text-sm text-solarized-blue">
                                        <strong>Employee:</strong> {selectedContract.staff_member?.full_name}
                                    </p>
                                    <p className="text-sm text-solarized-blue mt-1">
                                        <strong>Current End Date:</strong> {formatDate(selectedContract.end_date)}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="newEndDate" className={fieldErrors.new_end_date ? 'text-red-500' : ''}>
                                        New End Date *
                                    </Label>
                                    <Input
                                        id="newEndDate"
                                        type="date"
                                        value={renewalData.new_end_date}
                                        onChange={(e) => {
                                            setRenewalData({ ...renewalData, new_end_date: e.target.value });
                                            clearFieldError('new_end_date');
                                        }}
                                        min={getMinEndDate()} // Important: Set to next day after current end date
                                        className={fieldErrors.new_end_date ? 'border-red-500' : ''}
                                    />
                                    {renderError('new_end_date')}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="newSalary" className={fieldErrors.new_salary ? 'text-red-500' : ''}>
                                        New Salary
                                    </Label>
                                    <Input
                                        id="newSalary"
                                        type="number"
                                        value={renewalData.new_salary}
                                        onChange={(e) => {
                                            setRenewalData({ ...renewalData, new_salary: e.target.value });
                                            clearFieldError('new_salary');
                                        }}
                                        placeholder="Enter new salary (optional)"
                                        className={fieldErrors.new_salary ? 'border-red-500' : ''}
                                    />
                                    {renderError('new_salary')}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={renewalData.notes}
                                        onChange={(e) => setRenewalData({ ...renewalData, notes: e.target.value })}
                                        rows={3}
                                        placeholder="Add any notes about the renewal..."
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsRenewOpen(false);
                            setSelectedContract(null);
                            setFieldErrors({});
                        }}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                            onClick={handleRenew}
                            disabled={!selectedContract || !renewalData.new_end_date}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Renew Contract
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}