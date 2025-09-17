import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, User, LogOut, Trash2, Edit, Globe, ChevronDown, Eye, FileEdit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FileManager } from '@/utils/fileManager';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { projects, loading, deleteProject, updateProject } = useProjects();
  const navigate = useNavigate();
  const [editingProject, setEditingProject] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteProject = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this project? This will also delete the associated HTML file.')) {
      // Delete the file first
      await FileManager.deleteProjectFile(id.toString(), user?.id);
      // Then delete from database
      await deleteProject(id);
      toast.success('Project and associated files deleted successfully');
    }
  };

  const handleRenameProject = async () => {
    if (!editingProject || !newTitle.trim()) return;
    
    setIsRenaming(true);
    try {
      // Update project in database
      await updateProject(editingProject.id, {
        title: newTitle,
        updated_at: new Date().toISOString()
      });
      
      // Update the file with new name
      const projectFile = FileManager.getProjectFile(editingProject.id);
      if (projectFile) {
        await FileManager.renameProject(
          editingProject.id,
          editingProject.title,
          newTitle,
          projectFile.content,
          user?.id
        );
      }
      
      toast.success('Project renamed successfully');
      setEditingProject(null);
      setNewTitle('');
    } catch (error) {
      console.error('Error renaming project:', error);
      toast.error('Failed to rename project');
    } finally {
      setIsRenaming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">CodeCraft AI</h1>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CodeCraft AI</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user.email || user.username || 'User'}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Projects</h2>
            <p className="text-muted-foreground">
              Create, manage, and share your AI-generated applications
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/website-builder')}>
                <Globe className="h-4 w-4 mr-2" />
                Website Builder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI-powered application
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/website-builder')}>
                  <Globe className="h-4 w-4 mr-2" />
                  Website Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProject(project);
                          setNewTitle(project.title);
                        }}
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{project.language}</Badge>
                      {project.ai_model && (
                        <Badge variant="outline">{project.ai_model}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await FileManager.openPreview(project.id);
                        // Show the friendly URL format to users
                        const friendlyUrl = FileManager.getProjectFriendlyUrl(project.id);
                        if (friendlyUrl) {
                          console.log(`Preview URL: ${window.location.origin}${friendlyUrl}`);
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => navigate(`/website-builder/${project.id}`)}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Website Builder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Rename Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project. This will also update the file name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3"
                placeholder="Enter project name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProject} disabled={isRenaming || !newTitle.trim()}>
              {isRenaming ? 'Renaming...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;