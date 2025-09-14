import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export const SupabaseSettings = () => {
  const { settings, updateSettings, hasCustomSupabase, loading } = useUserSettings();
  const [supabaseUrl, setSupabaseUrl] = useState(settings?.custom_supabase_url || '');
  const [supabaseKey, setSupabaseKey] = useState(settings?.custom_supabase_key || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      return;
    }

    setSaving(true);
    await updateSettings({
      custom_supabase_url: supabaseUrl.trim(),
      custom_supabase_key: supabaseKey.trim(),
    });
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your custom Supabase? This will remove your stored credentials.')) {
      setSaving(true);
      await updateSettings({
        custom_supabase_url: '',
        custom_supabase_key: '',
      });
      setSupabaseUrl('');
      setSupabaseKey('');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Bring Your Own Supabase</CardTitle>
            {hasCustomSupabase() ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Connect your own Supabase project to store your websites, versions, and assets.
          Your credentials are encrypted and stored securely.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasCustomSupabase() && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Without a custom Supabase connection, your data will be stored in the shared platform database.
              For production use and enhanced privacy, we recommend connecting your own Supabase project.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">Supabase URL</Label>
            <Input
              id="supabase-url"
              type="url"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-key">Supabase Anon Key</Label>
            <Input
              id="supabase-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!supabaseUrl.trim() || !supabaseKey.trim() || saving}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              {hasCustomSupabase() ? 'Update Connection' : 'Connect Supabase'}
            </Button>

            {hasCustomSupabase() && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={saving}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>

        {hasCustomSupabase() && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your custom Supabase is connected. All your website data will be stored in your own database.
              Make sure your Supabase project has the required tables for websites, versions, and assets.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};