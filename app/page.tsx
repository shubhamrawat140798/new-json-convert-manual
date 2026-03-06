"use client";

import { useCallback, useMemo, useState } from "react";

type ActClause = {
  label?: string;
  text?: string;
};

type ActProviso = {
  label?: string;
  text?: string;
};

type ActSubsection = {
  number?: string;
  text?: string;
  clauses?: ActClause[];
  continuation?: string;
  provisos?: ActProviso[];
};

type ActIllustration = {
  clause?: string;
  label?: string;
  text?: string;
};

type ActSection = {
  id: string;
  act_name?: string;
  chapter_number?: string;
  chapter_title?: string;
  chapter_sub_title?: string;
  section_number?: string;
  title?: string;
  content?: string;
  explanation?: string;
  keywords?: string[];
  subsections?: ActSubsection[];
  illustrations?: ActIllustration[];
  source?: string;
  remarks?: string;
  // Allow additional fields from JSON without forcing typing everywhere
  [key: string]: unknown;
};

const DOC_FILES = [
  "BNSS_ACT.json",
  "BSA_ACT.json",
  "IPC_ACT.json",
  "BNS_ACT.json",
  "CCrP_ACT.json",
  "MV_ACT.json",
  "ANTI_HIJACKING_ACT.json",
  "ARMS_ACT.json",
  "SUPPRESSION_OF_UNLAWFUL_ACTS_AGAINST_SAFETY_OF_MARITIME_NAVIGATION_AND_FIXED_PLATFORMS_ON_CONTINENTAL_SHELF_ACT.json",
  "WEAPONS_OF_MASS_DESTRUCTION_AND_THEIR_DELIVERY_SYSTEMS_PROHIBITION_OF_UNLAWFUL_ACTIVITIES_ACT.json",
  "SAARC_CONVENTION_SUPPRESSION_OF_TERRORISM_ACT.json",
  "SUPPRESSION_OF_UNLAWFUL_ACTS_AGAINST_SAFETY_OF_CIVIL_AVIATION_ACT.json",
  "ATOMIC_ENERGY_ACT.json",
  "EXPLOSIVE_SUBSTANCES_ACT.json",
  "IT_ACT.json",
  "NIA_ACT.json",
  "UAP_ACT.json"
] as const;

