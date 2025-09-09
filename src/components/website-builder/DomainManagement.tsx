import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Plus, RefreshCw, Trash2, Copy, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { useCustomDomains } from '@/hooks/useCustomDomains';
import { toast } from 'sonner';

interface DomainManagementProps {
  projectId: string;
}

export const DomainManagement = ({ projectId }: DomainManagementProps) => {
  const { domains, loading, addDomain, verifyDomain, removeDomain } = useCustomDomains(projectId);
  const [newDomain, setNewDomain] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (!domain.includes('.')) {
      toast.error('Please enter a valid domain name');
      return;
    }

    const result = await addDomain(domain);
    if (result) {
      setNewDomain('');
      setShowAddDialog(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'verifying':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Verifying
          </Badge>
        );
      case 'connected':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Custom Domains</CardTitle>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Domain</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    placeholder="yourdomain.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  />
                </div>
                <Button onClick={handleAddDomain} disabled={!newDomain.trim()}>
                  Add Domain
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Connect custom domains to serve your published websites. DNS verification required.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {domains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div>No custom domains configured</div>
            <div className="text-sm">Add a domain to get started</div>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <Card key={domain.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{domain.domain_name}</h4>
                    {getStatusBadge(domain.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {domain.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyDomain(domain.id)}
                        disabled={loading}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Verify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeDomain(domain.id)}
                      className="flex items-center gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </div>

                {domain.status === 'error' && domain.error_message && (
                  <Alert className="mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{domain.error_message}</AlertDescription>
                  </Alert>
                )}

                {(domain.status === 'pending' || domain.status === 'verifying') && domain.dns_instructions && (
                  <div className="space-y-3">
                    <Separator />
                    <div>
                      <h5 className="font-medium mb-2">DNS Configuration Required</h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add these DNS records to your domain registrar:
                      </p>
                      <div className="space-y-2">
                        {domain.dns_instructions.records?.map((record: any, index: number) => (
                          <div key={index} className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-sm font-medium">
                                {record.type} Record
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(record.value)}
                                className="flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                Copy
                              </Button>
                            </div>
                            <div className="text-sm space-y-1">
                              <div><strong>Name:</strong> {record.name}</div>
                              <div><strong>Value:</strong> <code className="bg-background px-1 rounded">{record.value}</code></div>
                              <div><strong>TTL:</strong> {record.ttl}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        DNS changes can take up to 24-48 hours to propagate. Click "Verify" once records are added.
                      </p>
                    </div>
                  </div>
                )}

                {domain.status === 'connected' && (
                  <div className="pt-3 border-t">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Domain is connected and serving your published website at{' '}
                        <a 
                          href={`https://${domain.domain_name}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium underline"
                        >
                          {domain.domain_name}
                        </a>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};