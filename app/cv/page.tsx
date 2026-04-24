"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import type { CVContent, Experience, Education } from "@/types";

interface ExtractedProfile {
  name: string;
  headline: string;
  location: string;
  summary: string;
  skills: string[];
  roles: string[];
  experience: Experience[];
  education: Education[];
  certifications: string[];
  years_experience: number;
  salary_estimate_min: number;
  salary_estimate_max: number;
}

const emptyCV: CVContent = {
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
};

export default function CVPage() {
  const [cv, setCv] = useState<CVContent>(emptyCV);
  const [profileName, setProfileName] = useState("");
  const [profileHeadline, setProfileHeadline] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Hydrate from localStorage on mount — restores CV across navigation
  useEffect(() => {
    try {
      const cvRaw = localStorage.getItem("masterCV");
      if (cvRaw) {
        const saved = JSON.parse(cvRaw);
        setCv({
          summary: saved.summary || "",
          experience: saved.experience || [],
          education: saved.education || [],
          skills: saved.skills || [],
          certifications: saved.certifications || [],
        });
      }
      const profileRaw = localStorage.getItem("userProfile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        setProfileName(p.name || "");
        setProfileHeadline(p.headline || "");
        setProfileLocation(p.location || "");
      }
      const textRaw = localStorage.getItem("cvExtractedText");
      if (textRaw) setExtractedText(textRaw);
    } catch {
      // corrupted storage — ignore
    }
    setHydrated(true);
  }, []);

  // Autosave CV edits back to localStorage
  useEffect(() => {
    if (!hydrated) return; // don't write empty CV before hydration completes
    if (cv.summary || cv.experience.length > 0 || cv.skills.length > 0) {
      localStorage.setItem("masterCV", JSON.stringify(cv));
    }
  }, [cv, hydrated]);

  // Autosave profile header (name/headline/location) edits
  useEffect(() => {
    if (!hydrated) return;
    if (!profileName && !profileHeadline && !profileLocation) return;
    try {
      const existing = localStorage.getItem("userProfile");
      const profile = existing ? JSON.parse(existing) : {};
      profile.name = profileName;
      profile.headline = profileHeadline;
      profile.location = profileLocation;
      localStorage.setItem("userProfile", JSON.stringify(profile));
      window.dispatchEvent(new Event("profileUpdated"));
    } catch {
      // ignore
    }
  }, [profileName, profileHeadline, profileLocation, hydrated]);

  const handleUpload = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      showToast("Please upload a PDF file");
      return;
    }

    setUploading(true);
    setUploadStatus("idle");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/cv/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Upload failed");
        setUploadStatus("error");
        return;
      }

      const profile: ExtractedProfile = data.profile;
      setExtractedText(data.extractedText);
      setAiAnalyzed(data.aiAnalyzed);
      try { localStorage.setItem("cvExtractedText", data.extractedText || ""); } catch { /* ignore */ }

      // Populate CV from extracted profile
      setProfileName(profile.name || "");
      setProfileHeadline(profile.headline || "");
      setProfileLocation(profile.location || "");

      setCv({
        summary: profile.summary || "",
        experience: (profile.experience || []).map((exp: Experience) => ({
          title: exp.title || "",
          company: exp.company || "",
          location: exp.location || "",
          start_date: exp.start_date || "",
          end_date: exp.end_date || null,
          bullets: exp.bullets || [],
        })),
        education: (profile.education || []).map((edu: Education) => ({
          degree: edu.degree || "",
          school: edu.school || "",
          year: edu.year || "",
        })),
        skills: profile.skills || [],
        certifications: profile.certifications || [],
      });

      // Save profile to localStorage for dashboard matching
      const savedProfile = {
        name: profile.name,
        headline: profile.headline,
        skills: profile.skills,
        roles: profile.roles,
        location: profile.location,
        years_experience: profile.years_experience,
        salary_estimate_min: profile.salary_estimate_min,
        salary_estimate_max: profile.salary_estimate_max,
      };
      localStorage.setItem("userProfile", JSON.stringify(savedProfile));
      // Save full CV content for AI tailoring
      const masterCV = {
        summary: profile.summary || "",
        experience: profile.experience || [],
        education: profile.education || [],
        skills: profile.skills || [],
        certifications: profile.certifications || [],
      };
      localStorage.setItem("masterCV", JSON.stringify(masterCV));
      window.dispatchEvent(new Event("profileUpdated"));

      setUploadStatus("success");
      showToast(
        data.aiAnalyzed
          ? `CV analyzed with AI — found ${profile.skills.length} skills, ${profile.experience?.length || 0} roles`
          : `Text extracted — found ${profile.skills.length} skills (add API key for deeper analysis)`
      );
    } catch {
      showToast("Upload failed. Please try again.");
      setUploadStatus("error");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const updateExperience = (index: number, field: keyof Experience, value: string | string[] | null) => {
    const updated = [...cv.experience];
    updated[index] = { ...updated[index], [field]: value };
    setCv({ ...cv, experience: updated });
  };

  const addExperience = () => {
    setCv({
      ...cv,
      experience: [
        ...cv.experience,
        { title: "", company: "", location: "", start_date: "", end_date: null, bullets: [""] },
      ],
    });
  };

  const removeExperience = (index: number) => {
    if (!confirm("Remove this experience entry?")) return;
    setCv({ ...cv, experience: cv.experience.filter((_, i) => i !== index) });
  };

  const moveExperience = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= cv.experience.length) return;
    const updated = [...cv.experience];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setCv({ ...cv, experience: updated });
  };

  const addEducation = () => {
    setCv({ ...cv, education: [...cv.education, { degree: "", school: "", year: "" }] });
  };

  const removeEducation = (index: number) => {
    if (!confirm("Remove this education entry?")) return;
    setCv({ ...cv, education: cv.education.filter((_, i) => i !== index) });
  };

  const updateBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const updated = [...cv.experience];
    const bullets = [...updated[expIndex].bullets];
    bullets[bulletIndex] = value;
    updated[expIndex] = { ...updated[expIndex], bullets };
    setCv({ ...cv, experience: updated });
  };

  const addBullet = (expIndex: number) => {
    const updated = [...cv.experience];
    updated[expIndex] = { ...updated[expIndex], bullets: [...updated[expIndex].bullets, ""] };
    setCv({ ...cv, experience: updated });
  };

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    const updated = [...cv.experience];
    updated[expIndex] = {
      ...updated[expIndex],
      bullets: updated[expIndex].bullets.filter((_, i) => i !== bulletIndex),
    };
    setCv({ ...cv, experience: updated });
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...cv.education];
    updated[index] = { ...updated[index], [field]: value };
    setCv({ ...cv, education: updated });
  };

  const addSkill = () => {
    if (newSkill.trim() && !cv.skills.includes(newSkill.trim())) {
      setCv({ ...cv, skills: [...cv.skills, newSkill.trim()] });
      setNewSkill("");
      // Update localStorage profile
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        const profile = JSON.parse(saved);
        profile.skills = [...cv.skills, newSkill.trim()];
        localStorage.setItem("userProfile", JSON.stringify(profile));
      }
    }
  };

  const removeSkill = (skill: string) => {
    setCv({ ...cv, skills: cv.skills.filter((s) => s !== skill) });
  };

  const clearCV = useCallback(() => {
    if (!confirm("Clear your uploaded CV? This wipes all extracted data and your edits. Cannot be undone.")) {
      return;
    }
    setCv({ summary: "", experience: [], education: [], skills: [], certifications: [] });
    setProfileName("");
    setProfileHeadline("");
    setProfileLocation("");
    setExtractedText("");
    setUploadStatus("idle");
    setAiAnalyzed(false);
    setEditingSection(null);
    try {
      localStorage.removeItem("masterCV");
      localStorage.removeItem("userProfile");
      localStorage.removeItem("cvExtractedText");
      window.dispatchEvent(new Event("profileUpdated"));
    } catch {
      // ignore
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("CV cleared");
  }, []);

  const hasCV = cv.summary || cv.experience.length > 0 || cv.skills.length > 0;

  return (
    <>
      <TopBar
        title="CV Editor"
        subtitle={hasCV ? `${cv.skills.length} skills · ${cv.experience.length} roles` : "Upload your CV to get started"}
        actions={
          hasCV ? (
            <div className="flex gap-2">
              <button
                onClick={clearCV}
                className="py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border border-card-border bg-card-bg text-text-dim hover:bg-page-bg hover:text-red-600 hover:border-red-200 transition-colors"
              >
                Clear CV
              </button>
              <button
                onClick={async () => {
                  try {
                    showToast("Generating PDF...");
                    const res = await fetch("/api/cv/export-local", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: cv }),
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      showToast(data.error || "PDF export failed");
                      return;
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `cv-${(profileName || "tailored").toLowerCase().replace(/\s+/g, "-")}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast("PDF downloaded");
                  } catch {
                    showToast("PDF export failed");
                  }
                }}
                className="py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border border-card-border bg-card-bg text-text-primary hover:bg-page-bg transition-colors"
              >
                Export PDF
              </button>
              <a
                href="/dashboard"
                className="py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border border-brand-500 bg-brand-500 text-white hover:bg-brand-700 transition-colors"
              >
                AI Tailor for Job →
              </a>
            </div>
          ) : null
        }
      />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-text-primary text-white px-4 py-2.5 rounded-lg text-[12px] shadow-lg max-w-sm">
          {toast}
        </div>
      )}

      <div className="p-4 px-5 flex-1">
        {/* Upload zone — always visible at top */}
        <div
          className={`mb-4 border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-brand-500 bg-brand-50"
              : uploading
              ? "border-brand-300 bg-brand-50"
              : uploadStatus === "success"
              ? "border-brand-500 bg-brand-50"
              : "border-card-border bg-card-bg hover:border-brand-300 hover:bg-[#f9f9f7]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-brand-700">Analyzing your CV...</span>
            </div>
          ) : uploadStatus === "success" ? (
            <div>
              <div className="text-[13px] font-medium text-brand-700 mb-1">
                CV uploaded successfully {aiAnalyzed ? "(AI analyzed)" : "(basic extraction)"}
              </div>
              <p className="text-[11px] text-text-secondary">
                Drop another PDF to replace, edit your CV below, or{" "}
                <button
                  onClick={(e) => { e.stopPropagation(); clearCV(); }}
                  className="text-red-600 hover:underline cursor-pointer"
                >
                  clear it
                </button>
              </p>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-page-bg border border-card-border flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-text-secondary">
                  <path d="M10 4v12M4 10h12" />
                </svg>
              </div>
              <div className="text-[13px] font-medium mb-1">
                Drop your CV here or click to upload
              </div>
              <p className="text-[11px] text-text-secondary">
                PDF format · We&apos;ll extract your skills, experience, and match you to jobs
              </p>
            </div>
          )}
        </div>

        {/* Warn the user when basic extraction was used — it gets education/experience wrong on complex CVs */}
        {hasCV && uploadStatus === "success" && !aiAnalyzed && (
          <div className="mb-4 px-4 py-3 bg-amber-badge-bg border border-amber-bar rounded-xl text-[12px] text-amber-badge-text">
            <div className="font-medium mb-0.5">Basic extraction was used (no AI provider configured)</div>
            <div className="text-[11px] opacity-90">
              The regex parser may misclassify sections on unusual CV layouts. For accurate extraction,
              add <code className="font-mono bg-white/40 px-1 rounded">ZAI_API_KEY</code> or <code className="font-mono bg-white/40 px-1 rounded">ANTHROPIC_API_KEY</code> to <code className="font-mono bg-white/40 px-1 rounded">.env.local</code> and re-upload.
              You can also fix any wrong fields below by clicking Edit.
            </div>
          </div>
        )}

        {/* CV content — shown after upload */}
        {hasCV && (
          <div className="grid grid-cols-[1fr_400px] gap-4">
            {/* Editor */}
            <div className="flex flex-col gap-3">
              {/* Summary */}
              <Section
                title="Professional Summary"
                editing={editingSection === "summary"}
                onToggle={() => setEditingSection(editingSection === "summary" ? null : "summary")}
              >
                {editingSection === "summary" ? (
                  <textarea
                    value={cv.summary}
                    onChange={(e) => setCv({ ...cv, summary: e.target.value })}
                    className="w-full h-24 px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg resize-none focus:outline-none focus:border-brand-300"
                  />
                ) : (
                  <p className="text-[13px] text-text-dim leading-relaxed">
                    {cv.summary || "No summary extracted. Click Edit to add one."}
                  </p>
                )}
              </Section>

              {/* Experience */}
              <Section
                title={`Experience (${cv.experience.length})`}
                editing={editingSection === "experience"}
                onToggle={() => setEditingSection(editingSection === "experience" ? null : "experience")}
              >
                {cv.experience.length === 0 && editingSection !== "experience" && (
                  <p className="text-[12px] text-text-secondary">No experience extracted. Click Edit to add.</p>
                )}

                {/* EDIT MODE — proper form layout */}
                {editingSection === "experience" && (
                  <div className="space-y-4">
                    {cv.experience.map((exp, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-card-border bg-page-bg/40 p-4 space-y-3"
                      >
                        {/* Card header: numbered, with reorder + delete */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-[12px] font-medium text-text-dim">
                              {exp.title || exp.company || "New position"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveExperience(i, "up")}
                              disabled={i === 0}
                              title="Move up"
                              className="w-7 h-7 rounded-md text-text-secondary hover:bg-card-bg hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >↑</button>
                            <button
                              onClick={() => moveExperience(i, "down")}
                              disabled={i === cv.experience.length - 1}
                              title="Move down"
                              className="w-7 h-7 rounded-md text-text-secondary hover:bg-card-bg hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >↓</button>
                            <button
                              onClick={() => removeExperience(i)}
                              title="Remove this entry"
                              className="w-7 h-7 rounded-md text-text-secondary hover:bg-red-50 hover:text-red-600 cursor-pointer text-[14px]"
                            >&times;</button>
                          </div>
                        </div>

                        {/* Row 1: Title + Company */}
                        <div className="grid grid-cols-2 gap-3">
                          <FieldGroup label="Job title">
                            <input
                              value={exp.title}
                              onChange={(e) => updateExperience(i, "title", e.target.value)}
                              placeholder="Senior Product Designer"
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                          <FieldGroup label="Company">
                            <input
                              value={exp.company}
                              onChange={(e) => updateExperience(i, "company", e.target.value)}
                              placeholder="Stripe"
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                        </div>

                        {/* Row 2: Location + Dates */}
                        <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
                          <FieldGroup label="Location">
                            <input
                              value={exp.location}
                              onChange={(e) => updateExperience(i, "location", e.target.value)}
                              placeholder="Remote"
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                          <FieldGroup label="Start">
                            <input
                              type="month"
                              value={exp.start_date}
                              onChange={(e) => updateExperience(i, "start_date", e.target.value)}
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                          <FieldGroup label="End" hint="leave blank for Present">
                            <input
                              type="month"
                              value={exp.end_date || ""}
                              onChange={(e) => updateExperience(i, "end_date", e.target.value || null)}
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                        </div>

                        {/* Bullets */}
                        <div>
                          <div className="text-[11px] font-medium text-text-dim mb-1.5">
                            Achievements ({exp.bullets.filter(b => b).length})
                          </div>
                          <div className="space-y-1.5">
                            {exp.bullets.map((bullet, j) => (
                              <div key={j} className="group flex gap-2 items-start">
                                <span className="text-text-secondary mt-2 select-none">•</span>
                                <textarea
                                  value={bullet}
                                  onChange={(e) => updateBullet(i, j, e.target.value)}
                                  placeholder="Quantified achievement (e.g. Increased conversion 25% via redesigned onboarding)"
                                  rows={Math.max(1, Math.ceil(bullet.length / 90))}
                                  className="flex-1 px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg resize-none focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                                />
                                <button
                                  onClick={() => removeBullet(i, j)}
                                  title="Remove this bullet"
                                  className="w-7 h-7 rounded-md text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-opacity text-[14px]"
                                >&times;</button>
                              </div>
                            ))}
                            <button
                              onClick={() => addBullet(i)}
                              className="text-[11px] text-brand-700 hover:text-brand-500 cursor-pointer pl-4"
                            >
                              + Add bullet point
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add new experience */}
                    <button
                      onClick={addExperience}
                      className="w-full py-2.5 rounded-xl text-[12px] font-medium border border-dashed border-card-border text-text-dim hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
                    >
                      + Add experience
                    </button>
                  </div>
                )}

                {/* READ MODE */}
                {editingSection !== "experience" && cv.experience.map((exp, i) => (
                  <div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-card-border" : ""}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[13px] font-medium">{exp.title}</div>
                        <div className="text-[12px] text-text-secondary">{exp.company} · {exp.location}</div>
                      </div>
                      <span className="text-[11px] text-text-secondary">{exp.start_date} – {exp.end_date || "Present"}</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {exp.bullets.filter(b => b).map((bullet, j) => (
                        <li key={j} className="text-[12px] text-text-dim pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-text-secondary">{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Section>

              {/* Education */}
              <Section
                title="Education"
                editing={editingSection === "education"}
                onToggle={() => setEditingSection(editingSection === "education" ? null : "education")}
              >
                {cv.education.length === 0 && editingSection !== "education" && (
                  <p className="text-[12px] text-text-secondary">No education extracted. Click Edit to add.</p>
                )}

                {/* EDIT MODE */}
                {editingSection === "education" && (
                  <div className="space-y-3">
                    {cv.education.map((edu, i) => (
                      <div key={i} className="rounded-xl border border-card-border bg-page-bg/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-[12px] font-medium text-text-dim">
                              {edu.degree || edu.school || "New entry"}
                            </span>
                          </div>
                          <button
                            onClick={() => removeEducation(i)}
                            title="Remove this entry"
                            className="w-7 h-7 rounded-md text-text-secondary hover:bg-red-50 hover:text-red-600 cursor-pointer text-[14px]"
                          >&times;</button>
                        </div>
                        <div className="grid grid-cols-[2fr_2fr_1fr] gap-3">
                          <FieldGroup label="Degree">
                            <input
                              value={edu.degree}
                              onChange={(e) => updateEducation(i, "degree", e.target.value)}
                              placeholder="MBA"
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                          <FieldGroup label="School">
                            <input
                              value={edu.school}
                              onChange={(e) => updateEducation(i, "school", e.target.value)}
                              placeholder="Institute of Business Administration"
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                          <FieldGroup label="Year">
                            <input
                              value={edu.year}
                              onChange={(e) => updateEducation(i, "year", e.target.value)}
                              placeholder="2020"
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                            />
                          </FieldGroup>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addEducation}
                      className="w-full py-2.5 rounded-xl text-[12px] font-medium border border-dashed border-card-border text-text-dim hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
                    >
                      + Add education
                    </button>
                  </div>
                )}

                {/* READ MODE */}
                {editingSection !== "education" && cv.education.map((edu, i) => (
                  <div key={i} className={i > 0 ? "mt-2.5 pt-2.5 border-t border-card-border" : ""}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[13px] font-medium">{edu.degree}</div>
                        <div className="text-[12px] text-text-secondary">{edu.school}</div>
                      </div>
                      <span className="text-[11px] text-text-secondary">{edu.year}</span>
                    </div>
                  </div>
                ))}
              </Section>

              {/* Skills */}
              <Section
                title={`Skills (${cv.skills.length})`}
                editing={editingSection === "skills"}
                onToggle={() => setEditingSection(editingSection === "skills" ? null : "skills")}
              >
                {cv.skills.length === 0 && editingSection !== "skills" && (
                  <p className="text-[12px] text-text-secondary">No skills extracted. Click Edit to add.</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {cv.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`group flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                        editingSection === "skills"
                          ? "border-brand-300 bg-brand-50 text-brand-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          : "border-card-border text-text-dim bg-page-bg"
                      }`}
                    >
                      {skill}
                      {editingSection === "skills" && (
                        <button
                          onClick={() => removeSkill(skill)}
                          className="cursor-pointer opacity-60 hover:opacity-100"
                          title="Remove"
                        >&times;</button>
                      )}
                    </span>
                  ))}
                </div>
                {editingSection === "skills" && (
                  <>
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSkill()}
                        placeholder="Type a skill and press Enter (e.g. Figma, React, Google Ads)"
                        className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300"
                      />
                      <button
                        onClick={addSkill}
                        disabled={!newSkill.trim()}
                        className="px-4 py-2 text-[13px] rounded-lg border border-brand-500 bg-brand-500 text-white hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-2">
                      Click a skill chip to remove it. Press Enter in the input to add.
                    </p>
                  </>
                )}
              </Section>

              {/* Raw extracted text (collapsible) */}
              {extractedText && (
                <details className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 text-[13px] font-medium cursor-pointer hover:bg-page-bg">
                    Raw extracted text
                  </summary>
                  <div className="px-4 pb-4">
                    <pre className="text-[11px] text-text-dim whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-page-bg p-3 rounded-lg">
                      {extractedText}
                    </pre>
                  </div>
                </details>
              )}
            </div>

            {/* Preview */}
            <div className="bg-card-bg border border-card-border rounded-xl p-6 h-fit sticky top-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold">{profileName || "Your Name"}</h2>
                <p className="text-xs text-text-secondary">{profileHeadline || "Upload CV to populate"}</p>
                {profileLocation && <p className="text-[11px] text-text-secondary mt-1">{profileLocation}</p>}
              </div>

              {cv.summary && (
                <div className="border-t border-card-border pt-3 mb-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Summary</h4>
                  <p className="text-[11px] text-text-dim leading-relaxed">{cv.summary}</p>
                </div>
              )}

              {cv.experience.length > 0 && (
                <div className="border-t border-card-border pt-3 mb-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Experience</h4>
                  {cv.experience.map((exp, i) => (
                    <div key={i} className={i > 0 ? "mt-2.5" : ""}>
                      <div className="text-[11px] font-medium">{exp.title}</div>
                      <div className="text-[10px] text-text-secondary">{exp.company} · {exp.start_date} – {exp.end_date || "Present"}</div>
                      <ul className="mt-1 space-y-0.5">
                        {exp.bullets.filter(b => b).map((b, j) => (
                          <li key={j} className="text-[10px] text-text-dim pl-2 relative before:content-['•'] before:absolute before:left-0 before:text-text-secondary">{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {cv.education.length > 0 && (
                <div className="border-t border-card-border pt-3 mb-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Education</h4>
                  {cv.education.map((edu, i) => (
                    <div key={i} className="text-[11px]">
                      <span className="font-medium">{edu.degree}</span>
                      <span className="text-text-secondary"> · {edu.school} · {edu.year}</span>
                    </div>
                  ))}
                </div>
              )}

              {cv.skills.length > 0 && (
                <div className="border-t border-card-border pt-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {cv.skills.map((skill) => (
                      <span key={skill} className="px-1.5 py-0.5 rounded text-[9px] bg-page-bg text-text-dim">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ title, editing, onToggle, children }: { title: string; editing: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`bg-card-bg border rounded-xl overflow-hidden transition-colors ${editing ? "border-brand-300" : "border-card-border"}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${editing ? "border-brand-300 bg-brand-50/40" : "border-card-border"}`}>
        <span className="text-[13px] font-medium">{title}</span>
        <button
          onClick={onToggle}
          className={`text-[11px] px-3 py-1 rounded-lg border transition-colors cursor-pointer font-medium ${
            editing
              ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-700"
              : "border-card-border bg-card-bg hover:bg-page-bg"
          }`}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-medium text-text-dim uppercase tracking-wide">{label}</span>
        {hint && <span className="text-[10px] text-text-secondary">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
