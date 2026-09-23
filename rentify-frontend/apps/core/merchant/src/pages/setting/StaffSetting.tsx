import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Mail,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth, useTranslation } from '@rentify/utils';
import {
  useGetStaffListQuery,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useResendStaffOtpMutation,
  useCreateStaffMutation,
} from '@rentify/apis';
import StaffInviteForm from './components/StaffInviteForm';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Badge } from '@rentify/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rentify/shared/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rentify/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@rentify/shared/ui/tooltip';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  role?: string;
  permissions: string[];
  isActive: boolean;
}

interface PermissionsLabels {
  [key: string]: string;
}

const permissionsLabels: PermissionsLabels = {
  manage_products: 'Products',
  manage_orders: 'Orders',
  manage_invoices: 'Invoices',
  manage_pos: 'POS',
  manage_analytics: 'Analytics',
  manage_settings: 'Settings',
  manage_staff: 'Staff',
};

const StaffSetting: React.FC = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  
    const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  const userId = websiteData.userId;

  const {
    data: staffList = [],
    isLoading,
    isError,
    refetch,
  } = useGetStaffListQuery({ websiteId }, { refetchOnMountOrArgChange: true });
  
  const [createStaff] = useCreateStaffMutation();
  const [updateStaff] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  const [resendOtp] = useResendStaffOtpMutation();

  const handleOpenDialog = (staff: StaffMember | null = null): void => {
    setCurrentStaff(staff);
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
    setCurrentStaff(null);
  };

  const handleDelete = async (staffId: string): Promise<void> => {
    setDeletingId(staffId);
    try {
      await deleteStaff(staffId).unwrap();
      toast.success(t('dashboard.settings.staff_deleted'));
    } catch (err: any) {
      toast.error(err.data?.error || t('dashboard.settings.staff_delete_failed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleResendInvite = async (email: string): Promise<void> => {
    setResendingEmail(email);
    try {
      await resendOtp({ email }).unwrap();
      toast.success(t('dashboard.settings.invitation_resent'));
    } catch (err: any) {
      toast.error(err.data?.error || t('dashboard.settings.invitation_resend_failed'));
    } finally {
      setResendingEmail(null);
    }
  };

  const filteredStaff = staffList.filter((staff: StaffMember) => {
    const matchesSearch =
      staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && staff.isActive) ||
      (statusFilter === 'inactive' && !staff.isActive);

    return matchesSearch && matchesStatus;
  });

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <SettingsLayout
      title="Staff Management"
      description="Manage your team members and their permissions"
      icon={<Users className="h-5 w-5" />}
    >
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
              <CardDescription>
                Invite and manage staff members with specific permissions
              </CardDescription>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Staff Member
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search staff members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Staff Table */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Users className="mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold">No staff members found</h3>
              <p className="mb-6 text-gray-500 max-w-md">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Get started by inviting your first team member'}
              </p>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Staff Member
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold">Staff Member</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Permissions</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff: StaffMember) => (
                    <TableRow key={staff.id} className="border-b hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={staff.avatar} />
                            <AvatarFallback className="bg-blue-100 font-medium text-blue-600">
                              {getInitials(staff.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{staff.name}</p>
                            <p className="text-sm text-gray-500">{staff.role || 'Staff Member'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-gray-900">{staff.email}</p>
                          <p className="text-sm text-gray-500">
                            {staff.phoneNumber || 'No phone number'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staff.permissions?.slice(0, 3).map((permission: string) => (
                            <Badge 
                              key={permission} 
                              variant="secondary" 
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {permissionsLabels[permission] || permission}
                            </Badge>
                          ))}
                          {staff.permissions?.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs cursor-help">
                                  +{staff.permissions.length - 3}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1 min-w-[120px]">
                                  {staff.permissions.slice(3).map((p: string) => (
                                    <div key={p} className="text-xs text-gray-600">
                                      {permissionsLabels[p] || p}
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {staff.isActive ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <Badge 
                                variant="outline" 
                                className="border-green-200 bg-green-50 text-green-700 text-xs"
                              >
                                Active
                              </Badge>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <Badge 
                                variant="outline" 
                                className="border-red-200 bg-red-50 text-red-700 text-xs"
                              >
                                Inactive
                              </Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => handleOpenDialog(staff)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleResendInvite(staff.email)}
                              disabled={resendingEmail === staff.email}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Mail className="h-4 w-4" />
                              {resendingEmail === staff.email ? 'Sending...' : 'Resend Invite'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(staff.id)}
                              disabled={deletingId === staff.id}
                              className="flex items-center gap-2 text-red-600 cursor-pointer focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingId === staff.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add/Edit Staff Dialog */}
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {currentStaff ? 'Edit Staff Member' : 'Invite New Staff'}
                </DialogTitle>
              </DialogHeader>
              <StaffInviteForm 
                onSuccess={handleCloseDialog}
                merchantId={userId}
                initialData={currentStaff}
                isEditing={!!currentStaff}
                onError={(msg: string) => toast.error(msg)}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};

export default StaffSetting;