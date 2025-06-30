import { useEffect, useState } from "react";
import EntityCard from "@/components/ui/EntityCard";
import { Mail, Phone, MapPin, Flag, User, StickyNote, Wrench } from "lucide-react";
import { useAuth, userHasRole } from "@/authContext";
import { Link } from "react-router-dom";
import CompanyForm from "@/components/ui/CompanyForm";
import { Lead } from "@/types";
import { apiFetch } from "@/lib/api";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";
import { formatPhoneNumber } from "@/lib/phoneUtils";

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
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
  } = usePagination('leads');
  const [currentlyEditingId, setCurrentlyEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<Lead>>({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    phone_label: "work",                    
    secondary_phone: "",
    secondary_phone_label: "mobile",       
    address: "",
    city: "",
    state: "",
    zip: "",
    lead_status: "open",
    notes: "",
    type: "None",
  });
  const { token, user } = useAuth();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; email: string }[]>([]);


  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/leads/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
        setError(""); // Reset error on successful fetch
      } catch (err) {
        setError("Failed to load leads");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();

    if (userHasRole(user, "admin")) {
      fetch("/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setAvailableUsers(data.filter((u: any) => u.is_active)));
    }
  }, [token, currentPage, perPage, sortOrder]);


  const handleEdit = (lead: Lead) => {
    setCurrentlyEditingId(lead.id);
    setForm({
  ...lead,
      phone_label: lead.phone_label || "work",
      secondary_phone_label: lead.secondary_phone_label || "mobile",
    });
  };

  const handleCancel = () => {
    setCurrentlyEditingId(null);
    setCreating(false);
    setForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      phone_label: "work",                    
      secondary_phone: "",
      secondary_phone_label: "mobile",        
      address: "",
      city: "",
      state: "",
      zip: "",
      lead_status: "open",
      notes: "",
    });
  };

const handleSave = async () => {
  const method = creating ? "POST" : "PUT";
  const url = creating ? "/leads/" : `/leads/${currentlyEditingId}`;

  const res = await apiFetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(form),
  });

  if (!res.ok) return alert("Failed to save lead");

  const updatedRes = await apiFetch(`/leads/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const fullData = await updatedRes.json();
  setLeads(fullData.leads);        // ✅ just the array
  setTotal(fullData.total);        // ✅ keep pagination accurate

  handleCancel();
};

const handleDelete = async (id: number) => {
  if (!confirm("Are you sure you want to delete this lead?")) return;
  
  const res = await apiFetch(`/leads/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (res.ok) {
    // Refresh the current page instead of just filtering
    const updatedRes = await apiFetch(`/leads/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await updatedRes.json();
    setLeads(data.leads);
    setTotal(data.total);
  } else {
    alert("Failed to delete lead");
  }
};

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Leads</h1>

      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={() => {
          setCreating(true);
          setCurrentlyEditingId(null);
          setForm({
            name: "",
            contact_person: "",
            email: "",
            phone: "",
            phone_label: "work",
            secondary_phone: "",
            secondary_phone_label: "mobile",
            address: "",
            city: "",
            state: "",
            zip: "",
            lead_status: "open",
            notes: "",
          });
        }}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + New Lead
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
        entityName="leads"
        className="border-b pb-4"
      />

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4">
        {creating && (
          <EntityCard
            title="New Lead"
            editing
            onSave={handleSave}
            onCancel={handleCancel}
            editForm={<CompanyForm form={form} setForm={setForm} />}
          />
        )}

        {leads.map((lead) => (
          <EntityCard
            key={lead.id}
            title={
              <span className="block">
                <Link
                  to={`/leads/${lead.id}`}
                  className="hover:underline font-medium text-base block"
                >
                  {lead.name}
                </Link>
                <span className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Wrench size={14} className="text-gray-500" />
                  <span className="text-gray-500 font-medium">Type:</span>{" "}
                  {lead.type || "None"}
                </span>
              </span>
            }
            editing={currentlyEditingId === lead.id}
            onEdit={() => handleEdit(lead)}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={() => handleDelete(lead.id)}
            editForm={<CompanyForm form={form} setForm={setForm} />}
            details={
              <ul className="text-sm text-gray-600 space-y-1">
                {lead.contact_person && (
                  <li className="flex items-start gap-2">
                    <User size={14} className="mt-[2px]" />
                    <div className="leading-tight">
                      <div>{lead.contact_person}</div>
                      {lead.contact_title && (
                        <div className="text-gray-500 text-sm italic">{lead.contact_title}</div>
                      )}
                    </div>
                  </li>
                )}
                {lead.email && (
                  <li className="flex items-center gap-2">
                    <Mail size={14} /> {lead.email}
                  </li>
                )}

                {lead.phone && (
                  <li className="flex items-start gap-2">
                    <Phone size={14} className="mt-[2px]" />
                    <div className="leading-tight">
                      <div>
                        <a href={`tel:${lead.phone}`} className="text-blue-600 underline">
                          {formatPhoneNumber(lead.phone)}
                        </a>
                        {lead.phone_label && (
                          <span className="text-muted-foreground text-sm ml-1">
                            ({lead.phone_label})
                          </span>
                        )}
                      </div>
                      {lead.secondary_phone && (
                        <div>
                          <a
                            href={`tel:${lead.secondary_phone}`}
                            className="text-blue-600 underline"
                          >
                            {formatPhoneNumber(lead.secondary_phone)}
                          </a>
                          {lead.secondary_phone_label && (
                            <span className="text-muted-foreground text-sm ml-1">
                              ({lead.secondary_phone_label})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                )}

                {(lead.address || lead.city || lead.state || lead.zip) && (
                  <li className="flex items-start gap-2">
                    <MapPin size={14} className="mt-[2px]" />
                    <div className="leading-tight">
                      {lead.address && <div>{lead.address}</div>}
                      <div>
                        {[lead.city, lead.state].filter(Boolean).join(", ")}
                        {lead.zip ? ` ${lead.zip}` : ""}
                      </div>
                    </div>
                  </li>
                )}
                {lead.lead_status && (
                  <li className="flex items-center gap-2">
                    <Flag size={14} /> {lead.lead_status}
                  </li>
                )}
                {lead.notes && (
                  <li className="flex items-start gap-2">
                    <StickyNote size={14} className="mt-[2px]" />
                    <div>{lead.notes}</div>
                  </li>
                )}
              </ul>
            }
            extraMenuItems={
              userHasRole(user, "admin") ? (
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    setSelectedLeadId(lead.id);
                    setShowAssignModal(true);
                  }}
                >
                  Assign
                </button>
              ) : null
            }
          />
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
        entityName="leads"
        className="border-t pt-4"
      />

      
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign Lead</h2>

            <select
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 mb-4"
            >
              <option value="">Select a user</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUserId(null);
                  setSelectedLeadId(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUserId}
                onClick={async () => {
                  const res = await apiFetch(`/leads/${selectedLeadId}/assign`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ assigned_to: selectedUserId }),
                  });

                  if (res.ok) {
                    setShowAssignModal(false);
                    setSelectedUserId(null);
                    setSelectedLeadId(null);
                    const updatedRes = await apiFetch(`/leads/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const fullData = await updatedRes.json();
                    setLeads(fullData.leads);  // ✅ fix
                    setTotal(fullData.total);  // ✅ keep it accurate

                  } else {
                    alert("Failed to assign lead.");
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}