import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, ExternalLink, Edit, Trash2, Globe, Calendar } from 'lucide-react';
import { SiteVersion, useSiteVersions } from '@/hooks/useSiteVersions';
import { toast } from 'sonner';

interface ProjectFilesViewProps {
  projectId: string;
  onEditVersion: (version: SiteVersion) => void;
}

export const ProjectFilesView = ({ projectId, onEditVersion }: ProjectFilesViewProps) => {
  const { versions, loading, publishVersion, deleteVersion } = useSiteVersions(projectId);
  const [previewVersion, setPreviewVersion] = useState<SiteVersion | null>(null);

  const handlePreview = (version: SiteVersion) => {
    setPreviewVersion(version);
  };

  const handleOpenAsWebsite = (version: SiteVersion) => {
    // Create a blob with the HTML content and open in new tab
    const htmlBlob = new Blob([version.html_content], { type: 'text/html' });
    const url = URL.createObjectURL(htmlBlob);
    window.open(url, '_blank');
    
    // Clean up the blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePublish = async (versionId: string) => {
    await publishVersion(versionId);
  };

  const handleDelete = async (versionId: string) => {
    if (confirm('Are you sure you want to delete this version?')) {
      await deleteVersion(versionId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading versions...</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-muted-foreground mb-2">No saved versions yet</div>
        <div className="text-sm text-muted-foreground">
          Save your first version to see it here
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Project Files</h3>
          <Badge variant="secondary">{versions.length} versions</Badge>
        </div>

        <div className="grid gap-4">
          {versions.map((version) => (
            <Card key={version.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Version {version.version_number}
                    {version.is_published && (
                      <Badge variant="default" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(version.build_timestamp)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreview(version)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAsWebsite(version)}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open as Website
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditVersion(version)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  
                  {!version.is_published && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handlePublish(version.id)}
                      className="flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      Publish
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(version.id)}
                    className="flex items-center gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Preview - Version {previewVersion?.version_number}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 border rounded-lg overflow-hidden">
            {previewVersion && (
              <iframe
                srcDoc={previewVersion.html_content}
                className="w-full h-full"
                title={`Version ${previewVersion.version_number} Preview`}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};