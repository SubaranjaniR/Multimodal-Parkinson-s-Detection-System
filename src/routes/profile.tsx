import { api } from "@/lib/api";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  User, Lock, Mail, Trash2, Loader2, ShieldAlert, Sparkles, Key, Eye, EyeOff
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — NeuroPark AI" },
      { name: "description", content: "Manage your neurological screening profile details and password settings." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("np-token");
    if (!token) {
      router.navigate({ to: "/login" });
      return;
    }

    const loadProfile = async () => {
      try {
        const u = await api.getMe();
        setUser(u);
        setName(u.name);
        setEmail(u.email);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setUpdatingProfile(true);
    try {
      const res = await api.updateProfile({ name, email });
      setUser(res.user);
      localStorage.setItem("np-user", JSON.stringify(res.user));
      window.dispatchEvent(new Event("auth-change"));
      toast.success("Profile details updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setUpdatingPassword(true);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password. Verify your current password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount();
      localStorage.removeItem("np-token");
      localStorage.removeItem("np-user");
      localStorage.removeItem("np-result");
      window.dispatchEvent(new Event("auth-change"));
      toast.success("Your account and all associated prediction data were permanently deleted.");
      router.navigate({ to: "/signup" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete account. Please try again.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-aurora">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Header Section */}
        <header>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Settings</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Patient Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account details and security settings</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: Edit Profile details */}
          <div className="glass rounded-2xl p-6 sm:p-8 border border-border/50 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Update your name and primary email address</p>
              
              <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="name">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 focus:bg-card focus:border-primary focus:outline-none transition-all text-sm text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 focus:bg-card focus:border-primary focus:outline-none transition-all text-sm text-foreground"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full rounded-xl gradient-brand text-white py-2.5 font-semibold shadow-md hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-4 text-sm"
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Save Personal Info
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Change Password */}
          <div className="glass rounded-2xl p-6 sm:p-8 border border-border/50 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Change Password
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Ensure your screening account remains secure</p>
              
              <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="oldPassword">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="oldPassword"
                      type={showOld ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card/50 focus:bg-card focus:border-primary focus:outline-none transition-all text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center h-8 w-8"
                    >
                      {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card/50 focus:bg-card focus:border-primary focus:outline-none transition-all text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center h-8 w-8"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card/50 focus:bg-card focus:border-primary focus:outline-none transition-all text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center h-8 w-8"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full rounded-xl gradient-brand text-white py-2.5 font-semibold shadow-md hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-4 text-sm"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Danger Zone: Delete Account */}
        <div className="glass border-red-500/20 dark:border-red-500/10 rounded-2xl p-6 sm:p-8 space-y-4">
          <h3 className="font-display text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Danger Zone
          </h3>
          <p className="text-sm text-muted-foreground">
            Deleting your account will permanently erase your entire history of clinical symptom assessments, uploaded voice audio files, handwriting images, and generated clinical report PDFs. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all font-semibold px-5 py-2.5 text-sm cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account...
          </button>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative glass w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-red-500/20 bg-background/95">
            <h3 className="font-display text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
              Permanently Delete Account?
            </h3>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Are you absolutely sure? This will remove all your data from our servers. You will lose access to your diagnostic predictions, reports, and badges immediately.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm shadow-lg shadow-red-600/30 hover:bg-red-700 flex items-center gap-2 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