export default function HomePage() {
  const [status, setStatus] = useState<string>("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("");
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [actSections, setActSections] = useState<ActSection[] | null>(null);
  const [actLoading, setActLoading] = useState(false);
  const [actLoadedCount, setActLoadedCount] = useState<number | null>(null);
  const [actSaving, setActSaving] = useState(false);
  const [adminKey, setAdminKey] = useState<string>("");

  const setStatusMessage = useCallback(
    (message: string, type: "success" | "error" | "info" | "") => {
      setStatus(message);
      setStatusType(type);
    },
    []
  );

  const handleClear = useCallback(() => {
    setStatusMessage("Cleared.", "info");
  }, [setStatusMessage]);

  const handleLoadAct = useCallback(async () => {
    if (!selectedDoc) {
      setStatusMessage("Choose a JSON file first.", "error");
      return;
    }
    try {
      setActLoading(true);
      const [actRes, remarksRes] = await Promise.all([
        fetch(`/api/doc/${encodeURIComponent(selectedDoc)}`),
        fetch(`/api/remarks/${encodeURIComponent(selectedDoc)}`)
      ]);

      if (!actRes.ok) {
        throw new Error(`HTTP ${actRes.status}`);
      }
      const baseSections = (await actRes.json()) as ActSection[];

      let remarksBySectionId: Record<string, string> = {};
      if (remarksRes.ok) {
        const remarksDoc = (await remarksRes.json()) as {
          remarksBySectionId?: Record<string, string>;
        };
        if (remarksDoc.remarksBySectionId && typeof remarksDoc.remarksBySectionId === "object") {
          remarksBySectionId = remarksDoc.remarksBySectionId;
        }
      }

      const merged = baseSections.map((s, index) => {
        const generatedId = `section-${s.section_number ?? index + 1}`;
        const id = s.id ?? generatedId;
        return {
          ...s,
          id,
          remarks: remarksBySectionId[id] ?? s.remarks ?? ""
        };
      });

      setActSections(merged);
      setActLoadedCount(merged.length);
      const savedCount = Object.keys(remarksBySectionId).length;
      setStatusMessage(
        `Loaded ${merged.length} sections from ${selectedDoc}. ${savedCount ? `Loaded ${savedCount} saved remarks.` : ""}`.trim(),
        "success"
      );
    } catch {
      setStatusMessage("Could not load JSON from server.", "error");
      setActSections(null);
      setActLoadedCount(null);
    } finally {
      setActLoading(false);
    }
  }, [selectedDoc, setStatusMessage]);

  const handleSaveAct = useCallback(async () => {
    if (!actSections || !selectedDoc) {
      setStatusMessage("Nothing to save yet. Load an Act first.", "error");
      return;
    }
    try {
      setActSaving(true);
      const remarksBySectionId: Record<string, string> = {};
      for (let index = 0; index < actSections.length; index += 1) {
        const s = actSections[index]!;
        const r = (s.remarks ?? "").trim();
        if (!r) continue;
        const id = s.id ?? `section-${s.section_number ?? index + 1}`;
        remarksBySectionId[id] = r;
      }

      const headers: Record<string, string> = { "content-type": "application/json" };
      if (adminKey.trim()) headers["x-admin-key"] = adminKey.trim();

      const res = await fetch(`/api/remarks/${encodeURIComponent(selectedDoc)}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ remarksBySectionId })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setStatusMessage(`Saved ${Object.keys(remarksBySectionId).length} remarks to cloud.`, "success");
    } catch {
      setStatusMessage("Could not save remarks to cloud.", "error");
    } finally {
      setActSaving(false);
    }
  }, [actSections, adminKey, selectedDoc, setStatusMessage]);

  const updateSectionField = useCallback(
    (index: number, field: keyof ActSection, value: unknown) => {
      setActSections((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const statusClassName = useMemo(() => {
    const base = "status-bar";
    if (statusType === "success") return `${base} status-bar--success`;
    if (statusType === "error") return `${base} status-bar--error`;
    return base;
  }, [statusType]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Manual Text → JSON</h1>
          <p className="subtitle">
            Paste or type structured text (e.g. <code>name: John</code>) and instantly
            convert it to JSON.
          </p>
        </div>
        <div className="doc-loader">
          <div className="field">
            <label htmlFor="docSelect">
              Open existing JSON (from <code>doc</code> folder)
            </label>
            <select
              id="docSelect"
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
            >
              <option value="">Select an Act JSON…</option>
              {DOC_FILES.map((file) => (
                <option key={file} value={file}>
                  {file.replace(".json", "")}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="adminKey">Admin key (optional)</label>
            <input
              id="adminKey"
              type="password"
              placeholder="If enabled"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={handleLoadAct}
            disabled={actLoading || actSaving}
          >
            {actLoading ? "Loading…" : "Load"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleSaveAct}
            disabled={actLoading || actSaving}
          >
            {actSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <section className="panel panel-proofreader">
        <div className="panel-proofreader-header">
          <div>
            <h2>Act documents – Proofreader</h2>
            <p className="hint">
              Add or edit section remarks. Click Save to persist to Vercel Blob.
            </p>
          </div>
          <div className="proofreader-meta">
            {actLoadedCount != null && (
              <span>Loaded {actLoadedCount} sections.</span>
            )}
          </div>
        </div>

        {actSections && actSections.length > 0 ? (
          <div className="section-list">
            {actSections.map((section, index) => {
              const hasRemarks = !!section.remarks && section.remarks.trim().length > 0;
              const itemClassName = hasRemarks
                ? "section-item section-item--has-remarks"
                : "section-item";

              return (
                <details key={section.id} className={itemClassName}>
                <summary className="section-summary">
                  <div className="section-summary-main">
                    <span className="section-number">
                      Section {section.section_number ?? "?"}:
                    </span>
                    <span className="section-title">
                      {section.title || section.content || "Untitled section"}
                    </span>
                  </div>
                  <div className="section-summary-meta">
                    <span>
                      {section.act_name ?? ""}{" "}
                      {section.chapter_number
                        ? `· Ch. ${section.chapter_number}`
                        : ""}
                    </span>
                  </div>
                </summary>

                <div className="section-body">
                  <div className="field">
                    <label>Remarks</label>
                    <input
                      type="text"
                      placeholder="Add any proofreading note for this section"
                      value={section.remarks ?? ""}
                      onChange={(e) =>
                        updateSectionField(index, "remarks", e.target.value)
                      }
                    />
                  </div>

                  {section.content && (
                    <div className="field">
                      <label>Lead text</label>
                      <p>{section.content}</p>
                    </div>
                  )}

                  {section.explanation && (
                    <div className="field">
                      <label>Explanation</label>
                      <p>{section.explanation}</p>
                    </div>
                  )}

                  {section.keywords && section.keywords.length > 0 && (
                    <div className="field">
                      <label>Keywords</label>
                      <p>{section.keywords.join(", ")}</p>
                    </div>
                  )}

                  {section.subsections && section.subsections.length > 0 && (
                    <div className="subsections">
                      <div className="subsections-header">Subsections</div>
                      <ul>
                        {section.subsections.map((sub, subIndex) => (
                          <li key={sub.number ?? sub.text ?? subIndex}>
                            <div>
                              <span className="subsection-number">
                                {sub.number}
                                {sub.number ? "." : ""}
                              </span>
                              <span>{sub.text}</span>
                            </div>

                            {sub.clauses && sub.clauses.length > 0 && (
                              <ul className="subsection-clauses">
                                {sub.clauses.map((clause) => (
                                  <li key={clause.label ?? clause.text}>
                                    <span className="subsection-clause-label">
                                      {clause.label ? `${clause.label})` : ""}
                                    </span>
                                    <span>{clause.text}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {sub.continuation && (
                              <div className="subsection-continuation">
                                {sub.continuation}
                              </div>
                            )}

                            {sub.provisos && sub.provisos.length > 0 && (
                              <div className="subsection-provisos">
                                {sub.provisos.map((p) => (
                                  <div key={p.text}>
                                    <span className="subsection-proviso-label">
                                      {p.label ?? "Provided that"}:
                                    </span>{" "}
                                    <span>{p.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {section.illustrations && section.illustrations.length > 0 && (
                    <div className="subsections">
                      <div className="subsections-header">Illustrations</div>
                      <ul>
                        {section.illustrations.map((ill, i) => (
                          <li key={ill.label ?? ill.text ?? i}>
                            {ill.clause && (
                              <strong>{`[Clause ${ill.clause}] `}</strong>
                            )}
                            {ill.label && <strong>{ill.label}: </strong>}
                            <span>{ill.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
              );
            })}
          </div>
        ) : (
          <p className="hint">
            Choose an Act above and click <strong>Load</strong> to see its sections.
          </p>
        )}
      </section>

      <div className={statusClassName} aria-live="polite">
        {status}
      </div>

      <footer className="app-footer">
        <span>Runs on Next.js · Your data stays on the client</span>
      </footer>
    </div>
  );
}

