import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Contact, PaginatedResponse } from "@/types";
import { contactApi } from "@/services/api";
import { showAlert, showConfirmDialog, getErrorMessage } from "@/lib/sweetalert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../../components/ui/dialog';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, UserCircle, Eye, Edit, Trash2, Phone, Mail, Star, User } from 'lucide-react';

export default function ContactList() {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [totalRows, setTotalRows] = useState(0);

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    const fetchContacts = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const params: Record<string, string | number> = {
                page: currentPage,
                per_page: perPage
            };
            if (search) params.search = search;

            const response = await contactApi.list(params);
            // contactApi.list returns r.data.data which is PaginatedResponse<Contact>
            const { data, total } = response as unknown as PaginatedResponse<Contact>;

            setContacts(data || []);
            setTotalRows(total || 0);
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
            setContacts([]);
            setTotalRows(0);
        } finally {
            setIsLoading(false);
        }
    }, [search, perPage]);

    useEffect(() => {
        fetchContacts(page);
    }, [page, fetchContacts]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchContacts(1);
    };

    const handlePageChange = (newPage: number) => setPage(newPage);

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const handleView = (contact: Contact) => {
        setSelectedContact(contact);
        setIsViewOpen(true);
    };

    const handleEdit = (contact: Contact) => {
        navigate(`/crm/contacts/${contact.id}/edit`);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            "Delete Contact?",
            "Are you sure you want to delete this contact? This action cannot be undone."
        );
        if (!result.isConfirmed) return;

        try {
            await contactApi.delete(id);
            showAlert("success", "Deleted!", "Contact has been deleted.", 2000);
            fetchContacts(page);
        } catch (error) {
            showAlert("error", "Error", getErrorMessage(error, "Failed to delete contact"));
        }
    };

    const getPrimaryPhone = (contact: Contact) => {
        const phones = contact.phones || [];
        return phones.find((p) => p.is_primary) || phones[0] || null;
    };

    const getPrimaryEmail = (contact: Contact) => {
        const emails = contact.emails || [];
        return emails.find((e) => e.is_primary) || emails[0] || null;
    };

    const columns: TableColumn<Contact>[] = [
        {
            name: 'Full Name',
            cell: (row) => <span className="font-medium">{row.full_name}</span>,
            sortable: true,
            minWidth: '200px',
        },
        {
            name: 'Company',
            selector: (row) => row.company_name || '-',
            sortable: true,
        },
        {
            name: 'Primary Phone',
            cell: (row) => {
                const phone = getPrimaryPhone(row);
                return phone ? (
                    <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{phone.phone_no}</span>
                        {phone.is_primary && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                    </div>
                ) : '-';
            },
        },
        {
            name: 'Primary Email',
            cell: (row) => {
                const email = getPrimaryEmail(row);
                return email ? (
                    <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{email.email}</span>
                        {email.is_primary && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                    </div>
                ) : '-';
            },
        },
        {
            name: 'Status',
            cell: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'Open' ? 'bg-green-100 text-green-700' :
                    row.status === 'Replied' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                    {row.status}
                </span>
            ),
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
                    <h1 className="text-2xl font-bold">Contacts</h1>
                    <p className="text-muted-foreground">Manage your CRM contacts</p>
                </div>
                <Link to="/crm/contacts/create">
                    <Button className="bg-solarized-blue hover:bg-solarized-blue/90">
                        <Plus className="mr-2 h-4 w-4" /> Add Contact
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-middle-y h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-10"
                                placeholder="Search contacts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit" variant="outline">Search</Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {!isLoading && contacts.length === 0 ? (
                        <div className="text-center py-12">
                            <UserCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p>No contacts found</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={contacts}
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
                        />
                    )}
                </CardContent>
            </Card>

            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-solarized-blue" />
                            Contact Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedContact && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Full Name</Label>
                                    <p className="text-base font-semibold text-solarized-blue">
                                        {selectedContact.salutation ? `${selectedContact.salutation} ` : ''}
                                        {selectedContact.full_name || `${selectedContact.first_name} ${selectedContact.last_name}`}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</Label>
                                    <p className="text-sm font-medium">{selectedContact.status || '—'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Gender</Label>
                                    <p className="text-sm font-medium">{selectedContact.gender || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Designation</Label>
                                    <p className="text-sm font-medium">{selectedContact.designation || '—'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phone Numbers</Label>
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 border-b">
                                                <tr>
                                                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Phone</th>
                                                    <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground w-16">Primary</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedContact.phones || []).length > 0 ? (
                                                    selectedContact.phones.map((p, i) => (
                                                        <tr key={i} className="border-b last:border-0">
                                                            <td className="px-2 py-1.5">{p.phone_no}</td>
                                                            <td className="px-2 py-1.5 text-center">
                                                                {p.is_primary && <Star className="h-4 w-4 mx-auto text-yellow-500 fill-current" />}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan={2} className="px-2 py-3 text-center text-muted-foreground">No phone numbers</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email Addresses</Label>
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 border-b">
                                                <tr>
                                                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Email</th>
                                                    <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground w-16">Primary</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedContact.emails || []).length > 0 ? (
                                                    selectedContact.emails.map((e, i) => (
                                                        <tr key={i} className="border-b last:border-0">
                                                            <td className="px-2 py-1.5 truncate max-w-[150px]">{e.email}</td>
                                                            <td className="px-2 py-1.5 text-center">
                                                                {e.is_primary && <Star className="h-4 w-4 mx-auto text-yellow-500 fill-current" />}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan={2} className="px-2 py-3 text-center text-muted-foreground">No email addresses</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {selectedContact.address && (
                                <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Address</Label>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedContact.address}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
