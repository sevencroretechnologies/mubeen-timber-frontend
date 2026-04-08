import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { customerApi } from "@/services/api";
import type { Customer } from "@/types";
import {
    showAlert,
    showConfirmDialog,
    getErrorMessage,
} from "@/lib/sweetalert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable, { TableColumn } from "react-data-table-component";
import {
    Plus,
    Search,
    Users,
    Eye,
    Edit,
    Trash2,
    Building2,
    FolderPlus,
    Mail,
    Phone,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

export default function CustomerList() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
        null,
    );

    const fetchCustomers = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, any> = {
                    page: currentPage,
                    per_page: perPage,
                };
                if (search) params.search = search;

                const response = (await customerApi.list(params)) as any;
                const data = response.data || response;
                const pagination = response.pagination;
                const total = response.total ?? pagination?.total_items ?? 0;

                setCustomers(Array.isArray(data) ? data : []);
                setTotalRows(total);
            } catch (error) {
                console.error("Failed to fetch customers:", error);
                setCustomers([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, search],
    );

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
        navigate("/crm/customers/create");
    };

    const handleProjects = (customer: Customer) => {
        navigate(`/crm/customers/${customer.id}/projects`);
    };

    const handleView = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsViewOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        navigate(`/crm/customers/${customer.id}/edit`);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            "Delete Customer",
            "Are you sure you want to delete this customer?",
        );
        if (!result.isConfirmed) return;
        try {
            await customerApi.delete(id);
            showAlert(
                "success",
                "Deleted!",
                "Customer deleted successfully",
                2000,
            );
            fetchCustomers(page);
        } catch (error) {
            showAlert(
                "error",
                "Error",
                getErrorMessage(error, "Failed to delete customer"),
            );
        }
    };

    const columns: TableColumn<Customer>[] = [
        // {
        //     name: 'ID',
        //     selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
        //     width: '60px',
        // },
        {
            name: "Name",
            selector: (row) => row.name,
            sortable: true,
            width: "200px",
            cell: (row) => row.name,
        },
        {
            name: "Type",
            selector: (row) => row.customer_type || "-",
            sortable: true,
            width: "90px",
        },
        {
            name: "Customer Group",
            selector: (row) => row.customer_group_name || "-",
            sortable: true,
            width: "130px",
        },
        // {
        //     name: 'Territory',
        //     selector: (row) => row.territory_name || '-',
        //     sortable: true,
        // },
        {
            name: "Email",
            selector: (row) => row.email || "-",
            sortable: true,
            minWidth: "90px",
        },
        {
            name: "Phone",
            selector: (row) => row.phone || "-",
            minWidth: "90px",
        },
        {
            name: "Actions",
            cell: (row) => (
                <div className='flex items-center gap-1 pl-1'>
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleProjects(row)}
                        title='Projects'
                        className='h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold flex items-center shrink-0'
                    >
                        <FolderPlus className='h-3.5 w-3.5 mr-1' />
                        <span className='text-[10px] uppercase tracking-wider'>
                            Add Project
                        </span>
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => handleView(row)}
                        title='View'
                    >
                        <Eye className='h-4 w-4' />
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => handleEdit(row)}
                        title='Edit'
                    >
                        <Edit className='h-4 w-4 text-blue-600' />
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => handleDelete(row.id)}
                        title='Delete'
                    >
                        <Trash2 className='h-4 w-4 text-red-600' />
                    </Button>
                </div>
            ),
            width: "230px",
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
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                paddingLeft: "16px",
                paddingRight: "16px",
            },
        },
    };

    return (
        <div className='space-y-6'>
            <div className='flex justify-between items-center gap-4 mb-4'>
                <div>
                    <h1 className='text-2xl font-bold text-solarized-base02 tracking-tight'>
                        Customers
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Manage your CRM customers
                    </p>
                </div>
                <Button
                    onClick={handleAddClick}
                    size='sm'
                    className='bg-solarized-blue hover:bg-solarized-blue/90 shadow-sm transition-all active:scale-95 h-9 shrink-0 px-3'
                >
                    <Plus className='mr-1 h-3.5 w-3.5' /> New Customer
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <form
                        onSubmit={handleSearchSubmit}
                        className='flex flex-col sm:flex-row gap-3'
                    >
                        <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder='Search customers...'
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className='pl-10 h-10 border-gray-200 focus:ring-solarized-blue/20'
                            />
                        </div>
                        <Button
                            type='submit'
                            variant='secondary'
                            className='w-full sm:w-auto h-10 px-6 font-semibold'
                        >
                            Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent className='p-0 sm:p-6'>
                    {/* Desktop View */}
                    <div className='hidden md:block'>
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
                                <div className='text-center py-12 text-muted-foreground'>
                                    <Users className='mx-auto h-12 w-12 mb-4 opacity-20' />
                                    <p>No customers found</p>
                                </div>
                            }
                        />
                    </div>

                    {/* Mobile Card View */}
                    <div className='md:hidden space-y-4 p-4'>
                        {isLoading ? (
                            <div className='flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200'>
                                <Plus className='h-8 w-8 animate-spin text-solarized-blue/20 mb-2' />
                                <p className='text-sm text-muted-foreground animate-pulse'>
                                    Loading customers...
                                </p>
                            </div>
                        ) : customers.length === 0 ? (
                            <div className='text-center py-20 rounded-xl border border-dashed border-gray-200'>
                                <Users className='mx-auto h-12 w-12 mb-4 opacity-10' />
                                <p className='text-muted-foreground'>
                                    No customers found
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className='grid grid-cols-1 gap-4'>
                                    {customers.map((customer) => (
                                        <div
                                            key={customer.id}
                                            className='responsive-card p-4'
                                        >
                                            <div className='flex justify-between items-start mb-3'>
                                                <div className='flex-1 min-w-0'>
                                                    <h3 className='font-bold text-gray-900 leading-tight mb-1'>
                                                        {customer.name}
                                                    </h3>
                                                </div>
                                                <div className='flex gap-1 shrink-0'>
                                                    <Button
                                                        variant='ghost'
                                                        size='icon'
                                                        className='h-8 w-8 text-gray-400 hover:text-solarized-blue'
                                                        onClick={() =>
                                                            handleView(customer)
                                                        }
                                                    >
                                                        <Eye className='h-4 w-4' />
                                                    </Button>
                                                    <Button
                                                        variant='ghost'
                                                        size='icon'
                                                        className='h-8 w-8 text-gray-400 hover:text-blue-600'
                                                        onClick={() =>
                                                            handleEdit(customer)
                                                        }
                                                    >
                                                        <Edit className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className='grid grid-cols-1 gap-2.5 text-sm text-gray-500 mb-4'>
                                                {customer.email && (
                                                    <div className='flex items-center gap-2'>
                                                        <Mail className='h-3.5 w-3.5 opacity-60' />
                                                        <span className='truncate'>
                                                            {customer.email}
                                                        </span>
                                                    </div>
                                                )}
                                                {customer.phone && (
                                                    <div className='flex items-center gap-2'>
                                                        <Phone className='h-3.5 w-3.5 opacity-60' />
                                                        <span>
                                                            {customer.phone}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className='flex gap-2 pt-3 border-t border-gray-100'>
                                                <Button
                                                    className='flex-1 h-10 text-[11px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-100'
                                                    variant='outline'
                                                    onClick={() =>
                                                        handleProjects(customer)
                                                    }
                                                >
                                                    <FolderPlus className='h-3.5 w-3.5 mr-2' />{" "}
                                                    Add Project
                                                </Button>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    className='h-10 w-10 text-red-400 hover:text-red-600 hover:bg-gray-50 rounded-lg shrink-0'
                                                    onClick={() =>
                                                        handleDelete(
                                                            customer.id,
                                                        )
                                                    }
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mobile Pagination */}
                                {totalRows > perPage && (
                                    <div className='flex justify-between items-center py-4 px-2 border-t border-gray-100 mt-4'>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            disabled={page === 1}
                                            onClick={() => setPage(page - 1)}
                                            className='h-9 px-3 text-gray-600'
                                        >
                                            <ChevronLeft className='h-4 w-4 mr-1' />{" "}
                                            Prev
                                        </Button>
                                        <div className='text-[11px] font-bold text-gray-500 uppercase tracking-widest'>
                                            Page {page} /{" "}
                                            {Math.ceil(totalRows / perPage)}
                                        </div>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            disabled={
                                                page >=
                                                Math.ceil(totalRows / perPage)
                                            }
                                            onClick={() => setPage(page + 1)}
                                            className='h-9 px-3 text-gray-600'
                                        >
                                            Next{" "}
                                            <ChevronRight className='h-4 w-4 ml-1' />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className='sm:max-w-[600px]'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <Building2 className='h-5 w-5 text-solarized-blue' />
                            Customer Details
                        </DialogTitle>
                        <DialogDescription>
                            Full information for {selectedCustomer?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedCustomer && (
                        <div className='space-y-6 py-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Customer Name
                                    </Label>
                                    <p className='text-base font-semibold text-solarized-blue'>
                                        {selectedCustomer.name}
                                    </p>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Customer Type
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedCustomer.customer_type || "—"}
                                    </p>
                                </div>
                            </div>

                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Customer Group
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedCustomer.customer_group_name ||
                                            "—"}
                                    </p>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Territory
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedCustomer.territory_name || "—"}
                                    </p>
                                </div>
                            </div>

                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Email
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedCustomer.email || "—"}
                                    </p>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Phone
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedCustomer.phone || "—"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => setIsViewOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
