import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { projectApi } from "@/services/api";
import type { Project } from "@/types";
import {
  showAlert,
  showConfirmDialog,
  getErrorMessage,
} from "@/lib/sweetalert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable, { TableColumn } from "react-data-table-component";
import {
  Plus,
  Search,
  FolderOpen,
  Eye,
  // Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function ProjectsList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const fetchProjects = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      try {
        const params: Record<string, any> = {
          page: currentPage,
          per_page: perPage,
        };
        if (search) params.search = search;

        const response = (await projectApi.list(params)) as any;
        // Handle nested data structure: response.data.data contains the projects array
        const projectsData =
          response?.data?.data ||
          response?.data ||
          response?.projects ||
          response;
        const pagination = response?.data?.pagination || response?.pagination;
        const total =
          response?.data?.total ??
          pagination?.total_items ??
          response?.total ??
          0;

        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setTotalRows(total);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        setProjects([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, search],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects(page);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, fetchProjects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProjects(1);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);
  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleAddClick = () => {
    navigate("/crm/projects/create");
  };

  const handleView = (project: Project) => {
    setSelectedProject(project);
    setIsViewOpen(true);
  };

  // const handleEdit = (project: Project) => {
  //     navigate(`/crm/projects/${project.id}/edit`);
  // };

  // const handleDelete = async (id: number) => {
  //   const result = await showConfirmDialog(
  //     "Delete Project",
  //     "Are you sure you want to delete this project?",
  //   );
  //   if (!result.isConfirmed) return;
  //   try {
  //     await projectApi.delete(id);
  //     showAlert("success", "Deleted!", "Project deleted successfully", 2000);
  //     fetchProjects(page);
  //   } catch (error) {
  //     showAlert(
  //       "error",
  //       "Error",
  //       getErrorMessage(error, "Failed to delete project"),
  //     );
  //   }
  // };

  const columns: TableColumn<Project>[] = [
    {
      name: "Project Name",
      selector: (row) => row.name,
      sortable: true,
      minWidth: "150px",
      cell: (row) => (
        <div className="font-semibold text-gray-900">{row.name}</div>
      ),
    },
    {
      name: "Customer",
      selector: (row) =>
        row.customer?.name || row.customer?.company_name || "-",
      sortable: true,
      minWidth: "200px",
      cell: (row) => (
        <span>{row.customer?.name || row.customer?.company_name || "-"}</span>
      ),
    },
    {
      name: "Actions",

      cell: (row) => (
        <div className="flex items-center gap-1 pl-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleView(row)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          {/* <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleEdit(row)}
            title="Edit"
          >
            <Edit className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleDelete(row.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button> */}
        </div>
      ),
      width: "150px",
    },
  ];

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: "#f9fafb",
        borderBottomWidth: "1px",
        borderBottomColor: "#e5e7eb",
        borderBottomStyle: "solid" as const,
        minHeight: "56px",
      },
    },
    headCells: {
      style: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
        paddingLeft: "16px",
        paddingRight: "16px",
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02 tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your CRM projects
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          size="sm"
          className="bg-solarized-blue hover:bg-solarized-blue/90 shadow-sm transition-all active:scale-95 h-9 shrink-0 px-3"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-gray-200 focus:ring-solarized-blue/20"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="w-full sm:w-auto h-10 px-6 font-semibold"
            >
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop View */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={projects}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              customStyles={customStyles}
              highlightOnHover
              responsive
              noDataComponent={
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No projects found</p>
                </div>
              }
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200">
                <FolderOpen className="h-8 w-8 animate-spin text-solarized-blue/20 mb-2" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading projects...
                </p>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-gray-200">
                <FolderOpen className="mx-auto h-12 w-12 mb-4 opacity-10" />
                <p className="text-muted-foreground">No projects found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {projects.map((project) => (
                    <div key={project.id} className="responsive-card p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 leading-tight mb-1">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-400 hover:text-solarized-blue"
                            onClick={() => handleView(project)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          {/* <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600"
                            onClick={() => handleEdit(project)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </div>

                      <div className="mb-4">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          Customer
                        </Label>
                        <p className="text-sm font-medium mt-1">
                          {project.customer?.name ||
                            project.customer?.company_name ||
                            "—"}
                        </p>
                      </div>

                      {/* <div className="flex gap-2 pt-3 border-t border-gray-100 mt-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-gray-50 rounded-lg shrink-0 ml-auto"
                          onClick={() => handleDelete(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div> */}
                    </div>
                  ))}
                </div>

                {/* Mobile Pagination */}
                {totalRows > perPage && (
                  <div className="flex justify-between items-center py-4 px-2 border-t border-gray-100 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="h-9 px-3 text-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Page {page} / {Math.ceil(totalRows / perPage)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page >= Math.ceil(totalRows / perPage)}
                      onClick={() => setPage(page + 1)}
                      className="h-9 px-3 text-gray-600"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-solarized-blue" />
              Project Details
            </DialogTitle>
            <DialogDescription>
              Full information for {selectedProject?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Project Name
                </Label>
                <p className="text-base font-semibold text-solarized-blue">
                  {selectedProject.name}
                </p>
              </div>

              {selectedProject.description && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Description
                  </Label>
                  <p className="text-sm text-gray-700">
                    {selectedProject.description}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Customer
                </Label>
                <p className="text-sm font-medium">
                  {selectedProject.customer?.name ||
                    selectedProject.customer?.company_name ||
                    "—"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
