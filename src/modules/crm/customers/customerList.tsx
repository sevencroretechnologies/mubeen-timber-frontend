import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '@/services/api';
import type { Customer } from '@/types';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, Users, Eye, Edit, Trash2, Building2 } from 'lucide-react';

export default function CustomerList() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const fetchCustomers = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const params: Record<string, any> = { page: currentPage, per_page: perPage };
            if (search) params.search = search;

            const response = await customerApi.list(params) as any;
            const data = response.data || response;
            const pagination = response.pagination;
            const total = response.total ?? pagination?.total_items ?? 0;

            setCustomers(Array.isArray(data) ? data : []);
            setTotalRows(total);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            setCustomers([]);
            setTotalRows(0);
        } finally {
            setIsLoading(false);
        }
    }, [perPage, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(page);
        }, 300);
        return () => clearTimeout(timer);
    }, [page, fetchCustomers]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchCustomers(1);
    };

    const handlePageChange = (newPage: number) => setPage(newPage);
    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const handleAddClick = () => {
        navigate('/crm/customers/create');
    };

    const handleView = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsViewOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        navigate(`/crm/customers/${customer.id}/edit`);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Customer', 'Are you sure you want to delete this customer?');
        if (!result.isConfirmed) return;
        try {
            await customerApi.delete(id);
            showAlert('success', 'Deleted!', 'Customer deleted successfully', 2000);
            fetchCustomers(page);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete customer'));
        }
    };

    const columns: TableColumn<Customer>[] = [
        {
            name: 'ID',
            selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
            width: '60px',
        },
        {
            name: 'Name',
            selector: (row) => row.name,
            sortable: true,
            minWidth: '200px',
            cell: (row) => row.name,
        },
        {
            name: 'Type',
            selector: (row) => row.customer_type || '-',
            sortable: true,
        },
        {
            name: 'Customer Group',
            selector: (row) => row.customer_group_name || '-',
            sortable: true,
        },
        {
            name: 'Territory',
            selector: (row) => row.territory_name || '-',
            sortable: true,
        },
        {
            name: 'Email',
            selector: (row) => row.email || '-',
            sortable: true,
        },
        {
            name: 'Phone',
            selector: (row) => row.phone || '-',
        },
        {
            name: 'Actions',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="View">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} title="Edit">
                        <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
            ),
            width: '140px',
        },
    ];

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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Customers</h1>
                    <p className="text-muted-foreground">Manage your CRM customers</p>
                </div>
                <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90">
                    <Plus className="mr-2 h-4 w-4" /> New Customer
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search customers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" variant="outline">Search</Button>
                    </form>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={customers}
                        progressPending={isLoading}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationDefaultPage={page}
                        onChangePage={handlePageChange}
                        onChangeRowsPerPage={handlePerRowsChange}
                        customStyles={customStyles}
                        highlightOnHover
                        responsive
                        noDataComponent={
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>No customers found</p>
                            </div>
                        }
                    />
                </CardContent>
            </Card>

            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-solarized-blue" />
                            Customer Details
                        </DialogTitle>
                        <DialogDescription>
                            Full information for {selectedCustomer?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedCustomer && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer Name</Label>
                                    <p className="text-base font-semibold text-solarized-blue">{selectedCustomer.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer Type</Label>
                                    <p className="text-sm font-medium">{selectedCustomer.customer_type || '—'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer Group</Label>
                                        <p className="text-sm font-medium">{selectedCustomer.customer_group_name || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Territory</Label>
                                        <p className="text-sm font-medium">{selectedCustomer.territory_name || '—'}</p>
                                    </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</Label>
                                    <p className="text-sm font-medium">{selectedCustomer.email || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phone</Label>
                                    <p className="text-sm font-medium">{selectedCustomer.phone || '—'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Website</Label>
                                    <p className="text-sm font-medium truncate">{selectedCustomer.website || '—'}</p>
                                </div>
                                {selectedCustomer.industry_id && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Industry</Label>
                                        <p className="text-sm font-medium">{selectedCustomer.industry_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
