import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { staffService, settingsService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface SelectOption {
  id: number;
  title: string;
}

interface FieldErrors {
  [key: string]: string | undefined;
}

export default function StaffEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [divisions, setDivisions] = useState<SelectOption[]>([]);
  const [jobTitles, setJobTitles] = useState<SelectOption[]>([]);

  const [formData, setFormData] = useState({
    full_name: '',
    profile_image: null as File | null,
    profile_image_preview: '',
    email: '',
    personal_email: '',
    mobile_number: '',
    birth_date: '',
    gender: '',
    home_address: '',
    nationality: '',
    passport_number: '',
    country_code: '',
    region: '',
    city_name: '',
    postal_code: '',
    // biometric_id removed
    office_location_id: '',
    division_id: '',
    job_title_id: '',
    hire_date: '',
    employment_status: '',
    employment_type: '',
    compensation_type: '',
    base_salary: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, locRes, divRes, jobRes] = await Promise.all([
          staffService.getById(Number(id)),
          settingsService.getOfficeLocations(),
          settingsService.getDivisions(),
          settingsService.getJobTitles(),
        ]);

        const staff = staffRes.data.data;
        setFormData({
          full_name: staff.full_name || '',
          profile_image: null,
          profile_image_preview: staff.profile_image || '',
          email: staff.user?.email || '',
          personal_email: staff.personal_email || '',
          mobile_number: staff.mobile_number || '',
          birth_date: staff.birth_date ? staff.birth_date.slice(0, 10) : '',
          gender: staff.gender || '',
          home_address: staff.home_address || '',
          nationality: staff.nationality || '',
          passport_number: staff.passport_number || '',
          country_code: staff.country_code || '',
          region: staff.region || '',
          city_name: staff.city_name || '',
          postal_code: staff.postal_code || '',
          office_location_id: staff.office_location_id?.toString() || '',
          division_id: staff.division_id?.toString() || '',
          job_title_id: staff.job_title_id?.toString() || '',
          hire_date: staff.hire_date ? staff.hire_date.slice(0, 10) : '',
          employment_status: staff.employment_status || '',
          employment_type: staff.employment_type || '',
          compensation_type: staff.compensation_type || '',
          base_salary: staff.base_salary?.toString() || '',
          emergency_contact_name: staff.emergency_contact_name || '',
          emergency_contact_phone: staff.emergency_contact_phone || '',
          emergency_contact_relationship: staff.emergency_contact_relationship || '',
        });

        setLocations(locRes.data.data || []);
        setDivisions(divRes.data.data || []);
        setJobTitles(jobRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load staff data');
        showAlert('error', 'Error', 'Failed to load staff data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Helper to validate required fields
    const validateRequired = (field: keyof typeof formData, label: string) => {
      // @ts-ignore
      if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
        errors[field] = `${label} is required`;
        isValid = false;
      }
    };

    // Personal Information
    validateRequired('full_name', 'Full Name');

    // Note: Email is disabled in edit, but good to validate if it were editable or for consistency
    // validateRequired('email', 'Work Email'); 

    validateRequired('personal_email', 'Personal Email');
    if (formData.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personal_email)) {
      errors.personal_email = 'Please enter a valid email address';
      isValid = false;
    }

    validateRequired('mobile_number', 'Mobile Number');
    if (formData.mobile_number && !/^\d{10}$/.test(formData.mobile_number)) {
      errors.mobile_number = 'Mobile number must be exactly 10 digits';
      isValid = false;
    }

    validateRequired('birth_date', 'Date of Birth');
    validateRequired('gender', 'Gender');

    // Address
    validateRequired('home_address', 'Home Address');
    validateRequired('city_name', 'City');
    validateRequired('region', 'Region/State');
    validateRequired('country_code', 'Country Code');
    validateRequired('postal_code', 'Postal Code');
    validateRequired('nationality', 'Nationality');
    validateRequired('passport_number', 'Passport Number');

    // Employment Details
    validateRequired('office_location_id', 'Office Location');
    validateRequired('division_id', 'Department');
    validateRequired('job_title_id', 'Designation');
    validateRequired('hire_date', 'Hire Date');
    validateRequired('employment_status', 'Employment Status');
    validateRequired('employment_type', 'Employment Type');
    validateRequired('compensation_type', 'Compensation Type');
    validateRequired('base_salary', 'Base Salary');

    // Emergency Contact
    validateRequired('emergency_contact_name', 'Contact Name');
    validateRequired('emergency_contact_phone', 'Contact Phone');
    validateRequired('emergency_contact_relationship', 'Relationship');

    setFieldErrors(errors);

    if (!isValid) {
      // Focus first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();

      // Add all form fields except profile_image_preview
      Object.keys(formData).forEach(key => {
        if (key === 'profile_image_preview') return;

        const value = formData[key as keyof typeof formData];

        // Skip null/undefined/empty values except for profile_image which is a File
        if (value === null || value === undefined) return;
        if (typeof value === 'string' && value === '') return;

        formDataToSend.append(key, value as string | Blob);
      });

      await staffService.update(Number(id), formDataToSend);
      showAlert('success', 'Success!', 'Staff member updated successfully', 2000);
      navigate(`/staff/${id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errorMessage = getErrorMessage(err, 'Failed to update staff member');

      if (error.response?.data?.errors) {
        const apiErrors: FieldErrors = {};
        const errors = error.response.data.errors;
        Object.keys(errors).forEach(key => {
          apiErrors[key] = errors[key][0];
        });
        setFieldErrors(apiErrors);

        // Focus first API error
        const firstErrorField = Object.keys(apiErrors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }

      setError(errorMessage);
      showAlert('error', 'Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Edit Staff</h1>
          <p className="text-solarized-base01">Update employee information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic details about the employee</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className={fieldErrors.full_name ? 'text-red-500' : ''}>Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  aria-invalid={!!fieldErrors.full_name}
                />
                {renderError('full_name')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile_image">Profile Image</Label>
                <Input
                  id="profile_image"
                  name="profile_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Create preview
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({
                          ...formData,
                          profile_image: file,
                          profile_image_preview: reader.result as string
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {formData.profile_image_preview && (
                  <div className="mt-2">
                    <img
                      src={formData.profile_image_preview}
                      alt="Profile preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-solarized-blue"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="personal_email" className={fieldErrors.personal_email ? 'text-red-500' : ''}>Personal Email *</Label>
                <Input
                  id="personal_email"
                  name="personal_email"
                  type="email"
                  value={formData.personal_email}
                  onChange={handleChange}
                  placeholder="john.doe@gmail.com"
                  aria-invalid={!!fieldErrors.personal_email}
                />
                {renderError('personal_email')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email (Login)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Work email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_number" className={fieldErrors.mobile_number ? 'text-red-500' : ''}>Mobile Number *</Label>
                <Input
                  id="mobile_number"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="9876543210"
                  maxLength={10}
                  aria-invalid={!!fieldErrors.mobile_number}
                />
                {renderError('mobile_number')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date" className={fieldErrors.birth_date ? 'text-red-500' : ''}>Date of Birth *</Label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.birth_date}
                />
                {renderError('birth_date')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className={fieldErrors.gender ? 'text-red-500' : ''}>Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange('gender', value)}
                >
                  <SelectTrigger id="gender" aria-invalid={!!fieldErrors.gender}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderError('gender')}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="home_address" className={fieldErrors.home_address ? 'text-red-500' : ''}>Home Address *</Label>
                <Textarea
                  id="home_address"
                  name="home_address"
                  value={formData.home_address}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Flat 101, MG Road, Indiranagar"
                  aria-invalid={!!fieldErrors.home_address}
                />
                {renderError('home_address')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city_name" className={fieldErrors.city_name ? 'text-red-500' : ''}>City *</Label>
                <Input
                  id="city_name"
                  name="city_name"
                  value={formData.city_name}
                  onChange={handleChange}
                  placeholder="Bengaluru"
                  aria-invalid={!!fieldErrors.city_name}
                />
                {renderError('city_name')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="region" className={fieldErrors.region ? 'text-red-500' : ''}>Region/State *</Label>
                <Input
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="Karnataka"
                  aria-invalid={!!fieldErrors.region}
                />
                {renderError('region')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country_code" className={fieldErrors.country_code ? 'text-red-500' : ''}>Country Code *</Label>
                <Input
                  id="country_code"
                  name="country_code"
                  value={formData.country_code}
                  onChange={handleChange}
                  maxLength={3}
                  placeholder="IND"
                  aria-invalid={!!fieldErrors.country_code}
                />
                {renderError('country_code')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code" className={fieldErrors.postal_code ? 'text-red-500' : ''}>Postal Code *</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="560038"
                  aria-invalid={!!fieldErrors.postal_code}
                />
                {renderError('postal_code')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality" className={fieldErrors.nationality ? 'text-red-500' : ''}>Nationality *</Label>
                <Input
                  id="nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  placeholder="Indian"
                  aria-invalid={!!fieldErrors.nationality}
                />
                {renderError('nationality')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport_number" className={fieldErrors.passport_number ? 'text-red-500' : ''}>Passport Number *</Label>
                <Input
                  id="passport_number"
                  name="passport_number"
                  value={formData.passport_number}
                  onChange={handleChange}
                  placeholder="A12345678"
                  aria-invalid={!!fieldErrors.passport_number}
                />
                {renderError('passport_number')}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="office_location_id" className={fieldErrors.office_location_id ? 'text-red-500' : ''}>Office Location *</Label>
                <Select
                  value={formData.office_location_id}
                  onValueChange={(value) => handleSelectChange('office_location_id', value)}
                >
                  <SelectTrigger id="office_location_id" aria-invalid={!!fieldErrors.office_location_id}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>{loc.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError('office_location_id')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="division_id" className={fieldErrors.division_id ? 'text-red-500' : ''}>Division *</Label>
                <Select
                  value={formData.division_id}
                  onValueChange={(value) => handleSelectChange('division_id', value)}
                >
                  <SelectTrigger id="division_id" aria-invalid={!!fieldErrors.division_id}>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((div) => (
                      <SelectItem key={div.id} value={div.id.toString()}>{div.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError('division_id')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title_id" className={fieldErrors.job_title_id ? 'text-red-500' : ''}>Job Title *</Label>
                <Select
                  value={formData.job_title_id}
                  onValueChange={(value) => handleSelectChange('job_title_id', value)}
                >
                  <SelectTrigger id="job_title_id" aria-invalid={!!fieldErrors.job_title_id}>
                    <SelectValue placeholder="Select job title" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((job) => (
                      <SelectItem key={job.id} value={job.id.toString()}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError('job_title_id')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date" className={fieldErrors.hire_date ? 'text-red-500' : ''}>Hire Date *</Label>
                <Input
                  id="hire_date"
                  name="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.hire_date}
                />
                {renderError('hire_date')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment_status" className={fieldErrors.employment_status ? 'text-red-500' : ''}>Employment Status *</Label>
                <Select
                  value={formData.employment_status}
                  onValueChange={(value) => handleSelectChange('employment_status', value)}
                >
                  <SelectTrigger id="employment_status" aria-invalid={!!fieldErrors.employment_status}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
                {renderError('employment_status')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment_type" className={fieldErrors.employment_type ? 'text-red-500' : ''}>Employment Type *</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value) => handleSelectChange('employment_type', value)}
                >
                  <SelectTrigger id="employment_type" aria-invalid={!!fieldErrors.employment_type}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                {renderError('employment_type')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="compensation_type" className={fieldErrors.compensation_type ? 'text-red-500' : ''}>Compensation Type *</Label>
                <Select
                  value={formData.compensation_type}
                  onValueChange={(value) => handleSelectChange('compensation_type', value)}
                >
                  <SelectTrigger id="compensation_type" aria-invalid={!!fieldErrors.compensation_type}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
                {renderError('compensation_type')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_salary" className={fieldErrors.base_salary ? 'text-red-500' : ''}>Base Salary *</Label>
                <Input
                  id="base_salary"
                  name="base_salary"
                  type="number"
                  value={formData.base_salary}
                  onChange={handleChange}
                  placeholder="50000"
                  aria-invalid={!!fieldErrors.base_salary}
                />
                {renderError('base_salary')}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name" className={fieldErrors.emergency_contact_name ? 'text-red-500' : ''}>Contact Name *</Label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  aria-invalid={!!fieldErrors.emergency_contact_name}
                />
                {renderError('emergency_contact_name')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone" className={fieldErrors.emergency_contact_phone ? 'text-red-500' : ''}>Contact Phone *</Label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="9876543210"
                  aria-invalid={!!fieldErrors.emergency_contact_phone}
                />
                {renderError('emergency_contact_phone')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_relationship" className={fieldErrors.emergency_contact_relationship ? 'text-red-500' : ''}>Relationship *</Label>
                <Input
                  id="emergency_contact_relationship"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  placeholder="Spouse"
                  aria-invalid={!!fieldErrors.emergency_contact_relationship}
                />
                {renderError('emergency_contact_relationship')}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
