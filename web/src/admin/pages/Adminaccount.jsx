import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/authService";
import AdminModal from "../components/AdminModal";
import "./Adminaccount.css";



const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="aa__search-icon">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const getInitials = (name) => {
  if (!name) return "AD";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDate = (isoString) => {
  if (!isoString) return "N/A";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "N/A";
  }
};

const getRoleStyle = (role) => {
  const r = (role || "").toLowerCase();
  if (r.includes("super")) return { backgroundColor: "#EDE9FE", color: "#6B21A8" };
  if (r.includes("manager")) return { backgroundColor: "#FEF3C7", color: "#B45309" };
  return { backgroundColor: "#E0F2FE", color: "#0284C7" };
};



const AdminAccount = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  // Admins List State
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [searchAdmin, setSearchAdmin] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Admin"
  });


  const fetchAdmins = async (user, profile) => {
    try {
      setAdminsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      let list = [];
      if (!error && Array.isArray(data)) {
        list = data.filter((u) => {
          const r = (u.role || u.roles || "").toString().toLowerCase();
          return r.includes("admin") || r === "manager";
        });
      }

      // Ensure current user is in the list
      const myId = user?.id;
      const myEmail = user?.email;
      const existingMeIndex = list.findIndex(
        (a) => (myId && a.id === myId) || (myEmail && a.email === myEmail)
      );

      const myData = {
        id: myId || "admin_primary",
        name: profile?.name || user?.user_metadata?.name || adminName || "Primary Admin",
        email: myEmail || adminEmail || "admin@faywalk.com",
        phone: profile?.phone || user?.user_metadata?.phone || phone || "",
        role: profile?.role || "Super Admin",
        status: "Active",
        created_at: profile?.created_at || user?.created_at || new Date().toISOString(),
        isCurrent: true
      };

      if (existingMeIndex >= 0) {
        list[existingMeIndex] = { ...list[existingMeIndex], ...myData, isCurrent: true };
      } else {
        list.unshift(myData);
      }

      setAdmins(list);
    } catch (err) {
      console.error("Error loading admins:", err);
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        setLoading(true);
        const user = await authService.getUser();
        if (user) {
          setCurrentUser(user);
          setAdminEmail(user.email || "");

          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            setAdminName(profile.name || "");
            setPhone(profile.phone || "");
            setRole(profile.role || "admin");
            fetchAdmins(user, profile);
          } else {
            const fallbackName = user.user_metadata?.name || "";
            const fallbackPhone = user.user_metadata?.phone || "";
            setAdminName(fallbackName);
            setPhone(fallbackPhone);
            setRole("admin");
            fetchAdmins(user, { name: fallbackName, phone: fallbackPhone, role: "admin" });
          }
        } else {
          fetchAdmins(null, null);
        }
      } catch (error) {
        console.error("Error loading admin profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminProfile();
  }, []);




  // Open modal to add admin
  const handleOpenAddModal = () => {
    setEditingAdmin(null);
    setAdminForm({
      name: "",
      email: "",
      phone: "",
      role: "Admin"
    });
    setShowAddModal(true);
  };

  // Open modal to edit admin
  const handleOpenEditModal = (admin) => {
    setEditingAdmin(admin);
    setAdminForm({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      role: admin.role || "Admin"
    });
    setShowAddModal(true);
  };

  // Submit add or edit admin
  const handleSaveAdminSubmit = async (e) => {
    e.preventDefault();
    const cleanName = adminForm.name.trim();
    const cleanEmail = adminForm.email.trim().toLowerCase();
    const cleanPhone = adminForm.phone.trim();

    if (!cleanName || !cleanEmail) {
      alert("Please provide both name and email.");
      return;
    }

    try {
      setIsSavingAdmin(true);
      const isEdit = Boolean(editingAdmin);

      if (isEdit) {
        // Editing an existing admin row
        const updatePayload = {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: "admin",
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", editingAdmin.id);

        if (error) {
          console.warn("Supabase update notice:", error.message);
        }

        setAdmins((prev) =>
          prev.map((a) =>
            a.id === editingAdmin.id ? { ...a, ...updatePayload, role: "Admin" } : a
          )
        );

        setShowAddModal(false);
        setEditingAdmin(null);
        alert("Admin updated successfully!");
        return;
      }

      // Adding admin: Check if user with this email already exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (existingUser) {
        // User exists: only update role to 'admin' (and update name/phone if supplied)
        const updatePayload = {
          role: "admin",
          updated_at: new Date().toISOString(),
          ...(cleanName ? { name: cleanName } : {}),
          ...(cleanPhone ? { phone: cleanPhone } : {})
        };

        const { error: updateError } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", existingUser.id);

        if (updateError) {
          console.warn("Error updating user role to admin:", updateError.message);
        }

        const promotedAdmin = {
          ...existingUser,
          ...updatePayload,
          name: cleanName || existingUser.name,
          email: cleanEmail,
          phone: cleanPhone || existingUser.phone,
          role: "Admin"
        };

        setAdmins((prev) => {
          const exists = prev.some(
            (a) => a.id === existingUser.id || a.email?.toLowerCase() === cleanEmail
          );
          if (exists) {
            return prev.map((a) =>
              a.id === existingUser.id || a.email?.toLowerCase() === cleanEmail
                ? promotedAdmin
                : a
            );
          }
          return [promotedAdmin, ...prev];
        });

        setShowAddModal(false);
        setEditingAdmin(null);
        alert("Existing user found. Role updated to Admin successfully!");
      } else {
        // User does not exist in users table:
        // Provision user via google-auth-sync edge function which creates auth.users & public.users records
        const { data: syncData, error: syncError } = await supabase.functions.invoke("google-auth-sync", {
          body: {
            email: cleanEmail,
            name: cleanName,
            phone: cleanPhone || undefined
          }
        });

        if (syncError || !syncData?.success) {
          throw new Error(syncError?.message || syncData?.error || "Failed to create user in database.");
        }

        const newUserId = syncData.userId;

        // Set role to 'admin' in users table
        const { error: roleError } = await supabase
          .from("users")
          .update({
            role: "admin",
            name: cleanName,
            phone: cleanPhone || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", newUserId);

        if (roleError) {
          console.warn("Notice updating admin role:", roleError.message);
        }

        const newPayload = {
          id: newUserId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: "Admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setAdmins((prev) => [newPayload, ...prev]);

        setShowAddModal(false);
        setEditingAdmin(null);
        alert("New administrator user created in database successfully!");
      }
    } catch (err) {
      console.error("Error saving admin:", err);
      alert("Failed to save admin: " + err.message);
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Remove admin: change role to 'user'
  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    if (deletingAdmin.isCurrent || (currentUser && deletingAdmin.id === currentUser.id)) {
      alert("You cannot remove your own active administrator account.");
      setDeletingAdmin(null);
      return;
    }

    try {
      setIsDeletingAdmin(true);
      await supabase
        .from("users")
        .update({ role: "user" })
        .eq("id", deletingAdmin.id);

      setAdmins((prev) => prev.filter((a) => a.id !== deletingAdmin.id));
      setDeletingAdmin(null);
    } catch (err) {
      console.error("Error updating admin role to user:", err);
      setAdmins((prev) => prev.filter((a) => a.id !== deletingAdmin.id));
      setDeletingAdmin(null);
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  // Filtered list
  const filteredAdmins = admins.filter((a) => {
    if (!searchAdmin.trim()) return true;
    const q = searchAdmin.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.role || "").toLowerCase().includes(q) ||
      (a.phone || "").includes(q)
    );
  });

  if (loading) {
    return (
      <div className="aa" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: '#888' }}>
        Loading admin details...
      </div>
    );
  }

  return (
    <div className="aa">
      <div className="aa__page-header">
        <h1 className="aa__page-title">Settings</h1>
        <p className="aa__page-sub">Admin account</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="ao__toolbar">
        <div className="ao__toolbar-left">
          <div className="ao__search-box">
            <SearchIcon />
            <input
              type="text"
              className="ao__search-input"
              placeholder="Search admins..."
              value={searchAdmin}
              onChange={(e) => setSearchAdmin(e.target.value)}
            />
          </div>
        </div>

        <div className="ao__toolbar-right">
          <button className="aa__btn-add" onClick={handleOpenAddModal}>
            <PlusIcon /> Add Admin
          </button>
        </div>
      </div>

      <div className="ao__table-wrap" style={{ marginBottom: "36px" }}>
        <table className="ao__table">
          <thead>
            <tr>
              <th>Admin User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Created Date</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminsLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "36px", color: "#888" }}>
                  Loading administrators...
                </td>
              </tr>
            ) : filteredAdmins.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="aa__empty-state">
                    <div className="aa__empty-state-title">No admins found</div>
                    <div>Try adjusting your search or click "Add Admin" to create one.</div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAdmins.map((admin) => (
                <tr key={admin.id} className="ao__row">
                  <td>
                    <div className="aa__user-cell">
                      <div className="aa__avatar">
                        {getInitials(admin.name)}
                      </div>
                      <div className="aa__user-meta">
                        <div className="aa__user-name-row">
                          <span className="aa__user-name">{admin.name || "Admin"}</span>
                          {admin.isCurrent && <span className="aa__you-pill">You</span>}
                        </div>
                        <span className="aa__user-sub">{admin.role || "Admin"}</span>
                      </div>
                    </div>
                  </td>
                  <td>{admin.email || "—"}</td>
                  <td>{admin.phone || "—"}</td>
                  <td>
                    <span className="ao__badge" style={getRoleStyle(admin.role)}>
                      {admin.role || "Admin"}
                    </span>
                  </td>
                  <td>{formatDate(admin.created_at)}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "16px", alignItems: "center", justifyContent: "flex-end" }}>
                      <button
                        className="ao__view-link"
                        onClick={() => handleOpenEditModal(admin)}
                      >
                        Edit
                      </button>
                      {!admin.isCurrent && (
                        <button
                          className="ao__view-link"
                          style={{ color: "#EF4444" }}
                          onClick={() => setDeletingAdmin(admin)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>



      {/* ── Add / Edit Admin Modal ── */}
      <AdminModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingAdmin ? "Edit Administrator" : "Add New Administrator"}
        maxWidth={540}
        footer={
          <>
            <button
              type="button"
              className="aa__btn-secondary"
              onClick={() => setShowAddModal(false)}
              disabled={isSavingAdmin}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-form"
              className="aa__btn-save admin-btn-with-spinner"
              disabled={isSavingAdmin}
            >
              {isSavingAdmin ? (
                <>
                  <span className="admin-btn-spinner" />
                  {editingAdmin ? "Updating Admin..." : "Adding Admin..."}
                </>
              ) : (
                editingAdmin ? "Update Admin" : "Add Admin"
              )}
            </button>
          </>
        }
      >
        <form id="admin-form" onSubmit={handleSaveAdminSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Line 1: Full Name & Email Address */}
            <div className="aa__field">
              <label className="aa__label">Full Name *</label>
              <input
                className="aa__input"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              />
            </div>

            <div className="aa__field">
              <label className="aa__label">Email Address *</label>
              <input
                className="aa__input"
                type="email"
                required
                placeholder="e.g. admin@faywalk.com"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              />
            </div>

            {/* Line 2: Phone Number & Role */}
            <div className="aa__field">
              <label className="aa__label">Phone Number</label>
              <input
                className="aa__input"
                type="tel"
                placeholder="e.g. +91 98400 12345"
                value={adminForm.phone}
                onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
              />
            </div>

            <div className="aa__field">
              <label className="aa__label">Role</label>
              <select
                className="aa__input"
                value={adminForm.role}
                onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
              >
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
        </form>
      </AdminModal>

      {/* ── Delete Confirmation Modal ── */}
      <AdminModal
        isOpen={Boolean(deletingAdmin)}
        onClose={() => setDeletingAdmin(null)}
        title="Remove Administrator"
        maxWidth={440}
        footer={
          <>
            <button
              type="button"
              className="aa__btn-secondary"
              onClick={() => setDeletingAdmin(null)}
              disabled={isDeletingAdmin}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aa__btn-danger admin-btn-with-spinner"
              onClick={handleDeleteAdmin}
              disabled={isDeletingAdmin}
            >
              {isDeletingAdmin ? (
                <>
                  <span className="admin-btn-spinner" />
                  Removing Admin...
                </>
              ) : (
                "Remove Admin"
              )}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
          Are you sure you want to remove <strong>{deletingAdmin?.name || deletingAdmin?.email}</strong> as an administrator? Their role will be changed to a regular user and they will lose access to the admin dashboard.
        </p>
      </AdminModal>
    </div>
  );
};

export default AdminAccount;