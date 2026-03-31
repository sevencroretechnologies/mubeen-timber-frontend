import { useState, useEffect } from 'react';
import { documentLocationService, documentConfigService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { HardDrive, Cloud, Database, Settings as SettingsIcon, CheckCircle2 } from 'lucide-react';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';


interface DocumentLocation {
    id: number;
    location_type: number;
    org_id?: number;
    company_id?: number;
    organization?: { name: string };
    company?: { company_name: string };
    config?: any; // To store storage specific config
}

type StorageType = 'local' | 'wasabi' | 'aws';

const STORAGE_CARDS = [
    {
        type: 'local' as StorageType,
        id: 1,
        title: 'Local Storage',
        description: 'Store documents directly on your server\'s filesystem.',
        icon: HardDrive,
        color: 'bg-blue-500/10',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-200 hover:border-blue-500',
        activeBorder: 'border-blue-500 ring-4 ring-blue-500/10',
        badgeColor: 'bg-blue-100 text-blue-700'
    },
    {
        type: 'wasabi' as StorageType,
        id: 2,
        title: 'Wasabi Cloud',
        description: 'High-performance, affordable S3-compatible cloud storage.',
        icon: Cloud,
        color: 'bg-green-500/10',
        iconColor: 'text-green-600',
        borderColor: 'border-green-200 hover:border-green-500',
        activeBorder: 'border-green-500 ring-4 ring-green-500/10',
        badgeColor: 'bg-green-100 text-green-700'
    },
    {
        type: 'aws' as StorageType,
        id: 3,
        title: 'AWS S3',
        description: 'Industry-standard durable and scalable object storage.',
        icon: Database,
        color: 'bg-yellow-500/10',
        iconColor: 'text-yellow-600',
        borderColor: 'border-yellow-200 hover:border-yellow-500',
        activeBorder: 'border-yellow-500 ring-4 ring-yellow-500/10',
        badgeColor: 'bg-yellow-100 text-yellow-700'
    },
];

export default function DocumentConfiguration() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [locations, setLocations] = useState<DocumentLocation[]>([]);
    const [loadingTypes, setLoadingTypes] = useState<Set<StorageType>>(new Set());

    // Modal & Form State
    const [selectedType, setSelectedType] = useState<StorageType | null>(null);
    const [currentStorage, setCurrentStorage] = useState<{ type: StorageType; id: number; title: string } | null>(null);
    const [formData, setFormData] = useState<any>({
        root_path: '',
        bucket: '',
        region: '',
        access_key: '',
        secret_key: '',
        endpoint: '',
    });

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            setIsLoading(true);
            const response = await documentLocationService.getAll({});
            const payload = response.data.data;
            let rawLocations: DocumentLocation[] = Array.isArray(payload) ? payload : (payload?.data || []);

            // For each location, fetch its specific config
            const locationsWithConfigs = await Promise.all(
                rawLocations.map(async (loc) => {
                    try {
                        let configResponse;
                        if (loc.location_type === 2) { // Wasabi
                            configResponse = await documentConfigService.getWasabiConfig(loc.id);
                        } else if (loc.location_type === 3) { // AWS
                            configResponse = await documentConfigService.getAwsConfig(loc.id);
                        } else if (loc.location_type === 1) { // Local
                            configResponse = await documentConfigService.getLocalConfig(loc.id);
                        } else {
                            // Fallback
                            configResponse = await documentConfigService.getConfig(loc.id);
                        }
                        return { ...loc, config: configResponse.data.data };
                    } catch (err) {
                        return loc;
                    }
                })
            );

            setLocations(locationsWithConfigs);
        } catch (error) {
            console.error('Failed to fetch locations:', error);
            showAlert('error', 'Error', 'Failed to fetch storage locations');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading && locations.length > 0 && !selectedType) {
            // Find active config first
            // Logic updated: Allow ANY configured location to be auto-selected, prioritizing Active ones.
            // Priority: Active Cloud > Active Local > Any Cloud Config > Any Local Config

            // 1. Check for Active Cloud (Wasabi/AWS)
            let activeLoc = locations.find(loc => loc.config?.is_active && loc.location_type !== 1);

            // 2. Check for Active Local
            if (!activeLoc) {
                activeLoc = locations.find(loc => loc.config?.is_active);
            }

            // 3. Check for Any Configured Cloud
            if (!activeLoc) {
                activeLoc = locations.find(loc => loc.config && loc.location_type !== 1);
            }

            // 4. Check for Any Configured Local (fallback)
            if (!activeLoc) {
                activeLoc = locations.find(loc => loc.config);
            }

            if (activeLoc) {
                const card = STORAGE_CARDS.find(c => c.id === activeLoc?.location_type);
                if (card) {
                    setCurrentStorage(card);
                    setSelectedType(card.type);

                    if (activeLoc.config) {
                        setFormData({
                            root_path: activeLoc.config.root_path || '',
                            bucket: activeLoc.config.bucket || '',
                            region: activeLoc.config.region || '',
                            access_key: activeLoc.config.access_key || '',
                            secret_key: activeLoc.config.secret_key || '',
                            endpoint: activeLoc.config.endpoint || '',
                        });
                    }
                }
            }
        }
    }, [locations, isLoading, selectedType]);


    const handleOptionClick = async (storage: { type: StorageType; id: number; title: string }) => {
        // Optimistic UI update
        setCurrentStorage(storage);
        setSelectedType(storage.type);

        // Check if location exists
        const existingLoc = locations.find(loc => loc.location_type === storage.id);

        if (!existingLoc) {
            try {
                // Determine if we should set 'is_active' on the location itself? 
                // The prompt says "store in document location". Creating the record does that.

                // Create the location record immediately
                if (user?.org_id && user?.company_id) {
                    await documentLocationService.create({
                        location_type: storage.id,
                        org_id: user.org_id,
                        company_id: user.company_id,
                    });

                    // Refresh locations to get the new ID
                    await fetchLocations();
                }
            } catch (error) {
                console.error("Failed to auto-create location", error);
                // We don't block the UI, just log it. The user will hit save later anyway.
            }
        } else {
            // If it exists, populate form
            if (existingLoc.config) {
                setFormData({
                    root_path: existingLoc.config.root_path || '',
                    bucket: existingLoc.config.bucket || '',
                    region: existingLoc.config.region || '',
                    access_key: existingLoc.config.access_key || '',
                    secret_key: existingLoc.config.secret_key || '',
                    endpoint: existingLoc.config.endpoint || '',
                });
            } else {
                // Reset form if location exists but no config (rare, but possible)
                setFormData({
                    root_path: '',
                    bucket: '',
                    region: '',
                    access_key: '',
                    secret_key: '',
                    endpoint: '',
                });
            }
        }

        // Scroll to detailed section
        setTimeout(() => {
            const element = document.getElementById('detailed-config-section');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Debug logging
        console.log('handleSubmit triggered');
        console.log('currentStorage:', currentStorage);
        console.log('user:', user);
        console.log('formData:', formData);

        // Validation with user feedback
        if (!currentStorage) {
            showAlert('error', 'Error', 'Please select a storage type first');
            return;
        }

        if (loadingTypes.has(currentStorage.type)) {
            console.log('Already loading, skipping duplicate submission');
            return;
        }

        if (!user?.org_id || !user?.company_id) {
            console.error('Missing org_id or company_id:', { org_id: user?.org_id, company_id: user?.company_id });
            return;
        }

        setLoadingTypes(prev => new Set(prev).add(currentStorage.type));
        try {
            let locationId: number;
            const existingLoc = locations.find(loc => loc.location_type === currentStorage.id);

            console.log('existingLoc:', existingLoc);

            if (existingLoc) {
                locationId = existingLoc.id;

                if (existingLoc.config && existingLoc.config.id) {
                    // UPDATE existing config
                    const configId = existingLoc.config.id;
                    const configData = { ...formData, location_id: locationId, is_active: true };
                    console.log('Updating config:', { configId, configData, type: currentStorage.type });

                    if (currentStorage.type === 'local') await documentConfigService.updateLocal(configId, configData);
                    else if (currentStorage.type === 'wasabi') await documentConfigService.updateWasabi(configId, configData);
                    else if (currentStorage.type === 'aws') await documentConfigService.updateAws(configId, configData);
                } else {
                    // CREATE new config for existing location
                    const configData = { ...formData, location_id: locationId, is_active: true };
                    console.log('Creating config for existing location:', { locationId, configData, type: currentStorage.type });

                    if (currentStorage.type === 'local') await documentConfigService.createLocal(configData);
                    else if (currentStorage.type === 'wasabi') await documentConfigService.createWasabi(configData);
                    else if (currentStorage.type === 'aws') await documentConfigService.createAws(configData);
                }
            } else {
                // 1. Create Location first
                console.log('Creating new location:', { location_type: currentStorage.id, org_id: user.org_id, company_id: user.company_id });
                const locResponse = await documentLocationService.create({
                    location_type: currentStorage.id,
                    org_id: user.org_id,
                    company_id: user.company_id,
                });
                locationId = locResponse.data.data.id;
                console.log('Location created with ID:', locationId);

                // 2. Create specific config
                const configData = { ...formData, location_id: locationId, is_active: true };
                console.log('Creating config:', { configData, type: currentStorage.type });

                if (currentStorage.type === 'local') await documentConfigService.createLocal(configData);
                else if (currentStorage.type === 'wasabi') await documentConfigService.createWasabi(configData);
                else if (currentStorage.type === 'aws') await documentConfigService.createAws(configData);
            }

            showAlert('success', 'Success!', 'Configuration saved successfully', 2000);
            fetchLocations();
        } catch (error: unknown) {
            console.error('Failed to save config:', error);
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to save configuration'));
        } finally {
            if (currentStorage) {
                setLoadingTypes(prev => {
                    const next = new Set(prev);
                    next.delete(currentStorage.type);
                    return next;
                });
            }
        }
    };

    const getConfiguredLocations = (locationType: number) => {
        return locations.filter(loc => loc.location_type === locationType);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <SettingsIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Document Storage</h1>
                        <p className="text-gray-500">Configure where your organization's files and documents will be securely stored.</p>
                    </div>
                </div>
            </div>

            {/* Top Summary Grid - Direct Configuration */}
            <RadioGroup
                value={selectedType || ''}
                onValueChange={(val) => {
                    const card = STORAGE_CARDS.find(c => c.type === val);
                    if (card) handleOptionClick(card);
                }}
            >
                <div className="grid gap-6 md:grid-cols-3">
                    {STORAGE_CARDS.map((card) => {
                        const Icon = card.icon;
                        const configuredLocations = getConfiguredLocations(card.id);
                        const isConfigured = configuredLocations.length > 0;
                        const isSelected = selectedType === card.type;

                        return (
                            <Card
                                key={card.type}
                                className={`relative overflow-hidden transition-all duration-300 cursor-pointer border-2 group hover:shadow-xl hover:-translate-y-1 
                                    ${isSelected ? card.activeBorder : `${card.borderColor} bg-white shadow-sm`}`}
                                onClick={() => handleOptionClick(card)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center transition-transform group-hover:scale-105`}>
                                            <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                        </div>
                                        {isConfigured && (
                                            <Badge className={`${card.badgeColor} border-0 px-2 py-0.5 text-xs font-semibold flex gap-1`}>
                                                <CheckCircle2 className="h-3 w-3" />
                                                Active
                                            </Badge>
                                        )}
                                    </div>

                                    <CardTitle className="text-base font-bold text-gray-900 mb-1">{card.title}</CardTitle>
                                    <CardDescription className="text-xs text-gray-500 leading-relaxed font-medium line-clamp-2">
                                        {card.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 pb-3 pt-0">
                                    <div className={`mt-2 flex items-center justify-between pt-2 border-t ${isSelected ? 'border-current opacity-20' : 'border-gray-100'} `}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value={card.type} id={`radio-${card.type}`} className="h-3.5 w-3.5 data-[state=checked]:border-current data-[state=checked]:text-current" />
                                            <Label htmlFor={`radio-${card.type}`} className="cursor-pointer text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                                                {isSelected ? 'Configure' : 'Select'}
                                            </Label>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </RadioGroup>

            {selectedType && (
                <div className="pt-4" id="detailed-config-section">
                    <Card className="border-0 shadow-md">
                        <CardContent className="p-0">
                            <div className="p-6 border border-solarized-base3 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                    {selectedType === 'local' ? <HardDrive className="h-5 w-5 text-solarized-blue" /> : selectedType === 'wasabi' ? <Cloud className="h-5 w-5 text-solarized-green" /> : <Database className="h-5 w-5 text-solarized-yellow" />}
                                    Configure {currentStorage?.title}
                                </h3>

                                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                                    {selectedType === 'local' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="root_path">Root Path</Label>
                                            <Input
                                                id="root_path"
                                                placeholder="/var/www/storage/app/public"
                                                value={formData.root_path}
                                                onChange={(e) => setFormData({ ...formData, root_path: e.target.value })}
                                                required
                                            />
                                            <p className="text-xs text-solarized-base01">The absolute file path on your server where documents will be stored.</p>
                                        </div>
                                    )}

                                    {(selectedType === 'wasabi' || selectedType === 'aws') && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="bucket">Bucket Name</Label>
                                                    <Input
                                                        id="bucket"
                                                        value={formData.bucket}
                                                        onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="region">Region</Label>
                                                    <Input
                                                        id="region"
                                                        value={formData.region}
                                                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="access_key">Access Key</Label>
                                                <Input
                                                    id="access_key"
                                                    value={formData.access_key}
                                                    onChange={(e) => setFormData({ ...formData, access_key: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="secret_key">Secret Key</Label>
                                                <Input
                                                    id="secret_key"
                                                    type="password"
                                                    value={formData.secret_key}
                                                    onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}

                                    {selectedType === 'wasabi' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="endpoint">Endpoint URL</Label>
                                            <Input
                                                id="endpoint"
                                                placeholder="https://s3.wasabisys.com"
                                                value={formData.endpoint}
                                                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="flex pt-4 border-t border-solarized-base3/30">
                                        <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90 w-auto px-6" disabled={currentStorage ? loadingTypes.has(currentStorage.type) : false}>
                                            {loadingTypes.has(selectedType) ? 'Saving...' : 'Save Configuration'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

        </div>
    );
}
