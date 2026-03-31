import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { staffService, documentService, documentTypeService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
const API_BASE_URL = 'http://127.0.0.1:8000';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building,
  Upload,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import { Eye } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';

/* =========================
   ✅ CORRECTED INTERFACE
========================= */
interface StaffMember {
  id: number;
  full_name: string;
  profile_image?: string;
  personal_email?: string;
  work_email?: string;
  mobile_number?: string;
  birth_date?: string;
  gender?: string;

  home_address?: string;
  city_name?: string;
  region?: string;
  country_code?: string;
  postal_code?: string;

  job_title?: { title: string } | null;
  division?: { title: string } | null;
  office_location?: { title: string } | null;

  employment_status: string;
  employment_type?: string;
  hire_date?: string;
  base_salary?: number;
  compensation_type?: string;

  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

interface DocumentItem {
  id: number;
  document_name: string;
  original_name?: string; // Fallback
  created_at: string;

  // ✅ FIXED: backend sends "type"
  type?: {
    id: number;
    title: string;
  };
  document_type?: { id: number; title: string };
  temporary_url?: string;
  storage_type?: string;
}

interface DocumentType {
  id: number;
  title: string;
  notes?: string;
}

export default function StaffProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<DocumentItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await staffService.getById(Number(id));
        setStaff(response.data.data);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        showAlert('error', 'Error', 'Failed to fetch staff details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, [id]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // Fetch documents for this staff member (owner_type=employee)
        const response = await documentService.getAll({
          owner_type: 'employee',
          owner_id: Number(id),
          per_page: 100
        });
        // The API returns { success: true, data: [...] } or just [...] depend on implementation
        // Controller seems to return { success: true, data: [...] }
        const docs = response.data.data || [];
        setFiles(docs);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      }
    };
    const fetchDocTypes = async () => {
      try {
        const response = await documentTypeService.getAll({ page: 1, per_page: 100 });
        const types = response.data.data || [];
        setDocumentTypes(types);
      } catch (error) {
        console.error('Failed to fetch document types:', error);
      }
    };
    if (id) {
      fetchDocuments();
      fetchDocTypes();
    }
  }, [id]);

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedType) return;
    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type_id', selectedType);
      formData.append('owner_type', 'employee');
      formData.append('owner_id', String(id));
      // Optional: document_name defaults to file name if not provided

      await documentService.upload(Number(id), formData);

      showAlert('success', 'Success!', 'Document uploaded successfully', 2000);

      // Refresh list
      const response = await documentService.getAll({
        owner_type: 'employee',
        owner_id: Number(id),
        per_page: 100
      });
      setFiles(response.data.data || []);

      setSelectedFile(null);
      setSelectedType('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: unknown) {
      console.error('Failed to upload document:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to upload document'));
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileDelete = async (docId: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this document?'
    );

    if (!result.isConfirmed) return;

    try {
      await documentService.delete(docId);
      showAlert('success', 'Deleted!', 'Document deleted successfully', 2000);
      setFiles(files.filter(f => f.id !== docId));
    } catch (error: unknown) {
      console.error('Failed to delete document:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete document'));
    }
  };

  const handleDownloadDocument = async (file: DocumentItem) => {
    try {
      // Try to use temporary_url first (for S3/Wasabi presigned URLs from list)
      if (file.temporary_url) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = file.temporary_url;
        link.download = file.document_name || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fallback to backend download endpoint
      const response = await fetch(`${API_BASE_URL}/api/documents/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const contentType = response.headers.get('content-type');

      // Check if response is JSON (S3/Wasabi returns JSON with download_url)
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && data.download_url) {
          // Use the download_url from the response
          const link = document.createElement('a');
          link.href = data.download_url;
          link.download = file.document_name || 'document';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }

      // For local files, download the blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.document_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Failed to download document:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to download document'));
    }
  };



  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  // const handleViewDocument = async (file: DocumentItem) => {
  //   try {
  //     // If backend already sent URL (index API)
  //     if (file.temporary_url) {
  //       window.open(file.temporary_url, '_blank');
  //       return;
  //     }

  //     // Fallback to view API
  //     const response = await documentService.view(file.id);
  //     const viewUrl = response.data.view_url;

  //     window.open(viewUrl, '_blank');
  //   } catch (error) {
  //     showAlert('error', 'Error', 'Unable to view document');
  //   }
  // };

  const handleViewDocument = (file: DocumentItem) => {
    window.open(
      `${API_BASE_URL}/api/documents/${file.id}/view`,
      '_blank'
    );
  };


  if (!staff) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Staff member not found</h2>
        <Button onClick={() => navigate('/staff')} className="mt-4">
          Back to Staff List
        </Button>
      </div>
    );
  }
  const uploadedDocumentTypes = Array.from(
    new Set(
      files
        .map(file => file.type?.title)
        .filter(Boolean)
    )
  );
  const groupedFiles = files.reduce<Record<string, DocumentItem[]>>(
    (acc, file) => {
      const type = file.type?.title || 'Uncategorized';
      if (!acc[type]) acc[type] = [];
      acc[type].push(file);
      return acc;
    },
    {}
  );
  // Helper function to get full image URL
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return undefined;

    if (imagePath.startsWith('http')) return imagePath;

    return `http://127.0.0.1:8000${imagePath}`;
  }

  const profileImageUrl = getImageUrl(staff?.profile_image);

  return (

    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
            <AvatarImage
              src={profileImageUrl || ''}
              alt="Profile"
              className="object-cover"
            />
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{staff.full_name}</h1>
            <p className="text-solarized-base01">
              {staff.job_title?.title || 'No job title'}
            </p>
          </div>
        </div>

        <Link to={`/staff/${id}/edit`}>
          <Button type="submit" className='bg-solarized-blue hover:bg-solarized-blue/90'>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* QUICK INFO */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={staff.work_email || staff.personal_email || 'Not provided'} />
            <InfoRow icon={Phone} label="Phone" value={staff.mobile_number || 'Not provided'} />
            <InfoRow icon={Building} label="Department" value={staff.division?.title || 'Not assigned'} />
            <InfoRow icon={MapPin} label="Location" value={staff.office_location?.title || 'Not assigned'} />

            <StatusBadge status={staff.employment_status} />
          </CardContent>
        </Card>

        {/* TABS */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* PERSONAL */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Personal Email" value={staff.personal_email} />
                  <Field label="Date of Birth" value={staff.birth_date} />
                  <Field label="Gender" value={staff.gender} />
                  <div className="sm:col-span-2">
                    <Field
                      label="Address"
                      value={[
                        staff.home_address,
                        staff.city_name,
                        staff.region,
                        staff.country_code,
                        staff.postal_code,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Not provided'}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EMPLOYMENT */}
            <TabsContent value="employment">
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Job Title" value={staff.job_title?.title} />
                  <Field label="Division" value={staff.division?.title} />
                  <Field label="Office Location" value={staff.office_location?.title} />
                  <Field label="Hire Date" value={staff.hire_date} />
                  <Field label="Employment Type" value={staff.employment_type?.replace('_', ' ')} />
                  <Field label="Compensation Type" value={staff.compensation_type} />
                  <Field label="Base Salary" value={staff.base_salary ? `₹${staff.base_salary}` : 'Not provided'} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* EMERGENCY */}
            <TabsContent value="emergency">
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" value={staff.emergency_contact_name} />
                  <Field label="Phone" value={staff.emergency_contact_phone} />
                  <Field label="Relationship" value={staff.emergency_contact_relationship} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* DOCUMENTS */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Upload and manage staff documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Upload New Document</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="document-type">Document Type</Label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((type) => (
                              <SelectItem key={type.id} value={String(type.id)}>
                                {type.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file-upload">File</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleFileUpload}
                      disabled={!selectedFile || !selectedType || isUploadingFile}
                    >
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Document
                        </>
                      )}
                    </Button>
                  </div>

                  {files.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 opacity-50" />
                      <p className="mt-2 text-solarized-base01">No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <h4 className="font-medium">Uploaded Documents</h4>

                        {/* {uploadedDocumentTypes.length > 0 && (
                          <p className="text-sm font-semibold text-solarized-blue">
                            Document Type: {uploadedDocumentTypes.join(', ')}
                          </p>
                        )} */}

                      </div>
                      <div className="border rounded-lg divide-y">

                        {/* HEADER */}
                        <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-sm font-semibold text-solarized-base01">
                          <div className="col-span-3">Document Type</div>
                          <div className="col-span-9">Documents</div>
                        </div>

                        {/* BODY */}
                        {Object.entries(groupedFiles).map(([type, docs]) => (
                          <div key={type} className="grid grid-cols-12 px-4 py-3 gap-4">

                            {/* LEFT COLUMN – DOCUMENT TYPE */}
                            <div className="col-span-3">
                              <span className="inline-block text-sm font-semibold text-solarized-blue">
                                {type}
                              </span>
                              <p className="text-xs text-solarized-base01">
                                {docs.length} file{docs.length > 1 ? 's' : ''}
                              </p>
                            </div>

                            {/* RIGHT COLUMN – FILE LIST */}
                            <div className="col-span-9 space-y-3">
                              {docs.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between border rounded-md px-3 py-2"
                                >
                                  <div className="flex items-start gap-3">
                                    <FileText className="h-5 w-5 text-solarized-blue mt-1" />

                                    <div>
                                      <p className="font-medium">
                                        {file.document_name || file.original_name}
                                      </p>
                                      <p className="text-xs text-solarized-base01">
                                        Uploaded on {new Date(file.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>

                                  {/* ACTIONS */}
                                  <div className="flex items-center gap-2">
                                    {/* VIEW */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleViewDocument(file)}
                                      title="View document"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>

                                    {/* DELETE */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleFileDelete(file.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-solarized-red" />
                                    </Button>
                                  </div>

                                </div>
                              ))}
                            </div>

                          </div>
                        ))}
                      </div>

                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div >
  );
}

/* =========================
   REUSABLE COMPONENTS
========================= */

function InfoRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-solarized-blue" />
      <div>
        <p className="text-sm text-solarized-base01">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, value }: any) {
  return (
    <div>
      <p className="text-sm text-solarized-base01">{label}</p>
      <p className="font-medium">{value || 'Not provided'}</p>
    </div>
  );
}
