import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import {
  User,
  Mail,
  Building,
  Building2,
  Calendar,
  Shield,
  Phone,
  MapPin,
  Briefcase,
  Map,
  Lock,
  Wallet,
  Flag,
  Award,
  Users,
  Hash
} from "lucide-react";
import { authService, companyService, organizationService } from "../../services/api";

const API_BASE_URL = 'http://127.0.0.1:8000';

interface StaffMemberData {
  id: number;
  full_name: string;
  profile_image?: string;
  personal_email: string;
  mobile_number?: string;
  staff_code: string;
  gender?: string;
  birth_date?: string;
  home_address?: string;
  city_name?: string;
  nationality?: string;
  passport_number?: string;
  country_code?: string;
  region?: string;
  postal_code?: string;
  hire_date: string;
  employment_status: string;
  employment_type: string;
  compensation_type?: string;
  base_salary?: number;
  biometric_id?: string;
  job_title?: string;
  division?: string;
  office_location?: string;
  office_location_id?: number;
  division_id?: number;
  job_title_id?: number;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_branch?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

interface ProfileResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    role_display: string;
    roles: string[];
    primary_role: string;
    primary_role_icon: string;
    primary_role_hierarchy: number;
    permissions?: string[];
    staff_member_id: number | null;
    org_id: number | null;
    company_id: number | null;
    organization_name?: string;
    company_name?: string;
    staff_member?: StaffMemberData;
  };
}

