import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/authContext";
import { MoreVertical } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface User {
  id: number;
  email: string;
  roles: string[];
  created_at: string;
  is_active: boolean;
}

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showForm, setShowForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editedEmail, setEditedEmail] = useState<string>("");

  useEffect(() => {
    apiFetch("/users/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load users");
        return res.json();
      })
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [token]);

  const handleCreate = async () => {
    const res = await apiFetch("/users/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, roles: [role] }),
    });

    if (res.ok) {
      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setEmail("");
      setPassword("");
      setRole("user");
      setShowForm(false);
    } else {
      const { error } = await res.json();
      setError(error || "Failed to create user");
    }
  };

  const handleToggleActive = async (id: number) => {
    const res = await apiFetch(`/users/${id}/toggle-active`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: updated.is_active } : u))
      );
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const activeRef = openMenuId !== null ? menuRefs.current[openMenuId] : null;
    if (activeRef && !activeRef.contains(e.target as Node)) {
      setOpenMenuId(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChangeRole = async (id: number, newRole: string) => {
    const res = await apiFetch(`/users/${id}/roles`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roles: [newRole] }),
    });

    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, roles: updated.roles } : u))
      );
      setOpenMenuId(null);
    } else {
      const { error } = await res.json();
      alert(error || "Failed to update role");
    }
  };

  const handleSaveEmail = async (id: number) => {
    const res = await apiFetch(`/users/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: editedEmail }),
    });

    if (res.ok) {
      const updated = await res.json();
      console.log("Updated user response:", updated);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                email: updated.email || editedEmail, // fallback if backend response is empty
              }
            : u
        )
      );
      setEditingUserId(null);
      setEditedEmail("");
    } else {
      const { error } = await res.json();
      alert(error || "Failed to update email");
    }
  };


  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ New User"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 border p-4 bg-white rounded shadow-sm">
          <h2 className="font-semibold text-lg">Add New User</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save User
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      )}

      <div className="space-y-2">
        {activeUsers.map((user) => (
          <div
            key={user.id}
            className="p-4 border border-gray-200 rounded bg-white shadow-sm flex justify-between items-center"
          >
            <div>
              {editingUserId === user.id ? (
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="border px-2 py-1 rounded w-full"
                />
              ) : (
                <p className="font-medium">{user.email}</p>
              )}
              <div className="text-sm">
                <span
                  className={`inline-block px-2 py-0.5 text-xs rounded ${
                    user.roles.includes("admin")
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {user.roles[0]}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Created: {new Date(user.created_at).toLocaleString()}
              </p>
            </div>

            <div
              className="relative"
              ref={(el: HTMLDivElement | null): void => {
                menuRefs.current[user.id] = el;
              }}
            >

              <button
                onClick={() =>
                  setOpenMenuId((prev) => (prev === user.id ? null : user.id))
                }
                className="text-gray-500 hover:text-gray-700"
              >
                <MoreVertical size={20} />
              </button>
              {openMenuId === user.id && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md z-10">
                  {user.roles.includes("admin") ? (
                    <button
                      onClick={() => handleChangeRole(user.id, "user")}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-blue-600"
                      disabled={user.id === currentUser?.id}
                    >
                      Demote to User
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChangeRole(user.id, "admin")}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-blue-600"
                    >
                      Promote to Admin
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleActive(user.id)}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-yellow-600"
                  >
                    {user.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                  {editingUserId === user.id ? (
                    <button
                      onClick={() => handleSaveEmail(user.id)}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-green-600"
                    >
                      Save Email
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingUserId(user.id);
                        setEditedEmail(user.email);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-indigo-600"
                    >
                      Edit Email
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {inactiveUsers.length > 0 && (
        <details className="border border-gray-300 rounded bg-white shadow-sm mt-8">
          <summary className="px-4 py-2 font-semibold cursor-pointer text-blue-700 hover:bg-blue-50 rounded-t">
            Deactivated Users ({inactiveUsers.length})
          </summary>
          <div className="p-4 space-y-2">
            {inactiveUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 border border-gray-200 rounded bg-gray-50 shadow-sm flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-500">{user.email}</p>
                  <div className="text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded ${
                        user.roles.includes("admin")
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.roles[0]}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400">
                    Created: {new Date(user.created_at).toLocaleString()}
                  </p>
                </div>

                <div
                  className="relative"
                  ref={(el: HTMLDivElement | null): void => {
                    menuRefs.current[user.id] = el;
                  }}
                >

                  <button
                    onClick={() =>
                      setOpenMenuId((prev) => (prev === user.id ? null : user.id))
                    }
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <MoreVertical size={20} />
                  </button>
                  {openMenuId === user.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-md z-10">
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-green-600"
                      >
                        Reactivate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
