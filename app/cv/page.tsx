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
                Drop another PDF to replace, or edit your CV below
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
                {cv.experience.length === 0 && (
                  <p className="text-[12px] text-text-secondary">No experience extracted. Click Edit to add.</p>
                )}
                {cv.experience.map((exp, i) => (
                  <div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-card-border" : ""}>
                    {editingSection === "experience" ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} placeholder="Job title" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                          <input value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} placeholder="Company" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input value={exp.location} onChange={(e) => updateExperience(i, "location", e.target.value)} placeholder="Location" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                          <input value={exp.start_date} onChange={(e) => updateExperience(i, "start_date", e.target.value)} placeholder="Start" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                          <input value={exp.end_date || ""} onChange={(e) => updateExperience(i, "end_date", e.target.value || null)} placeholder="End (blank=Present)" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                        </div>
                        <div className="space-y-1.5">
                          {exp.bullets.map((bullet, j) => (
                            <div key={j} className="flex gap-1.5">
                              <input value={bullet} onChange={(e) => updateBullet(i, j, e.target.value)} placeholder="Bullet point" className="flex-1 px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                              <button onClick={() => removeBullet(i, j)} className="px-2 text-text-secondary hover:text-red-500 cursor-pointer">&times;</button>
                            </div>
                          ))}
                          <button onClick={() => addBullet(i)} className="text-[11px] text-brand-700 hover:text-brand-500 cursor-pointer">+ Add bullet</button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                ))}
              </Section>

              {/* Education */}
              <Section
                title="Education"
                editing={editingSection === "education"}
                onToggle={() => setEditingSection(editingSection === "education" ? null : "education")}
              >
                {cv.education.length === 0 && (
                  <p className="text-[12px] text-text-secondary">No education extracted. Click Edit to add.</p>
                )}
                {cv.education.map((edu, i) => (
                  <div key={i}>
                    {editingSection === "education" ? (
                      <div className="grid grid-cols-3 gap-2">
                        <input value={edu.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="Degree" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                        <input value={edu.school} onChange={(e) => updateEducation(i, "school", e.target.value)} placeholder="School" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                        <input value={edu.year} onChange={(e) => updateEducation(i, "year", e.target.value)} placeholder="Year" className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-[13px] font-medium">{edu.degree}</div>
                          <div className="text-[12px] text-text-secondary">{edu.school}</div>
                        </div>
                        <span className="text-[11px] text-text-secondary">{edu.year}</span>
                      </div>
                    )}
                  </div>
                ))}
              </Section>

              {/* Skills */}
              <Section
                title={`Skills (${cv.skills.length})`}
                editing={editingSection === "skills"}
                onToggle={() => setEditingSection(editingSection === "skills" ? null : "skills")}
              >
                <div className="flex flex-wrap gap-1.5">
                  {cv.skills.map((skill) => (
                    <span key={skill} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-card-border text-text-dim bg-page-bg">
                      {skill}
                      {editingSection === "skills" && (
                        <button onClick={() => removeSkill(skill)} className="text-text-secondary hover:text-red-500 cursor-pointer">&times;</button>
                      )}
                    </span>
                  ))}
                </div>
                {editingSection === "skills" && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()} placeholder="Add a skill..." className="flex-1 px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-brand-300" />
                    <button onClick={addSkill} className="px-3 py-1.5 text-[12px] rounded-lg border border-card-border bg-card-bg hover:bg-page-bg transition-colors cursor-pointer">Add</button>
                  </div>
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
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
        <span className="text-[13px] font-medium">{title}</span>
        <button onClick={onToggle} className="text-[11px] px-2.5 py-1 rounded-lg border border-card-border bg-card-bg hover:bg-page-bg transition-colors cursor-pointer">
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
