"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { formatPrice } from "@/lib/utils";

interface Profile {
  id: number;
  storeName: string;
  ownerName: string;
  phone: string;
  district: { id: number; name: string } | null;
  creditLimit: number;
  creditUsed: number;
  status: string;
}

interface District {
  id: number;
  name: string;
}

function CreditBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color =
    pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-green";
  const textColor =
    pct > 80 ? "text-red-500" : pct > 60 ? "text-amber-600" : "text-green";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Credit Used</span>
        <span className={`font-grotesk font-semibold ${textColor}`}>
          {formatPrice(used)} / {formatPrice(limit)}
        </span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 text-right">
        {pct.toFixed(0)}% used
      </p>
    </div>
  );
}

export default function AccountPage() {
  const { user, setAuth, token } = useAuthStore();
  const qc = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [districtId, setDistrictId] = useState<number | "">("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["my-profile"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  useEffect(() => {
    if (profile) {
      setStoreName(profile.storeName);
      setOwnerName(profile.ownerName || "");
      setDistrictId(profile.district?.id || "");
    }
  }, [profile]);

  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ["districts"],
    queryFn: () => api.get("/districts").then((r) => r.data),
  });

  const updateProfile = useMutation({
    mutationFn: (body: { storeName: string; ownerName: string; districtId?: number }) =>
      api.patch("/users/me", body).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      if (token && user) {
        setAuth(token, { ...user, storeName: data.storeName });
      }
      setProfileMsg({ type: "ok", text: "Profile updated successfully." });
      setEditMode(false);
    },
    onError: () => {
      setProfileMsg({ type: "err", text: "Failed to update profile." });
    },
  });

  const changePassword = useMutation({
    mutationFn: (body: { oldPassword: string; newPassword: string }) =>
      api.post("/users/me/change-password", body),
    onSuccess: () => {
      setPwMsg({ type: "ok", text: "Password changed successfully." });
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to change password.";
      setPwMsg({ type: "err", text: msg });
    },
  });

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    updateProfile.mutate({
      storeName,
      ownerName,
      districtId: districtId ? Number(districtId) : undefined,
    });
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: "Password must be at least 8 characters." });
      return;
    }
    changePassword.mutate({ oldPassword: oldPw, newPassword: newPw });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-grotesk font-bold text-2xl text-ink">My Account</h1>

      {/* Credit */}
      {profile && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-grotesk font-semibold text-sm text-ink mb-4">
            Credit Limit
          </h2>
          <CreditBar used={profile.creditUsed} limit={profile.creditLimit} />
          <p className="text-xs text-gray-400 mt-3">
            Available:{" "}
            <span className="font-semibold text-ink">
              {formatPrice(Math.max(0, profile.creditLimit - profile.creditUsed))}
            </span>
          </p>
        </div>
      )}

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-grotesk font-semibold text-sm text-ink">
            Store Profile
          </h2>
          {!editMode && (
            <button
              onClick={() => {
                setEditMode(true);
                setProfileMsg(null);
              }}
              className="text-xs text-blue font-medium hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {!editMode ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Store Name</span>
              <span className="font-medium text-ink">{profile?.storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Owner Name</span>
              <span className="font-medium text-ink">{profile?.ownerName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Phone</span>
              <span className="font-medium text-ink">{profile?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">District</span>
              <span className="font-medium text-ink">
                {profile?.district?.name || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span
                className={`font-medium ${
                  profile?.status === "ACTIVE" ? "text-green" : "text-red-500"
                }`}
              >
                {profile?.status}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Store Name
              </label>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Owner Name
              </label>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                District
              </label>
              <select
                value={districtId}
                onChange={(e) => setDistrictId(Number(e.target.value) || "")}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue"
              >
                <option value="">Select…</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {profileMsg && (
              <div
                className={`flex items-center gap-2 text-xs rounded-xl p-3 ${
                  profileMsg.type === "ok"
                    ? "bg-green-light text-green"
                    : "bg-red-50 text-red-500"
                }`}
              >
                {profileMsg.type === "ok" ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                {profileMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="flex-1 bg-blue hover:bg-blue-dark disabled:bg-gray-200 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex-1 border border-gray-200 text-sm text-gray-600 hover:bg-blue-pale py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-grotesk font-semibold text-sm text-ink mb-4">
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
            />
          </div>

          {pwMsg && (
            <div
              className={`flex items-center gap-2 text-xs rounded-xl p-3 ${
                pwMsg.type === "ok"
                  ? "bg-green-light text-green"
                  : "bg-red-50 text-red-500"
              }`}
            >
              {pwMsg.type === "ok" ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertCircle size={13} />
              )}
              {pwMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={changePassword.isPending}
            className="w-full bg-blue hover:bg-blue-dark disabled:bg-gray-200 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            {changePassword.isPending ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
