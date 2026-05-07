"use client";

import { useState } from "react";
import TopBar from "@/components/layout/TopBar";

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    roles: ["Product Designer", "UX Lead", "Design Engineer"],
    location: "Remote",
    remoteOnly: true,
    salaryMin: 120000,
    salaryMax: 200000,
    skills: ["Figma", "Design Systems", "React", "User Research", "CSS", "Prototyping"],
    autoApplyThreshold: 87,
    sources: ["LinkedIn", "Indeed", "Greenhouse", "Lever"],
  });

  const [newRole, setNewRole] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    setSaving(true);
    // Simulate save delay
    setTimeout(() => {
      setSaving(false);
      showToast("Preferences saved successfully");
    }, 500);
  };

  const addRole = () => {
    if (newRole.trim() && !prefs.roles.includes(newRole.trim())) {
      setPrefs({ ...prefs, roles: [...prefs.roles, newRole.trim()] });
      setNewRole("");
    }
  };

  const removeRole = (role: string) => {
    setPrefs({ ...prefs, roles: prefs.roles.filter((r) => r !== role) });
  };

  const addSkill = () => {
    if (newSkill.trim() && !prefs.skills.includes(newSkill.trim())) {
      setPrefs({ ...prefs, skills: [...prefs.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setPrefs({ ...prefs, skills: prefs.skills.filter((s) => s !== skill) });
  };

  return (
    <>
      <TopBar
        title="Preferences"
        subtitle="Configure your job search agent"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border border-brand-500 bg-brand-500 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        }
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-brand-700 text-white px-4 py-2.5 rounded-lg text-[12px] shadow-xl flex items-center gap-2">
          <span className="text-white/80">✓</span>
          {toast}
        </div>
      )}

      <div className="p-4 px-5 flex-1">
        <div className="max-w-2xl space-y-4">
          {/* Target roles */}
          <SettingsCard title="Target Roles">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {prefs.roles.map((role) => (
                <span key={role} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-brand-300 bg-brand-50 text-brand-700">
                  {role}
                  <button onClick={() => removeRole(role)} className="text-brand-500 hover:text-brand-700 cursor-pointer">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRole()}
                placeholder="Add a role..."
                className="flex-1 px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300"
              />
              <button onClick={addRole} className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg hover:bg-page-bg transition-colors cursor-pointer">
                Add
              </button>
            </div>
          </SettingsCard>

          {/* Location */}
          <SettingsCard title="Location">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.remoteOnly}
                  onChange={(e) => setPrefs({ ...prefs, remoteOnly: e.target.checked })}
                  className="accent-brand-500"
                />
                Remote only
              </label>
              <input
                type="text"
                value={prefs.location}
                onChange={(e) => setPrefs({ ...prefs, location: e.target.value })}
                placeholder="Preferred location"
                className="flex-1 px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300"
              />
            </div>
          </SettingsCard>

          {/* Salary */}
          <SettingsCard title="Salary Range">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-text-secondary mb-1 block">Minimum</label>
                <input
                  type="number"
                  value={prefs.salaryMin}
                  onChange={(e) => setPrefs({ ...prefs, salaryMin: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300"
                />
              </div>
              <span className="text-text-secondary mt-4">–</span>
              <div className="flex-1">
                <label className="text-[11px] text-text-secondary mb-1 block">Maximum</label>
                <input
                  type="number"
                  value={prefs.salaryMax}
                  onChange={(e) => setPrefs({ ...prefs, salaryMax: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300"
                />
              </div>
            </div>
          </SettingsCard>

          {/* Skills */}
          <SettingsCard title="Skills">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {prefs.skills.map((skill) => (
                <span key={skill} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-card-border text-text-dim bg-page-bg">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="text-text-secondary hover:text-text-primary cursor-pointer">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                placeholder="Add a skill..."
                className="flex-1 px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300"
              />
              <button onClick={addSkill} className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg hover:bg-page-bg transition-colors cursor-pointer">
                Add
              </button>
            </div>
          </SettingsCard>

          {/* Auto-apply threshold */}
          <SettingsCard title="Auto-Apply Settings">
            <div>
              <label className="text-[12px] text-text-dim mb-2 block">
                Auto-apply threshold: <span className="font-medium text-brand-700">{prefs.autoApplyThreshold}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="1"
                value={prefs.autoApplyThreshold}
                onChange={(e) => setPrefs({ ...prefs, autoApplyThreshold: Number(e.target.value) })}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #1D9E75 0%, #1D9E75 ${((prefs.autoApplyThreshold - 50) / 50) * 100}%, #e0e0d8 ${((prefs.autoApplyThreshold - 50) / 50) * 100}%, #e0e0d8 100%)`,
                }}
              />
              <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                <span>50% — Apply broadly</span>
                <span>100% — Perfect matches only</span>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-card-border">
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
