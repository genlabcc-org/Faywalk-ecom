// src/hooks/useAdmin.js
import { useState, useEffect } from "react";
import { authService } from "../services/authService";

export function useAdmin() {
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
        console.error("Admin check error:", error.message);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
}