import { useState, useEffect } from 'react';
import { crmSettingService } from '../../../services/api';
import { showAlert, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Settings } from 'lucide-react';

interface SettingData {
  default_currency: string;
  default_territory: string;
  close_opportunity_after_days: string;
  auto_close_opportunity: string;
}

export default function CrmSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SettingData>({
    default_currency: 'USD',
    default_territory: '',
    close_opportunity_after_days: '30',
    auto_close_opportunity: '0',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await crmSettingService.get();
        const settings = response.data?.data;
        if (settings) {
          setFormData({
            default_currency: settings.default_currency || 'USD',
            default_territory: settings.default_territory || '',
            close_opportunity_after_days: settings.close_opportunity_after_days?.toString() || '30',
            auto_close_opportunity: settings.auto_close_opportunity?.toString() || '0',
          });
        }
      } catch (error) {
        console.error('Failed to load CRM settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmSettingService.update({
        default_currency: formData.default_currency,
        default_territory: formData.default_territory,
        close_opportunity_after_days: parseInt(formData.close_opportunity_after_days) || 30,
        auto_close_opportunity: parseInt(formData.auto_close_opportunity) || 0,
      });
      showAlert('success', 'Success', 'CRM settings updated successfully', 2000);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update settings'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM Settings</h1>
        <p className="text-muted-foreground">Configure your CRM module preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> General Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Default Currency</Label>
                <Input
                  value={formData.default_currency}
                  onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                  placeholder="e.g. USD, EUR, INR"
                />
              </div>
              <div>
                <Label>Default Territory</Label>
                <Input
                  value={formData.default_territory}
                  onChange={(e) => setFormData({ ...formData, default_territory: e.target.value })}
                  placeholder="e.g. North America"
                />
              </div>
              <div>
                <Label>Auto-close Opportunity After (Days)</Label>
                <Input
                  type="number"
                  value={formData.close_opportunity_after_days}
                  onChange={(e) => setFormData({ ...formData, close_opportunity_after_days: e.target.value })}
                />
              </div>
              <div>
                <Label>Auto-close Opportunities</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  value={formData.auto_close_opportunity}
                  onChange={(e) => setFormData({ ...formData, auto_close_opportunity: e.target.value })}
                  placeholder="0 = No, 1 = Yes"
                />
              </div>
            </div>
            <div>
              <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
