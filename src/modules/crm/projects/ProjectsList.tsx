import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { projectApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  estimated_value?: number;
  created_at?: string;
  customer?: {
    id: number;
    company_name: string;
  };
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi
      .list()
      .then((res) => {
        const projectsData = res.data || res.projects || res; // flexible handling
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge
                  variant={
                    project.status === "active"
                      ? "default"
                      : project.status === "completed"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {project.description || "No description"}
              </p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {project.customer?.company_name || "No customer"}
                </span>
                <span className="font-semibold">
                  ₹{project.estimated_value?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link to={`/crm/customers/${project.customer?.id}/projects`}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No projects found. Create your first project to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
