import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";
import "./AdminRoute.css";

export default function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await authService.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        const data = await authService.checkAdminUser(user.id);
        setIsAdmin(data?.role === "admin");
      } catch (error) {
        console.error("Error in admin route check:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="admin-loader" role="status">
        <span className="admin-loader__ring" aria-hidden="true" />
        <span className="admin-loader__label">Loading admin panel…</span>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}