import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import EntityCard from "@/components/ui/EntityCard";
import { Project } from "@/types";
import ProjectForm from "@/components/ui/ProjectForm";
import { FormWrapper } from "@/components/ui/FormWrapper";
import { apiFetch } from "@/lib/api";
import { Link } from "react-router-dom";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";

// TEMP: All Seasons Foam prefers "Accounts" instead of "Clients"
const USE_ACCOUNT_LABELS = true;

export default function Projects() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Use pagination hook
  const {
    perPage,
    sortOrder,
    currentPage,
    setCurrentPage,
    updatePerPage,
    updateSortOrder,
  } = usePagination('projects');

  const [form, setForm] = useState<Partial<Project>>({});
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [leads, setLeads] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [projRes, clientRes, leadRes] = await Promise.all([
          apiFetch(`/projects/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          apiFetch("/clients/", { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch("/leads/", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const projectsData = await projRes.json();
        const clients = await clientRes.json();
        const leads = await leadRes.json();

        // Extract leads array from paginated response
        const leadsArray = leads.leads || leads;
        // Extract clients array from paginated response
        const clientsArray = clients.clients || clients;

        setProjects(projectsData.projects);
        setTotal(projectsData.total);
        setClients(clientsArray.map((c: any) => ({ id: c.id, name: c.name })));
        setLeads(leadsArray.map((l: any) => ({ id: l.id, name: l.name })));
      } catch (err: any) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token, currentPage, perPage, sortOrder]);

  const resetForm = () => {
    setForm({});
    setCreating(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const method = creating ? "POST" : "PUT";
    const url = creating ? "/projects/" : `/projects/${editingId}`;

    if (!form.project_worth) {
      form.project_worth = 0;
    }
    
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const updated = await apiFetch(`/projects/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await updated.json();
      setProjects(data.projects);
      setTotal(data.total);
      resetForm();
    }
    // No need for else block - apiFetch already handles errors and shows toast messages
  };

  const handleDelete = async (id: number) => {
    const res = await apiFetch(`/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } else {
      alert("Failed to delete project");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>

      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={() => {
          setCreating(true);
          setForm({});
        }}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + New Project
      </button>

      {/* Pagination Controls at top */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={total}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName="projects"
        className="border-b pb-4"
      />

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {creating && (
            <div className="w-full">
              <EntityCard
                title="New Project"
                editing
                onSave={handleSave}
                onCancel={resetForm}
                editForm={
                  <ProjectForm
                    form={form}
                    setForm={setForm}
                    clients={clients}
                    leads={leads}
                  />
                }
              />
            </div>
          )}

          {projects.map((project) => (
            <div key={project.id} className="w-full">
              <EntityCard
                title={
                  <Link
                    to={`/projects/${project.id}`}
                    className="hover:underline font-medium text-base block"
                  >
                    {project.project_name}
                  </Link>
                }
                editing={editingId === project.id}
                onEdit={() => {
                  setEditingId(project.id);
                  setForm(project);
                }}
                onCancel={resetForm}
                onSave={handleSave}
                onDelete={() => handleDelete(project.id)}
                editForm={
                  <FormWrapper>
                    <ProjectForm
                      form={form}
                      setForm={setForm}
                      clients={clients}
                      leads={leads}
                    />
                  </FormWrapper>
                }
                details={
                  <ul className="text-sm text-gray-700 space-y-1">
                    {project.type && <li>Type: {project.type}</li>}
                    <li>Status: {project.project_status}</li>
                    {project.project_description && <li>{project.project_description}</li>}

                    {project.client_id && project.client_name && (
                      <li>
                        <Link to={`/clients/${project.client_id}`} className="text-blue-600 hover:underline">
                          {USE_ACCOUNT_LABELS ? "Account" : "Client"}: {project.client_name}
                        </Link>
                      </li>
                    )}

                    {project.lead_id && project.lead_name && (
                      <li>
                        <Link to={`/leads/${project.lead_id}`} className="text-blue-600 hover:underline">
                          Lead: {project.lead_name}
                        </Link>
                      </li>
                    )}

                    {!project.client_id && !project.lead_id && (
                      <li className="text-yellow-600 text-xs font-medium">⚠️ Unassigned Project</li>
                    )}

                    {project.project_worth && <li>Worth: ${project.project_worth.toLocaleString()}</li>}
                    {project.project_start && <li>Start: {new Date(project.project_start).toLocaleDateString()}</li>}
                    {project.project_end && <li>End: {new Date(project.project_end).toLocaleDateString()}</li>}
                    {project.notes && (
                      <li className="whitespace-pre-wrap text-gray-600">
                        <strong>Notes:</strong> {project.notes?.trim() || "No notes provided."}
                      </li>
                    )}
                  </ul>
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls at bottom */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={total}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName="projects"
        className="border-t pt-4"
      />
    </div>
  );
}