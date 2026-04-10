import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyService, organizationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
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
    DialogTrigger,
} from '../../components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Briefcase,
    Eye,
    MapPin,
    Building2,
} from 'lucide-react';

interface Company {
    id: number;
    org_id: number;
    company_name: string;
    address: string;
    organization?: { name: string };
    created_at?: string;
    updated_at?: string;
}

export default function CompanyList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchInput, setSearchInput] = useState(''); // What user types
    const [search, setSearch] = useState(''); // What's sent to API
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // View dialog state
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

    // ================= FETCH COMPANIES =================
    const fetchCompanies = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const response = await companyService.getAll({
                    page: currentPage,
                    per_page: perPage,
                    search,
                });

                const { data, meta } = response.data;

                if (Array.isArray(data)) {
                    setCompanies(data);
                    setTotalRows(meta?.total ?? 0);
                } else {
                    setCompanies([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch companies:', error);
                // showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch companies'));
                setCompanies([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, search]
    );

    useEffect(() => {
        fetchCompanies(page);
    }, [page, fetchCompanies]);

    // ================= SEARCH =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput); // Update search state with current input
        setPage(1);
    };

    // ================= PAGINATION =================
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1); // Reset to first page when changing rows per page
    };

    // ================= DIALOG HANDLERS =================
    const handleView = (company: Company) => {
        setViewingCompany(company);
        setIsViewDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Company', 'Are you sure you want to delete this company?');
        if (!result.isConfirmed) return;
        try {
            await companyService.delete(id);
            showAlert('success', 'Deleted!', 'Company deleted successfully', 2000);
            fetchCompanies(page);
        } catch (error) {
            console.error('Failed to delete company:', error);
            const errorMessage = getErrorMessage(error, 'Failed to delete company');
            showAlert('error', 'Error', errorMessage);
        }
    };

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<Company>[] = [
        {
            name: 'Organization',
            selector: (row) => row.organization?.name || '-',
            sortable: true,
        },
        {
            name: 'Company Name',
            selector: (row) => row.company_name,
            sortable: true,
        },
        {
            name: 'Address',
            selector: (row) => row.address || '-',
            sortable: true,
            grow: 2,
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
                        <DropdownMenuItem onClick={() => handleView(row)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/companies/${row.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            ignoreRowClick: true,
            width: '80px',
        },
    ];

    // ================= UI =================
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Companies</h1>
                    <p className="text-muted-foreground">Manage your companies under organizations</p>
                </div>
                <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={() => navigate('/companies/create')}>
                    <Plus className="mr-2 h-4 w-4" /> Add Company
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-4">
                        <Input
                            placeholder="Search companies..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>

                    {!isLoading && companies.length === 0 ? (
                        <div className="text-center py-12">
                            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p>No companies found</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={companies}
                            progressPending={isLoading}
                            pagination
                            paginationServer
                            paginationTotalRows={totalRows}
                            paginationPerPage={perPage}
                            paginationRowsPerPageOptions={[5, 10, 15, 20]}
                            paginationDefaultPage={page}
                            onChangePage={handlePageChange}
                            onChangeRowsPerPage={handlePerRowsChange}
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>

            {/* View Company Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-solarized-blue" />
                            Company Details
                        </DialogTitle>
                        <DialogDescription>
                            View company information
                        </DialogDescription>
                    </DialogHeader>
                    {viewingCompany && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Company Name</Label>
                                <p className="text-lg font-semibold">{viewingCompany.company_name}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-4 w-4" /> Organization
                                </Label>
                                <Badge variant="secondary">{viewingCompany.organization?.name || 'N/A'}</Badge>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-4 w-4" /> Address
                                </Label>
                                <p className="text-base">{viewingCompany.address || 'No address provided'}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
