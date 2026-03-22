import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { 
  Search, 
  ExternalLink,
  GitBranch,
  Loader2,
  MoreVertical,
  Package,
  Grid3X3,
  List,
  ChevronDown,
  GitCommit
} from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { api } from "@/services/api";
import { appsApi, type AppDeployment } from "@/services/appsApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [appDeployments, setAppDeployments] = useState<AppDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Handle GitHub OAuth callback
  useEffect(() => {
    const githubParam = searchParams.get('github');
    if (githubParam === 'connected' || githubParam === 'error') {
      // Redirect to integrations page to show the animation
      navigate(`/dashboard/integrations?github=${githubParam}`, { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          const token = await getToken();
          
          // Sync user
          await api.post('/auth/sync-user', { clerkId: user.id }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Fetch GitHub projects
          const projectsResponse = await api.get('/user/projects', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserProjects(projectsResponse.data.projects || []);
          
          // Fetch App Marketplace deployments
          if (token) {
            const deploymentsResponse = await appsApi.getUserDeployments(token);
            setAppDeployments(deploymentsResponse || []);
          }
        } catch (error) {
          console.error('Failed to load data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [user, getToken]);

  // Combine both types of deployments
  const allDeployments = [
    ...userProjects.map((p: any) => ({ ...p, type: 'github' })),
    ...appDeployments.map((d: any) => ({ ...d, type: 'app', name: d.projectName }))
  ];

  const filteredDeployments = allDeployments.filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.repositoryUrl && item.repositoryUrl.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; className?: string }> = {
      deployed: { variant: "default", label: "Ready", className: "bg-green-500 hover:bg-green-600" },
      running: { variant: "default", label: "Running", className: "bg-green-500 hover:bg-green-600" },
      deploying: { variant: "secondary", label: "Building" },
      failed: { variant: "destructive", label: "Error" },
      stopped: { variant: "outline", label: "Stopped" },
      pending: { variant: "secondary", label: "Queued" }
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={`text-xs ${config.className || ''}`}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header with Search */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  Add New...
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/dashboard/deploy")}>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Deploy from GitHub
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/apps")}>
                  <Package className="mr-2 h-4 w-4" />
                  Browse Marketplace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar - Usage Stats */}
          <div className="w-64 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Usage</CardTitle>
                <CardDescription className="text-xs">Last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Edge Requests</span>
                    <Badge variant="secondary" className="text-xs">Upgrade</Badge>
                  </div>
                  <div className="text-sm font-mono">71K / 1M</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fast Data Transfer</span>
                  </div>
                  <div className="text-sm font-mono">4.22 GB / 100 GB</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">ISR Reads</span>
                  </div>
                  <div className="text-sm font-mono">33K / 1M</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fast Origin Transfer</span>
                  </div>
                  <div className="text-sm font-mono">285.77 MB / 1.0 GB</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs">
                  <div className="font-medium mb-1">Get alerted for anomalies</div>
                  <div className="text-muted-foreground">Automatically monitor your projects for anomalies and get notified</div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Upgrade to Observability Plus
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Recent Previews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                    M
                  </div>
                  <span className="text-muted-foreground">main added banner field in the ho...</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>👁 Preview</span>
                  <span>📋 Readme</span>
                  <span>🔗 #f6c8LPQ</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Projects */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Projects</h2>
            </div>

            {filteredDeployments.length === 0 && allDeployments.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-muted p-4">
                    <GitBranch className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">No projects yet</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Deploy from GitHub or browse the App Marketplace
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={() => navigate("/dashboard/deploy")}>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Deploy from GitHub
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/apps")}>
                      <Package className="mr-2 h-4 w-4" />
                      Browse Apps
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
                {filteredDeployments.map((deployment: any) => (
                  <Card 
                    key={deployment._id} 
                    className={`hover:shadow-md transition-all cursor-pointer group ${
                      viewMode === 'list' ? 'p-4' : ''
                    }`}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                  {deployment.name.charAt(0).toUpperCase()}
                                </div>
                                <CardTitle className="text-base">{deployment.name}</CardTitle>
                              </div>
                              <CardDescription className="text-xs flex items-center gap-1">
                                {deployment.type === 'github' ? (
                                  <>
                                    <GitBranch className="h-3 w-3" />
                                    <span className="truncate">
                                      {deployment.repositoryUrl.replace('https://github.com/', '')}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Package className="h-3 w-3" />
                                    <span className="truncate">App Marketplace</span>
                                  </>
                                )}
                              </CardDescription>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    const isActive = deployment.status === 'deployed' || deployment.status === 'running';
                                    if (isActive) {
                                      const url = deployment.url || `https://${deployment.subdomain}.aitoyz.in`;
                                      window.open(url, '_blank');
                                    }
                                  }}
                                  disabled={deployment.status !== 'deployed' && deployment.status !== 'running'}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Visit Site
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(deployment.status)}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(deployment.createdAt)}
                            </span>
                          </div>
                          
                          {(deployment.status === 'deployed' || deployment.status === 'running') && (
                            <div className="p-2 rounded-md bg-muted/50 border">
                              <p className="text-xs text-muted-foreground mb-1">Production</p>
                              <code className="text-xs font-mono">
                                {deployment.subdomain}.aitoyz.in
                              </code>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <GitCommit className="h-3 w-3" />
                            <span>Latest commit 2h ago</span>
                          </div>

                          {(deployment.status === 'deployed' || deployment.status === 'running') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                const url = deployment.url || `https://${deployment.subdomain}.aitoyz.in`;
                                window.open(url, '_blank');
                              }}
                            >
                              <ExternalLink className="mr-2 h-3 w-3" />
                              Visit
                            </Button>
                          )}
                        </CardContent>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {deployment.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{deployment.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              {deployment.type === 'github' ? (
                                <>
                                  <GitBranch className="h-3 w-3" />
                                  {deployment.repositoryUrl.replace('https://github.com/', '')}
                                </>
                              ) : (
                                <>
                                  <Package className="h-3 w-3" />
                                  App Marketplace
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(deployment.status)}
                          <span className="text-sm text-muted-foreground">
                            {formatDate(deployment.createdAt)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  const isActive = deployment.status === 'deployed' || deployment.status === 'running';
                                  if (isActive) {
                                    const url = deployment.url || `https://${deployment.subdomain}.aitoyz.in`;
                                    window.open(url, '_blank');
                                  }
                                }}
                                disabled={deployment.status !== 'deployed' && deployment.status !== 'running'}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Visit Site
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Dashboard;
