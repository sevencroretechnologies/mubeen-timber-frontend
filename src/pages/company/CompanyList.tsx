import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Building2,
    Eye,
    MapPin,
    Phone,
    Mail,
    Globe,
    Truck,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface Company {
    id: number;
    org_id: number;
    company_name: string;
    address: string | null;
    shipping_address: string | null;
    company_phone: string | null;
    email: string | null;
    website: string | null;
    company_logo: string | null;
    organization?: { name: string };
    created_at?: string;
}

export default function CompanyList() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // View dialog
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────
    const fetchCompanies = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const response = await companyService.getAll({ page: currentPage, per_page: perPage, search });
            const { data, meta } = response.data;
            setCompanies(Array.isArray(data) ? data : []);
            setTotalRows(meta?.total ?? 0);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
            setCompanies([]);
            setTotalRows(0);
        } finally {
            setIsLoading(false);
        }
    }, [perPage, search]);

    useEffect(() => { fetchCompanies(page); }, [page, fetchCompanies]);

    // ── Handlers ───────────────────────────────────────────────────────
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const handleView = (company: Company) => {
        setViewingCompany(company);
        setIsViewOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Company', 'Are you sure you want to delete this company?');
        if (!result.isConfirmed) return;
        try {
            await companyService.delete(id);
            showAlert('success', 'Deleted!', 'Company deleted successfully', 2000);
            fetchCompanies(page);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete company'));
        }
    };

    const getLogoUrl = (path: string | null) => {
        if (!path) return null;
        return path.startsWith('http') ? path : `${API_BASE_URL}/storage/${path}`;
    };

    // ── Table columns ──────────────────────────────────────────────────
    const columns: TableColumn<Company>[] = [
        {
            name: '#',
            selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
            width: '55px',
        },
        {
            name: 'Company',
            cell: (row) => (
                <div className="flex items-center gap-3 py-1">
                    {getLogoUrl(row.company_logo) ? (
                        <img src={getLogoUrl(row.company_logo)!} alt="logo" className="h-8 w-8 rounded object-contain border" />
                    ) : (
                        <div className="h-8 w-8 rounded bg-solarized-blue/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-solarized-blue" />
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-sm">{row.company_name}</p>
                        {row.organization?.name && (
                            <p className="text-xs text-muted-foreground">{row.organization.name}</p>
                        )}
                    </div>
                </div>
            ),
            sortable: true,
            selector: (row) => row.company_name,
            minWidth: '200px',
        },
        {
            name: 'Phone',
            selector: (row) => row.company_phone || '-',
            cell: (row) => (
                <span className="flex items-center gap-1 text-sm">
                    {row.company_phone ? <><Phone className="h-3 w-3 text-muted-foreground" />{row.company_phone}</> : '-'}
                </span>
            ),
        },
        {
            name: 'Email',
            selector: (row) => row.email || '-',
            cell: (row) => (
                <span className="flex items-center gap-1 text-sm">
                    {row.email ? <><Mail className="h-3 w-3 text-muted-foreground" />{row.email}</> : '-'}
                </span>
            ),
            minWidth: '180px',
        },
        {
            name: 'Website',
            selector: (row) => row.website || '-',
            cell: (row) => row.website ? (
                <a href={row.website} target="_blank" rel="noreferrer" className="text-solarized-blue hover:underline flex items-center gap-1 text-sm">
                    <Globe className="h-3 w-3" />{row.website.replace(/^https?:\/\//, '')}
                </a>
            ) : <span className="text-sm text-muted-foreground">-</span>,
        },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(row)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/companies/${row.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            ignoreRowClick: true,
            width: '80px',
        },
    ];

    const customStyles = {
        headRow: { style: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', minHeight: '52px' } },
        headCells: { style: { fontSize: '13px', fontWeight: '600', color: '#374151', paddingLeft: '16px' } },
    };

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Companies</h1>
                    <p className="text-sm text-muted-foreground">Manage companies under your organization</p>
                </div>
                <Button
                    className="bg-solarized-blue hover:bg-solarized-blue/90 shadow-sm h-9 px-3 shrink-0"
                    onClick={() => navigate('/companies/create')}
                >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Company
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search companies..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" variant="secondary">Search</Button>
                    </form>

                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={companies}
                            progressPending={isLoading}
                            pagination
                            paginationServer
                            paginationTotalRows={totalRows}
                            paginationPerPage={perPage}
                            paginationRowsPerPageOptions={[5, 10, 20, 50]}
                            paginationDefaultPage={page}
                            onChangePage={(p) => setPage(p)}
                            onChangeRowsPerPage={(pp) => { setPerPage(pp); setPage(1); }}
                            customStyles={customStyles}
                            highlightOnHover
                            responsive
                            noDataComponent={
                                <div className="text-center py-12 text-muted-foreground">
                                    <Building2 className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                    <p>No companies found</p>
                                </div>
                            }
                        />
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground">Loading...</div>
                        ) : companies.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Building2 className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>No companies found</p>
                            </div>
                        ) : (
                            <>
                                {companies.map((company) => (
                                    <div key={company.id} className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                {getLogoUrl(company.company_logo) ? (
                                                    <img src={getLogoUrl(company.company_logo)!} alt="logo" className="h-9 w-9 rounded object-contain border" />
                                                ) : (
                                                    <div className="h-9 w-9 rounded bg-solarized-blue/10 flex items-center justify-center">
                                                        <Building2 className="h-4 w-4 text-solarized-blue" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-sm">{company.company_name}</p>
                                                    {company.organization?.name && (
                                                        <p className="text-xs text-muted-foreground">{company.organization.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                            {company.company_phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />{company.company_phone}
                                                </div>
                                            )}
                                            {company.email && (
                                                <div className="flex items-center gap-1 truncate">
                                                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />{company.email}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-100">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(company)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/companies/${company.id}/edit`)}>
                                                <Edit className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(company.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {totalRows > perPage && (
                                    <div className="flex justify-between items-center py-3 border-t">
                                        <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                        </Button>
                                        <span className="text-xs text-muted-foreground">Page {page} / {Math.ceil(totalRows / perPage)}</span>
                                        <Button variant="ghost" size="sm" disabled={page >= Math.ceil(totalRows / perPage)} onClick={() => setPage(page + 1)}>
                                            Next <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* View Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[560px] max-sm:mx-3">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-solarized-blue" /> Company Details
                        </DialogTitle>
                        <DialogDescription>Full information about this company</DialogDescription>
                    </DialogHeader>

                    {viewingCompany && (
                        <div className="space-y-4 py-2">
                            {/* Logo + Name */}
                            <div className="flex items-center gap-4 pb-3 border-b">
                                {getLogoUrl(viewingCompany.company_logo) ? (
                                    <img src={getLogoUrl(viewingCompany.company_logo)!} alt="logo" className="h-14 w-14 rounded-lg object-contain border p-1" />
                                ) : (
                                    <div className="h-14 w-14 rounded-lg bg-solarized-blue/10 flex items-center justify-center">
                                        <Building2 className="h-7 w-7 text-solarized-blue" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-lg font-bold">{viewingCompany.company_name}</p>
                                    {viewingCompany.organization?.name && (
                                        <Badge variant="secondary" className="mt-1">{viewingCompany.organization.name}</Badge>
                                    )}
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Phone className="h-3 w-3" /> Phone
                                    </Label>
                                    <p className="text-sm mt-0.5">{viewingCompany.company_phone || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> Email
                                    </Label>
                                    <p className="text-sm mt-0.5">{viewingCompany.email || '-'}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Globe className="h-3 w-3" /> Website
                                    </Label>
                                    {viewingCompany.website ? (
                                        <a href={viewingCompany.website} target="_blank" rel="noreferrer" className="text-sm text-solarized-blue hover:underline mt-0.5 block">
                                            {viewingCompany.website}
                                        </a>
                                    ) : <p className="text-sm mt-0.5">-</p>}
                                </div>
                            </div>

                            {/* Addresses */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> Billing Address
                                    </Label>
                                    <p className="text-sm mt-0.5 whitespace-pre-line">{viewingCompany.address || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Truck className="h-3 w-3" /> Shipping Address
                                    </Label>
                                    <p className="text-sm mt-0.5 whitespace-pre-line">{viewingCompany.shipping_address || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                        <Button
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                            onClick={() => { setIsViewOpen(false); navigate(`/companies/${viewingCompany?.id}/edit`); }}
                        >
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
