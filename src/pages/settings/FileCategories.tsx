import { useState, useEffect } from 'react';
import { settingsService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
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
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, FolderOpen, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface FileCategory {
  id: number;
  title: string;
  notes: string | null;
  is_mandatory: boolean;
  is_active: boolean;
}

export default function FileCategories() {
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FileCategory | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    is_mandatory: false,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await settingsService.getFileCategories();
      const data = response.data.data;
      setCategories(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Failed to fetch file categories:', error);
      showAlert('error', 'Error', 'Failed to fetch file categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await settingsService.updateFileCategory(editingCategory.id, formData);
      } else {
        await settingsService.createFileCategory(formData);
      }
      showAlert(
        'success',
        'Success!',
        editingCategory ? 'File category updated successfully' : 'File category created successfully',
        2000
      );
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      console.error('Failed to save file category:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save file category'));
    }
  };

  const handleEdit = (category: FileCategory) => {
    setEditingCategory(category);
    setFormData({
      title: category.title,
      notes: category.notes || '',
      is_mandatory: category.is_mandatory,
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this file category?'
    );

    if (!result.isConfirmed) return;

    try {
      await settingsService.deleteFileCategory(id);
      showAlert('success', 'Deleted!', 'File category deleted successfully', 2000);
      fetchData();
    } catch (error: unknown) {
      console.error('Failed to delete file category:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete file category'));
    }
  };

  const resetForm = () => {
    setFormData({ title: '', notes: '', is_mandatory: false, is_active: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">File Categories</h1>
          <p className="text-solarized-base01">Manage document categories for staff files</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                setEditingCategory(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit File Category' : 'Add New File Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update the file category details.' : 'Add a new file category for staff documents.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Category Name</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., ID Proof, Resume, Certificates"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Description of this category"
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_mandatory">Mandatory</Label>
                    <p className="text-sm text-solarized-base01">Require this document for all staff</p>
                  </div>
                  <Switch
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-sm text-solarized-base01">Show this category in upload options</p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No file categories configured</h3>
              <p className="text-solarized-base01 mt-1">Add your first file category to organize staff documents.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.title}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{category.notes || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          category.is_mandatory
                            ? 'bg-solarized-orange/10 text-solarized-orange'
                            : 'bg-solarized-base01/10 text-solarized-base01'
                        }
                      >
                        {category.is_mandatory ? 'Required' : 'Optional'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          category.is_active
                            ? 'bg-solarized-green/10 text-solarized-green'
                            : 'bg-solarized-base01/10 text-solarized-base01'
                        }
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(category.id)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
