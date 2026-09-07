import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Unauthorized() {
  const { user } = useAuth();
  const destination = user?.role === "ADMIN" ? "/dashboard" : "/submissions";
  return <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center text-center"><div className="card p-8"><ShieldAlert className="mx-auto mb-4 text-rose-600" size={36}/><h1 className="text-xl font-semibold text-slate-900">Access restricted</h1><p className="mt-2 text-sm text-slate-600">You do not have permission to open this page.</p><Link className="btn-primary mt-6 inline-flex" to={destination}>Go to my workspace</Link></div></div>;
}