export default function Profile() {
  const [user, setUser] = useState<ProfileResponse['user'] | null>(null);
  const [companyCount, setCompanyCount] = useState<number | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [allCompaniesCount, setAllCompaniesCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await authService.getProfile();
        const userData = response.data.data.user;
        setUser(userData);

        // Fetch company count if user is Organization Admin
        if (userData.role === 'org' && userData.org_id) {
          try {
            const companiesRes = await companyService.getAll({ org_id: userData.org_id });
            const count = companiesRes.data.meta?.total ?? companiesRes.data.data?.length ?? companiesRes.data.length ?? 0;
            setCompanyCount(count);
          } catch (err) {
            console.error("Failed to fetch companies count:", err);
          }
        }

        // Fetch stats if user is Super Admin
        if (userData.role === 'admin') {
          try {
            const [orgsRes, companiesRes] = await Promise.all([
              organizationService.getAll(),
              companyService.getAll()
            ]);

            const orgsCount = orgsRes.data.meta?.total ?? orgsRes.data.data?.length ?? orgsRes.data.length ?? 0;
            const allCompaniesCount = companiesRes.data.meta?.total ?? companiesRes.data.data?.length ?? companiesRes.data.length ?? 0;

            setOrgCount(orgsCount);
            setAllCompaniesCount(allCompaniesCount);
          } catch (err) {
            console.error("Failed to fetch admin stats:", err);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);



  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Prepend backend URL if it's a relative path
    return `${API_BASE_URL}${imagePath}`;
  };

  const profileImageUrl = getImageUrl(user?.staff_member?.profile_image);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="h-96 w-full lg:col-span-4 rounded-xl" />
          <Skeleton className="h-96 w-full lg:col-span-8 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-in fade-in duration-500">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

        {/* Left Sidebar - Quick Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={profileImageUrl || ''} alt="Profile" className="object-cover" />
                  <AvatarFallback className="text-4xl bg-solarized-blue text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.staff_member?.full_name || user?.name}</h1>
              <p className="text-muted-foreground font-medium mb-4">{user?.staff_member?.job_title || user?.primary_role}</p>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 uppercase tracking-wider text-xs">
                  {user?.role_display}
                </Badge>
                {user?.organization_name && (
                  <Badge variant="outline" className="border-gray-200 text-gray-600">
                    {user.organization_name}
                  </Badge>
                )}
              </div>

              <Separator className="my-6" />

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate" title={user?.email}>{user?.email}</span>
                </div>
                {user?.staff_member?.mobile_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{user.staff_member.mobile_number}</span>
                  </div>
                )}
                {user?.staff_member?.city_name && (
                  <div className="flex items-center gap-3 text-sm">
                    <Map className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{user.staff_member.city_name}</span>
                  </div>
                )}
                {user?.company_name && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{user.company_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {user?.staff_member && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-gray-900">Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Staff Code</span>
                  <span className="font-mono text-base font-bold tracking-widest text-gray-900">{user?.staff_member?.staff_code}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Hired On</span>
                  <span className="font-medium text-sm text-gray-900">
                    {user?.staff_member?.hire_date
                      ? new Date(user.staff_member.hire_date).toLocaleDateString(undefined, { dateStyle: 'long' })
                      : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Content - Detailed Tabs */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className={`grid w-full ${user?.staff_member ? 'grid-cols-3' : (user?.organization_name || user?.company_name ? 'grid-cols-2' : 'grid-cols-2')} bg-white shadow-sm border p-1 h-auto`}>
              <TabsTrigger value="overview" className="py-2.5">Overview</TabsTrigger>
              <TabsTrigger value="personal" className="py-2.5">Personal</TabsTrigger>
              {user?.staff_member && <TabsTrigger value="employment" className="py-2.5">Employment</TabsTrigger>}
              {/* {(!user?.staff_member && (user?.organization_name || user?.company_name)) && (
                <TabsTrigger value="organization" className="py-2.5">Organization</TabsTrigger>
              )} */}
              {/* <TabsTrigger value="security" className="py-2.5">Security</TabsTrigger> */}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Profile Overview</CardTitle>
                  <CardDescription>A summary of your account status and role.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                        <Shield className="h-8 w-8 text-blue-500 mb-2" />
                        <span className="text-sm text-muted-foreground">System Role</span>
                        <span className="font-bold text-lg">{user?.role_display}</span>
                      </div>

                      {user?.staff_member ? (
                        <>
                          <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                            <Award className="h-8 w-8 text-amber-500 mb-2" />
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge className={
                              user?.staff_member?.employment_status === 'active'
                                ? "bg-green-100 text-green-700 hover:bg-green-100 mt-1"
                                : "bg-red-100 text-red-700 hover:bg-red-100 mt-1"
                            }>
                              {(user?.staff_member?.employment_status || 'Active').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                            <Briefcase className="h-8 w-8 text-purple-500 mb-2" />
                            <span className="text-sm text-muted-foreground">Type</span>
                            <span className="font-bold">{user?.staff_member?.employment_type?.replace('_', ' ').toUpperCase() || 'Full Time'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          {user?.role === 'admin' ? (
                            <>
                              <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                                <Building className="h-8 w-8 text-indigo-600 mb-2" />
                                <span className="text-sm text-muted-foreground">Organizations</span>
                                <span className="font-bold text-lg">{orgCount ?? 0}</span>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                                <Building2 className="h-8 w-8 text-blue-600 mb-2" />
                                <span className="text-sm text-muted-foreground">Companies</span>
                                <span className="font-bold text-lg">{allCompaniesCount ?? 0}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                                <Building className="h-8 w-8 text-gray-500 mb-2" />
                                <span className="text-sm text-muted-foreground">Organization</span>
                                <span className="font-bold truncate w-full">{user?.organization_name || 'N/A'}</span>
                              </div>
                              {(companyCount === null) && (
                                <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                                  <Building2 className="h-8 w-8 text-indigo-600 mb-2" />
                                  <span className="text-sm text-muted-foreground">Company</span>
                                  <span className="font-bold truncate w-full">{user?.company_name || 'N/A'}</span>
                                </div>
                              )}
                              {companyCount !== null && (
                                <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                                  <Building className="h-8 w-8 text-amber-500 mb-2" />
                                  <span className="text-sm text-muted-foreground">Total Companies</span>
                                  <span className="font-bold text-lg">{companyCount}</span>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personal Details Tab */}
            <TabsContent value="personal" className="mt-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Basic contact details and personal information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {user?.staff_member ? (
                    /* Full Staff Personal Details */
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.staff_member.full_name}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Personal Email</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.staff_member.personal_email || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium capitalize">{user.staff_member.gender || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {user.staff_member.birth_date
                              ? new Date(user.staff_member.birth_date).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Nationality</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Flag className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.staff_member.nationality || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Home Address</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Map className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {[
                              user.staff_member.home_address,
                              user.staff_member.city_name,
                              user.staff_member.region,
                              user.staff_member.postal_code
                            ].filter(Boolean).join(', ') || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Minimal User Personal Details */
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user?.name}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user?.email}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium capitalize">{user?.role_display}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {user?.staff_member?.emergency_contact_name && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Emergency Contact
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="p-3 bg-red-50 rounded-md border border-red-100">
                            <span className="text-xs text-muted-foreground block">Name</span>
                            <span className="font-medium text-sm">{user.staff_member.emergency_contact_name}</span>
                          </div>
                          <div className="p-3 bg-red-50 rounded-md border border-red-100">
                            <span className="text-xs text-muted-foreground block">Relationship</span>
                            <span className="font-medium text-sm">{user.staff_member.emergency_contact_relationship || 'N/A'}</span>
                          </div>
                          <div className="p-3 bg-red-50 rounded-md border border-red-100">
                            <span className="text-xs text-muted-foreground block">Phone</span>
                            <span className="font-medium text-sm">{user.staff_member.emergency_contact_phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Employment Tab - Only for Staff */}
            {user?.staff_member && (
              <TabsContent value="employment" className="mt-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Employment Details</CardTitle>
                    <CardDescription>Specifics regarding your job role and compensation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Department / Division</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.staff_member.division || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.staff_member.job_title || 'N/A'}</span>
                        </div>
                      </div>
                      {/* <div className="space-y-2">
                        <Label>Manager / Supervisor</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">N/A</span>
                        </div>
                      </div> */}
                      <div className="space-y-2">
                        <Label>Compensation Type</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium capitalize">{user.staff_member.compensation_type || 'N/A'}</span>
                        </div>
                      </div>
                      {user.staff_member.base_salary && (
                        <div className="space-y-2">
                          <Label>Base Salary</Label>
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                            <span className="text-muted-foreground text-sm font-bold">$</span>
                            <span className="text-sm font-medium">{user.staff_member.base_salary.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Organization Tab - For Non-Staff */}
            {/* {(!user?.staff_member && (user?.organization_name || user?.company_name)) && (
              <TabsContent value="organization" className="mt-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                    <CardDescription>Details about your affiliated organization and company.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.organization_name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.company_name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Organization ID</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.org_id || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Company ID</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.company_id || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )} */}

            {/* Security/Settings Tab */}
            {/* <TabsContent value="security" className="mt-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Manage your password and security preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-orange-50/50 border-orange-100 mb-4">
                    <h4 className="font-semibold text-orange-800 text-sm mb-1 flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Change Password
                    </h4>
                    <p className="text-xs text-orange-600">
                      Ensure your account is using a long, random password to stay secure.
                    </p>
                  </div>

                  <div className="grid gap-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                    <Button className="w-full sm:w-auto mt-2">
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent> */}

          </Tabs>
        </div>
      </div>
    </div>
  );
}

