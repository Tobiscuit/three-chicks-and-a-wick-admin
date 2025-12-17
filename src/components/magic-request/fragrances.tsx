'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sparkles, Plus, Pencil, Trash2, Package, DollarSign, Loader2 } from 'lucide-react';
import type { Fragrance, FragranceInput } from '@/lib/storefront-appsync';
import {
  listFragrances,
  createFragrance,
  updateFragrance,
  deleteFragrance,
} from '@/lib/storefront-appsync';

export function MagicRequestFragrances() {
  const { toast } = useToast();
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingFragrance, setEditingFragrance] = useState<Fragrance | null>(null);
  const [deletingFragrance, setDeletingFragrance] = useState<Fragrance | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FragranceInput>({
    name: '',
    description: '',
    quantityOz: 0,
    costPerOz: 0,
    status: 'IN_STOCK',
  });

  useEffect(() => {
    loadFragrances();
  }, []);

  const loadFragrances = async () => {
    try {
      setLoading(true);
      const result = await listFragrances();
      setFragrances(result.items);
    } catch (error) {
      console.error('Error loading fragrances:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load fragrances. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (fragrance?: Fragrance) => {
    if (fragrance) {
      setEditingFragrance(fragrance);
      setFormData({
        name: fragrance.name,
        description: fragrance.description || '',
        quantityOz: fragrance.quantityOz,
        costPerOz: fragrance.costPerOz || 0,
        status: fragrance.status,
      });
    } else {
      setEditingFragrance(null);
      setFormData({
        name: '',
        description: '',
        quantityOz: 0,
        costPerOz: 0,
        status: 'IN_STOCK',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFragrance(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Fragrance name is required.',
      });
      return;
    }

    if (formData.quantityOz < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Quantity must be a positive number.',
      });
      return;
    }

    try {
      setSubmitting(true);

      if (editingFragrance) {
        // Update existing
        await updateFragrance(editingFragrance.id, formData);
        toast({
          title: 'Fragrance Updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new
        await createFragrance(formData);
        toast({
          title: 'Fragrance Created',
          description: `${formData.name} has been added to inventory.`,
        });
      }

      handleCloseDialog();
      await loadFragrances();
    } catch (error) {
      console.error('Error saving fragrance:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save fragrance.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (fragrance: Fragrance) => {
    setDeletingFragrance(fragrance);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFragrance) return;

    try {
      setSubmitting(true);
      await deleteFragrance(deletingFragrance.id);
      toast({
        title: 'Fragrance Deleted',
        description: `${deletingFragrance.name} has been removed from inventory.`,
      });
      setIsDeleteDialogOpen(false);
      setDeletingFragrance(null);
      await loadFragrances();
    } catch (error) {
      console.error('Error deleting fragrance:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete fragrance.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-green-700/20 text-green-500 border-green-700/30';
      case 'LOW':
        return 'bg-yellow-700/20 text-yellow-500 border-yellow-700/30';
      case 'OUT_OF_STOCK':
        return 'bg-red-700/20 text-red-500 border-red-700/30';
      default:
        return 'bg-gray-700/20 text-gray-500 border-gray-700/30';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Fragrances...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading fragrance inventory...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Fragrance Inventory
              </CardTitle>
              <CardDescription className="mt-2">
                Manage fragrances available for custom candle creation
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fragrance
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fragrances</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fragrances.length}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fragrances.filter((f) => f.status === 'IN_STOCK').length}
            </div>
            <p className="text-xs text-muted-foreground">Available for use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fragrances.filter((f) => f.status === 'LOW').length}
            </div>
            <p className="text-xs text-muted-foreground">Need reorder</p>
          </CardContent>
        </Card>
      </div>

      {/* Fragrances Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Fragrances</CardTitle>
          <CardDescription>
            View and manage your fragrance inventory. The AI will intelligently use in-stock fragrances when
            generating custom candles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fragrances.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No fragrances yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first fragrance to start building your inventory.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Fragrance
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity (oz)</TableHead>
                    <TableHead className="text-right">Cost/oz</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fragrances.map((fragrance) => (
                    <TableRow key={fragrance.id}>
                      <TableCell className="font-medium">{fragrance.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {fragrance.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">{fragrance.quantityOz.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {fragrance.costPerOz ? `$${fragrance.costPerOz.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(fragrance.status)}>
                          {formatStatus(fragrance.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(fragrance)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(fragrance)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingFragrance ? 'Edit Fragrance' : 'Add New Fragrance'}
            </DialogTitle>
            <DialogDescription>
              {editingFragrance
                ? 'Update the fragrance details below.'
                : 'Add a new fragrance to your inventory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., French Lavender"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., A floral, calming scent from lavender fields"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityOz">Quantity (oz) *</Label>
                <Input
                  id="quantityOz"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.quantityOz || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, quantityOz: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPerOz">Cost per oz</Label>
                <Input
                  id="costPerOz"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.costPerOz || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, costPerOz: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'IN_STOCK' | 'LOW' | 'OUT_OF_STOCK') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_STOCK">In Stock</SelectItem>
                  <SelectItem value="LOW">Low Stock</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingFragrance ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{editingFragrance ? 'Update' : 'Create'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingFragrance?.name}</strong> from your
              inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

