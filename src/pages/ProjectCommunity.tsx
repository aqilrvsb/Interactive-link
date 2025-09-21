import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Lock, Unlock, ExternalLink, Search, Users, ArrowLeft, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CommunityProject {
  id: number;
  title: string;
  description?: string;
  code_content: string;
  is_public: boolean;
  is_community_visible: boolean;
  created_at: string;
  user_id: string;
  user_email?: string;
  domains: Array<{
    domain_name: string;
    status: string;
  }>;
}

const ProjectCommunity = () => {
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProjects, setUserProjects] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all public community projects
  useEffect(() => {
    fetchCommunityProjects();
  }, [user]);

  const fetchCommunityProjects = async () => {
    try {
      // First get all public projects (remove the community_visible filter for now)
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          code_content,
          is_public,
          is_community_visible,
          created_at,
          user_id
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      console.log('Fetched projects:', projectsData);
      console.log('Error:', error);

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      // Get domains for each project
      const projectIds = projectsData?.map(p => p.id) || [];
      const { data: domainsData } = await supabase
        .from('custom_domains')
        .select('project_id, domain_name, status')
        .in('project_id', projectIds)
        .eq('status', 'active');

      // Don't filter by is_community_visible - show all public projects
      const visibleProjects = projectsData || [];

      // Combine data
      const projectsWithDomains = visibleProjects.map(project => ({
        ...project,
        domains: domainsData?.filter(d => d.project_id === project.id) || []
      }));

      setProjects(projectsWithDomains);

      // Track user's own projects
      if (user) {
        const userProjectIds = projectsData
          ?.filter(p => p.user_id === user.id)
          .map(p => p.id) || [];
        setUserProjects(new Set(userProjectIds));
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load community projects');
    } finally {
      setLoading(false);
    }
  };

  // Toggle project visibility in community
  const toggleCommunityVisibility = async (projectId: number, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_community_visible: !currentVisibility })
        .eq('id', projectId)
        .eq('user_id', user?.id);

      if (!error) {
        toast.success(currentVisibility ? 'Project hidden from community' : 'Project shared with community');
        fetchCommunityProjects();
      } else {
        toast.error('Failed to update visibility');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update visibility');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.domains.some(d => d.domain_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Project Community</h1>
            </div>
            <Badge variant="secondary" className="ml-2">
              {filteredProjects.length} Projects
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No community projects yet</p>
              <p className="text-sm text-muted-foreground">
                Projects shared by users will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {project.title}
                        {userProjects.has(project.id) && (
                          <Badge variant="outline" className="text-xs">
                            Your Project
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                        </span>
                      </CardDescription>
                    </div>
                    {userProjects.has(project.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCommunityVisibility(project.id, project.is_community_visible)}
                        title={project.is_community_visible ? "Hide from community" : "Share with community"}
                      >
                        {project.is_community_visible ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Domains */}
                  {project.domains.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {project.domains.slice(0, 2).map((domain, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={`https://${domain.domain_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {domain.domain_name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                      {project.domains.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{project.domains.length - 2} more domains
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        window.open(`/p/${project.id}/${slug}`, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    {project.domains.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`https://${project.domains[0].domain_name}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit Site
                      </Button>
                    )}
                  </div>

                  {/* Creator */}
                  {project.user_email && !userProjects.has(project.id) && (
                    <p className="text-xs text-muted-foreground mt-3 truncate">
                      By: {project.user_email}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCommunity;