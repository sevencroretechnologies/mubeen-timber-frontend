import { useState, useEffect } from 'react';
import { documentLocationService, organizationService, companyService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    MapPin,
} from 'lucide-react';

interface DocumentLocation {
    id: number;
    location_type: number;
    org_id?: number;
    company_id?: number;
    organization?: { name: string };
    company?: { company_name: string };
}

interface Organization {
    id: number;
    name: string;
}

interface Company {
    id: number;
    company_name: string;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

const LOCATION_TYPES = [
    { value: 1, label: 'Local' },
    { value: 2, label: 'Wasabi' },
    { value: 3, label: 'AWS' },
];

export default function DocumentLocationList() {
    const [documentLocations, setDocumentLocations] = useState<DocumentLocation[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<DocumentLocation | null>(null);
    const [formData, setFormData] = useState({
        location_type: '',
        org_id: '',
        company_id: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDocumentLocations();
        fetchOrganizations();
        fetchCompanies();
    }, [page, search]);

    const fetchOrganizations = async () => {
        try {
            const response = await organizationService.getAll({});
            const payload = response.data.data;
            if (Array.isArray(payload)) {
                setOrganizations(payload);
            } else if (payload && Array.isArray(payload.data)) {
                setOrganizations(payload.data);
            }
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await companyService.getAll({});
            const payload = response.data.data;
            if (Array.isArray(payload)) {
                setCompanies(payload);
            } else if (payload && Array.isArray(payload.data)) {
                setCompanies(payload.data);
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        }
    };

    const fetchDocumentLocations = async () => {
        setIsLoading(true);
        try {
            const response = await documentLocationService.getAll({ page, search });
            const payload = response.data.data;

            if (Array.isArray(payload)) {
                setDocumentLocations(payload);
                setMeta(null);
            } else if (payload && Array.isArray(payload.data)) {
                setDocumentLocations(payload.data);
                setMeta({
                    current_page: payload.current_page,
                    last_page: payload.last_page,
                    per_page: payload.per_page,
                    total: payload.total,
                });
            } else {
                setDocumentLocations([]);
                setMeta(null);
            }
        } catch (error) {
            console.error('Failed to fetch document locations:', error);
            setDocumentLocations([]);
            // showAlert('error', 'Error', 'Failed to fetch document locations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (location: DocumentLocation) => {
        setEditingLocation(location);
        setFormData({
            location_type: String(location.location_type),
            org_id: location.org_id ? String(location.org_id) : '',
            company_id: location.company_id ? String(location.company_id) : '',
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Document Location', 'Are you sure you want to delete this document location?');
        if (!result.isConfirmed) return;
        try {
            await documentLocationService.delete(id);
            showAlert('success', 'Deleted!', 'Document location deleted successfully', 2000);
            fetchDocumentLocations();
        } catch (error) {
            console.error('Failed to delete document location:', error);
            const errorMessage = getErrorMessage(error, 'Failed to delete document location');
            showAlert('error', 'Error', errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({
            location_type: '',
            org_id: '',
            company_id: '',
        });
        setEditingLocation(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: Record<string, unknown> = {
                location_type: Number(formData.location_type),
            };
            if (formData.org_id) payload.org_id = Number(formData.org_id);
            if (formData.company_id) payload.company_id = Number(formData.company_id);

            if (editingLocation) {
                await documentLocationService.update(editingLocation.id, payload);
                showAlert('success', 'Success', 'Document location updated successfully', 2000);
            } else {
                await documentLocationService.create(payload);
                showAlert('success', 'Success', 'Document location created successfully', 2000);
            }
            setIsDialogOpen(false);
            resetForm();
            fetchDocumentLocations();
        } catch (error) {
            console.error('Failed to save document location:', error);
            const errorMessage = getErrorMessage(error, 'Failed to save document location');
            showAlert('error', 'Error', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getLocationTypeLabel = (value: number) => {
        return LOCATION_TYPES.find(type => type.value === value)?.label || String(value);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Document Locations</h1>
                    <p className="text-solarized-base01">Manage document storage locations</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                            onClick={() => {
                                resetForm();
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Document Location
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingLocation ? 'Edit Document Location' : 'Add New Document Location'}</DialogTitle>
                            <DialogDescription>
                                {editingLocation ? 'Update the document location details.' : 'Add a new document location.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="location_type">Location Type *</Label>
                                    <Select
                                        value={formData.location_type}
                                        onValueChange={(value) => setFormData({ ...formData, location_type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LOCATION_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={String(type.value)}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org_id">Organization (Optional)</Label>
                                    <Select
                                        value={formData.org_id}
                                        onValueChange={(value) => setFormData({ ...formData, org_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select organization" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {organizations.map((org) => (
                                                <SelectItem key={org.id} value={String(org.id)}>
                                                    {org.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_id">Company (Optional)</Label>
                                    <Select
                                        value={formData.company_id}
                                        onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select company" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {companies.map((company) => (
                                                <SelectItem key={company.id} value={String(company.id)}>
                                                    {company.company_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : (editingLocation ? 'Update' : 'Create')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-solarized-base01" />
                            <Input
                                placeholder="Search document locations..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : documentLocations.length === 0 ? (
                        <div className="text-center py-12">
                            <MapPin className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No document locations found</h3>
                            <p className="text-solarized-base01 mt-1">Get started by adding your first document location.</p>
                            <Button
                                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={() => {
                                    resetForm();
                                    setIsDialogOpen(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Document Location
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Location Type</TableHead>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documentLocations.map((location) => (
                                            <TableRow key={location.id}>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {getLocationTypeLabel(location.location_type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{location.organization?.name || '-'}</TableCell>
                                                <TableCell>{location.company?.company_name || '-'}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(location)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(location.id)}
                                                                className="text-solarized-red"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {meta && meta.last_page > 1 && (
                                <div className="flex items-center justify-between mt-6">
                                    <p className="text-sm text-solarized-base01">
                                        Showing {(meta.current_page - 1) * meta.per_page + 1} to{' '}
                                        {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} results
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <span className="text-sm text-solarized-base01">
                                            Page {meta.current_page} of {meta.last_page}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page + 1)}
                                            disabled={page === meta.last_page}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
