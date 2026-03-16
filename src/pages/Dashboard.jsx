import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

export default function Dashboard({ session, onLogout, onNavigate }) {
  const [currentView, setCurrentView] = useState("home");
  const [reports, setReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [notice, setNotice] = useState("");
  const [openedReport, setOpenedReport] = useState(null);
  const [trashedLocal, setTrashedLocal] = useState([]);
  const signatureCanvasRef = useRef(null);
  const [isSigning, setIsSigning] = useState(false);

  const [reportForm, setReportForm] = useState({
    customer: "",
    address: "",
    orderNo: "",
    customerEmail: "",
    date: new Date().toISOString().slice(0, 10),
    status: "open",
    beforePhoto: "",
    afterPhoto: "",
    expenses: "",
    notes: "",
    signerName: "",
    signatureData: ""
  });

  const [workRows, setWorkRows] = useState([
    { employee: "", from: "", to: "", rate: "" }
  ]);
  const [materialRows, setMaterialRows] = useState([
    { name: "", quantity: "", unit: "", price: "" }
  ]);

  const [customerForm, setCustomerForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: ""
  });

  const colors = {
    bg: "#0a0a0a",
    panel: "#141414",
    card: "#1a1a1a",
    text: "#f4efe6",
    muted: "#b9b0a3",
    gold: "#d4a853",
    border: "rgba(212,168,83,0.25)"
  };

  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";
  const activeReports = reports.filter((report) => (report.status || "").toLowerCase() !== "geloescht");
  const trashedReports = [...reports, ...trashedLocal].filter((report) => (report.status || "").toLowerCase() === "geloescht");

  const inputStyle = {
    minHeight: 42,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: "#111",
    color: colors.text,
    padding: "0 12px"
  };

  const buttonPrimary = {
    minHeight: 44,
    borderRadius: 10,
    border: "none",
    background: colors.gold,
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 14px"
  };

  const toNumber = (value) => {
    const num = Number.parseFloat(value);
    return Number.isFinite(num) ? num : 0;
  };

  const calculateHours = (fromTime, toTime) => {
    if (!fromTime || !toTime) return 0;
    const [fromH, fromM] = fromTime.split(":").map(Number);
    const [toH, toM] = toTime.split(":").map(Number);
    const fromMinutes = fromH * 60 + fromM;
    const toMinutes = toH * 60 + toM;
    if (toMinutes <= fromMinutes) return 0;
    return Math.round((((toMinutes - fromMinutes) / 60) + Number.EPSILON) * 100) / 100;
  };

  const getWorkRowHours = (row) => calculateHours(row.from, row.to);
  const getWorkRowTotal = (row) => getWorkRowHours(row) * toNumber(row.rate);
  const getMaterialRowTotal = (row) => toNumber(row.quantity) * toNumber(row.price);

  const workSubtotal = workRows.reduce((sum, row) => sum + getWorkRowTotal(row), 0);
  const materialSubtotal = materialRows.reduce((sum, row) => sum + getMaterialRowTotal(row), 0);
  const expenseTotal = toNumber(reportForm.expenses);
  const subtotal = workSubtotal + materialSubtotal + expenseTotal;
  const vat = subtotal * 0.081;
  const grandTotal = subtotal + vat;

  const updateWorkRow = (index, key, value) => {
    setWorkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const updateMaterialRow = (index, key, value) => {
    setMaterialRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (type, file) => {
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      setReportForm((prev) => ({ ...prev, [type]: base64 }));
    } catch (_err) {
      setNotice("Foto konnte nicht geladen werden.");
    }
  };

  const getCanvasPoint = (event) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in event && event.touches.length > 0) {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startSign = (event) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    ctx.strokeStyle = colors.gold;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsSigning(true);
  };

  const moveSign = (event) => {
    if (!isSigning) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    if ("touches" in event) event.preventDefault();
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const endSign = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      setReportForm((prev) => ({ ...prev, signatureData: canvas.toDataURL("image/png") }));
    }
    setIsSigning(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setReportForm((prev) => ({ ...prev, signatureData: "" }));
  };

  async function loadReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
    if (error) {
      console.error('Error:', error)
      setReports([])
    } else {
      setReports(data || [])
    }
  }

  const fetchCustomers = async () => {
    if (!userId) return;
    setLoadingCustomers(true);
    const { data } = await supabase
      .from("customers")
      .select("id, name, address, phone, email")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    setCustomers(data || []);
    setLoadingCustomers(false);
  };

  useEffect(() => {
    if (!userId) {
      setReports([]);
      setCustomers([]);
      return;
    }
    const loadData = async () => {
      await fetchCustomers();
    };
    loadData();
  }, [userId]);

  useEffect(() => {
    if (currentView !== "reports" && currentView !== "trash") return;
    const run = async () => {
      setLoadingReports(true);
      await loadReports();
      setLoadingReports(false);
    };
    run();
  }, [currentView, userId]);

  const handleSaveReport = async () => {
    if (!userId || !reportForm.customer.trim()) {
      setNotice("Bitte Kundenname ausfullen.");
      return;
    }
    setSavingReport(true);
    setNotice("");
    const fullReportPayload = {
      customer: reportForm.customer.trim(),
      address: reportForm.address.trim(),
      orderNo: reportForm.orderNo.trim(),
      customerEmail: reportForm.customerEmail.trim(),
      date: reportForm.date,
      status: reportForm.status,
      photos: {
        before: reportForm.beforePhoto,
        after: reportForm.afterPhoto
      },
      workRows: workRows.map((row) => ({
        ...row,
        hours: getWorkRowHours(row),
        total: getWorkRowTotal(row)
      })),
      materialRows: materialRows.map((row) => ({
        ...row,
        total: getMaterialRowTotal(row)
      })),
      costs: {
        expenses: expenseTotal,
        notes: reportForm.notes
      },
      totals: {
        workSubtotal,
        materialSubtotal,
        subtotal,
        vat,
        grandTotal
      },
      signature: {
        customerName: reportForm.signerName.trim(),
        imageBase64: reportForm.signatureData
      }
    };

    const { error } = await supabase.from("reports").insert({
      user_id: userId,
      customer: reportForm.customer.trim(),
      description: JSON.stringify(fullReportPayload),
      date: reportForm.date,
      status: reportForm.status
    });
    setSavingReport(false);

    if (error) {
      setNotice("Rapport konnte nicht gespeichert werden.");
      return;
    }

    setReportForm({
      customer: "",
      address: "",
      orderNo: "",
      customerEmail: "",
      date: new Date().toISOString().slice(0, 10),
      status: "open",
      beforePhoto: "",
      afterPhoto: "",
      expenses: "",
      notes: "",
      signerName: "",
      signatureData: ""
    });
    setWorkRows([{ employee: "", from: "", to: "", rate: "" }]);
    setMaterialRows([{ name: "", quantity: "", unit: "", price: "" }]);
    clearSignature();
    setNotice("Rapport gespeichert.");
    await loadReports();
    setCurrentView("reports");
  };

  const handleSaveCustomer = async () => {
    if (!userId || !customerForm.name.trim()) {
      setNotice("Bitte Kundenname ausfullen.");
      return;
    }
    setSavingCustomer(true);
    setNotice("");
    const { error } = await supabase.from("customers").insert({
      user_id: userId,
      name: customerForm.name.trim(),
      address: customerForm.address.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim()
    });
    setSavingCustomer(false);

    if (error) {
      setNotice("Kunde konnte nicht gespeichert werden.");
      return;
    }

    setCustomerForm({ name: "", address: "", phone: "", email: "" });
    setNotice("Kunde gespeichert.");
    await fetchCustomers();
  };

  const handlePasswordReset = async () => {
    if (!userEmail) {
      setNotice("Keine E-Mail im Konto gefunden.");
      return;
    }
    setNotice("");
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
    if (error) {
      setNotice("Passwort-Reset konnte nicht gestartet werden.");
      return;
    }
    setNotice("Passwort-Reset E-Mail wurde gesendet.");
  };

  const parseReportPayload = (report) => {
    if (!report?.description) return null;
    try {
      return JSON.parse(report.description);
    } catch (_error) {
      return null;
    }
  };

  const handleOpenReport = (report) => {
    setOpenedReport(report);
  };

  const handleMoveToTrash = async (report) => {
    const confirmed = window.confirm("Sicher löschen?");
    if (!confirmed) return;
    const { error } = await supabase
      .from("reports")
      .update({ status: "geloescht" })
      .eq("id", report.id);
    if (error) {
      setNotice("Rapport konnte nicht geloscht werden.");
      return;
    }
    setNotice("Rapport in Papierkorb verschoben.");
    if (openedReport?.id === report.id) {
      setOpenedReport(null);
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setTrashedLocal((prev) => [{ ...report, status: "geloescht" }, ...prev.filter((r) => r.id !== report.id)]);
  };

  const handleRestoreReport = async (report) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: "offen" })
      .eq("id", report.id);
    if (error) {
      setNotice("Rapport konnte nicht wiederhergestellt werden.");
      return;
    }
    setNotice("Rapport wiederhergestellt.");
    setTrashedLocal((prev) => prev.filter((r) => r.id !== report.id));
    setReports((prev) => [{ ...report, status: "offen" }, ...prev.filter((r) => r.id !== report.id)]);
  };

  const handleHardDeleteReport = async (report) => {
    const confirmed = window.confirm("Endgultig loschen?");
    if (!confirmed) return;
    const id = report.id;
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) {
      setNotice("Rapport konnte nicht endgultig geloscht werden.");
      return;
    }
    setNotice("Rapport endgultig geloscht.");
    if (openedReport?.id === report.id) setOpenedReport(null);
    setTrashedLocal((prev) => prev.filter((r) => r.id !== report.id));
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  };

  const handleDownloadPdf = (report) => {
    const payload = parseReportPayload(report) || {};
    const workData = payload.workRows || [];
    const materialData = payload.materialRows || [];
    const total = payload?.totals?.grandTotal ?? report.total ?? 0;
    const subtotalValue = payload?.totals?.subtotal ?? 0;
    const vatValue = payload?.totals?.vat ?? 0;
    const auftragNr = report.auftrag_nr || payload.orderNo || "-";
    const description = payload?.costs?.notes || payload.description || report.description || "-";
    const expenses = payload?.costs?.expenses ?? 0;
    const customerMail = report.customer_email || payload.customerEmail || "";
    const ccMail = userEmail || "";
    const workLines = workData
      .map((row, idx) => `${idx + 1}. ${row.employee || "-"} | ${row.from || "-"}-${row.to || "-"} | ${Number(row.hours || 0).toFixed(2)}h | CHF ${Number(row.total || 0).toFixed(2)}`)
      .join("\n");
    const materialLines = materialData
      .map((row, idx) => `${idx + 1}. ${row.name || "-"} | ${row.quantity || 0} ${row.unit || ""} | CHF ${Number(row.total || 0).toFixed(2)}`)
      .join("\n");

    const subject = `BauAbnahme Rapport - ${report.customer || payload.customer || "-"} - ${report.date || payload.date || "-"}`;
    const body = [
      "BauAbnahme Rapport",
      "",
      `Kunde: ${report.customer || payload.customer || "-"}`,
      `Datum: ${report.date || payload.date || "-"}`,
      `Auftrag-Nr: ${auftragNr}`,
      `Beschreibung: ${description}`,
      "",
      "Arbeitsstunden:",
      workLines || "Keine Daten",
      "",
      "Material:",
      materialLines || "Keine Daten",
      "",
      `Spesen CHF: ${Number(expenses || 0).toFixed(2)}`,
      `Zwischensumme CHF: ${Number(subtotalValue || 0).toFixed(2)}`,
      `MwSt 8.1% CHF: ${Number(vatValue || 0).toFixed(2)}`,
      `TOTAL CHF: ${Number(total || 0).toFixed(2)}`
    ].join("\n");

    const mailto = `mailto:${encodeURIComponent(customerMail)}?cc=${encodeURIComponent(ccMail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const renderView = () => {
    if (currentView === "new-report") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0, marginBottom: 14 }}>Swiss Regierapport</h2>
          <div style={{ display: "grid", gap: 16 }}>
            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Header</h3>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <input type="text" placeholder="Kundenname" value={reportForm.customer} onChange={(e) => setReportForm((prev) => ({ ...prev, customer: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="Adresse" value={reportForm.address} onChange={(e) => setReportForm((prev) => ({ ...prev, address: e.target.value }))} style={inputStyle} />
                <input type="date" value={reportForm.date} onChange={(e) => setReportForm((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="Auftrag-Nr" value={reportForm.orderNo} onChange={(e) => setReportForm((prev) => ({ ...prev, orderNo: e.target.value }))} style={inputStyle} />
                <input type="email" placeholder="Kunde E-Mail" value={reportForm.customerEmail} onChange={(e) => setReportForm((prev) => ({ ...prev, customerEmail: e.target.value }))} style={inputStyle} />
                <select value={reportForm.status} onChange={(e) => setReportForm((prev) => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                  <option value="open">Offen</option>
                  <option value="done">Erledigt</option>
                </select>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Fotos</h3>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: colors.muted }}>Vorher Foto</label>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload("beforePhoto", e.target.files?.[0])} style={{ color: colors.muted }} />
                  {reportForm.beforePhoto ? <img src={reportForm.beforePhoto} alt="Vorher" style={{ marginTop: 8, width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${colors.border}` }} /> : null}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: colors.muted }}>Nachher Foto</label>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload("afterPhoto", e.target.files?.[0])} style={{ color: colors.muted }} />
                  {reportForm.afterPhoto ? <img src={reportForm.afterPhoto} alt="Nachher" style={{ marginTop: 8, width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${colors.border}` }} /> : null}
                </div>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Arbeitsstunden</h3>
              <button type="button" onClick={() => setWorkRows((prev) => [...prev, { employee: "", from: "", to: "", rate: "" }])} style={{ ...buttonPrimary, minHeight: 36, marginBottom: 10 }}>Zeile hinzufugen</button>
              <div style={{ display: "grid", gap: 8 }}>
                {workRows.map((row, index) => {
                  const hours = getWorkRowHours(row);
                  const total = getWorkRowTotal(row);
                  return (
                    <div key={`work-${index}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                      <input type="text" placeholder="Mitarbeiter" value={row.employee} onChange={(e) => updateWorkRow(index, "employee", e.target.value)} style={inputStyle} />
                      <input type="time" value={row.from} onChange={(e) => updateWorkRow(index, "from", e.target.value)} style={inputStyle} />
                      <input type="time" value={row.to} onChange={(e) => updateWorkRow(index, "to", e.target.value)} style={inputStyle} />
                      <input type="text" value={hours.toString()} readOnly style={{ ...inputStyle, color: colors.gold }} />
                      <input type="number" placeholder="Ansatz CHF" value={row.rate} onChange={(e) => updateWorkRow(index, "rate", e.target.value)} style={inputStyle} />
                      <input type="text" value={total.toFixed(2)} readOnly style={{ ...inputStyle, color: colors.gold }} />
                    </div>
                  );
                })}
                <div style={{ textAlign: "right", color: colors.gold, fontWeight: 700 }}>Subtotal Arbeitsstunden: CHF {workSubtotal.toFixed(2)}</div>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Material</h3>
              <button type="button" onClick={() => setMaterialRows((prev) => [...prev, { name: "", quantity: "", unit: "", price: "" }])} style={{ ...buttonPrimary, minHeight: 36, marginBottom: 10 }}>Zeile hinzufugen</button>
              <div style={{ display: "grid", gap: 8 }}>
                {materialRows.map((row, index) => {
                  const total = getMaterialRowTotal(row);
                  return (
                    <div key={`mat-${index}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                      <input type="text" placeholder="Bezeichnung" value={row.name} onChange={(e) => updateMaterialRow(index, "name", e.target.value)} style={inputStyle} />
                      <input type="number" placeholder="Menge" value={row.quantity} onChange={(e) => updateMaterialRow(index, "quantity", e.target.value)} style={inputStyle} />
                      <input type="text" placeholder="Einheit" value={row.unit} onChange={(e) => updateMaterialRow(index, "unit", e.target.value)} style={inputStyle} />
                      <input type="number" placeholder="Preis CHF" value={row.price} onChange={(e) => updateMaterialRow(index, "price", e.target.value)} style={inputStyle} />
                      <input type="text" value={total.toFixed(2)} readOnly style={{ ...inputStyle, color: colors.gold }} />
                    </div>
                  );
                })}
                <div style={{ textAlign: "right", color: colors.gold, fontWeight: 700 }}>Subtotal Material: CHF {materialSubtotal.toFixed(2)}</div>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Kosten</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <input type="number" placeholder="Spesen CHF" value={reportForm.expenses} onChange={(e) => setReportForm((prev) => ({ ...prev, expenses: e.target.value }))} style={inputStyle} />
                <textarea placeholder="Notizen" rows={4} value={reportForm.notes} onChange={(e) => setReportForm((prev) => ({ ...prev, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 100, padding: 12 }} />
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Totals</h3>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: colors.muted }}>Zwischensumme: CHF {subtotal.toFixed(2)}</div>
                <div style={{ color: colors.muted }}>MwSt 8.1%: CHF {vat.toFixed(2)}</div>
                <div style={{ color: colors.gold, fontSize: 28, fontWeight: 800 }}>TOTAL CHF {grandTotal.toFixed(2)}</div>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Unterschrift</h3>
              <canvas
                ref={signatureCanvasRef}
                width={720}
                height={180}
                onMouseDown={startSign}
                onMouseMove={moveSign}
                onMouseUp={endSign}
                onMouseLeave={endSign}
                onTouchStart={startSign}
                onTouchMove={moveSign}
                onTouchEnd={endSign}
                style={{ width: "100%", maxWidth: "100%", background: "#0f0f0f", border: `1px solid ${colors.border}`, borderRadius: 8, touchAction: "none" }}
              />
              <div style={{ display: "grid", gap: 10, marginTop: 10, gridTemplateColumns: "1fr auto" }}>
                <input type="text" placeholder="Kundenname" value={reportForm.signerName} onChange={(e) => setReportForm((prev) => ({ ...prev, signerName: e.target.value }))} style={inputStyle} />
                <button type="button" onClick={clearSignature} style={{ ...buttonPrimary, minHeight: 42 }}>Unterschrift loschen</button>
              </div>
            </section>

            <button type="button" onClick={handleSaveReport} disabled={savingReport} style={{ ...buttonPrimary, opacity: savingReport ? 0.7 : 1 }}>
              {savingReport ? "Speichert..." : "Rapport speichern"}
            </button>
          </div>
        </section>
      );
    }

    if (currentView === "reports") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Alle Rapporte</h2>
          {loadingReports ? (
            <p style={{ color: colors.muted }}>Lade Rapporte...</p>
          ) : activeReports.length === 0 ? (
            <p style={{ color: colors.muted }}>Keine Rapporte gefunden.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {activeReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(212,168,83,0.2)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "grid",
                    gap: 6
                  }}
                >
                  <strong style={{ color: "#f0ece4" }}>{report.customer || "-"}</strong>
                  <div style={{ color: "#f0ece4", opacity: 0.9, fontSize: 13 }}>
                    Auftrag-Nr: {report.auftrag_nr || parseReportPayload(report)?.orderNo || "-"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        color: (report.status || "").toLowerCase() === "done" ? "#80c783" : "#d4a853",
                        fontWeight: 700
                      }}
                    >
                      {(report.status || "").toLowerCase() === "done" ? "Erledigt" : "Offen"}
                    </span>
                    <span style={{ color: "#f0ece4", opacity: 0.9 }}>•</span>
                    <span style={{ color: "#f0ece4" }}>{report.date || "-"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => handleOpenReport(report)} style={{ ...buttonPrimary, minHeight: 34 }}>Öffnen</button>
                    <button type="button" onClick={() => handleMoveToTrash(report)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: "#f0ece4", padding: "0 12px", cursor: "pointer" }}>🗑️ Löschen</button>
                    <button type="button" onClick={() => handleDownloadPdf(report)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: "#f0ece4", padding: "0 12px", cursor: "pointer" }}>E-Mail PDF</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {openedReport ? (
            <div style={{ marginTop: 14, border: "1px solid rgba(212,168,83,0.2)", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0, color: "#f0ece4" }}>Rapport Details</h3>
              <div style={{ color: "#f0ece4", display: "grid", gap: 4 }}>
                <div><strong>Kunde:</strong> {openedReport.customer || "-"}</div>
                <div><strong>Datum:</strong> {openedReport.date || "-"}</div>
                <div><strong>Status:</strong> {(openedReport.status || "").toLowerCase() === "done" ? "Erledigt" : "Offen"}</div>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, color: colors.muted, fontSize: 12 }}>
                {JSON.stringify(parseReportPayload(openedReport) || {}, null, 2)}
              </pre>
            </div>
          ) : null}
        </section>
      );
    }

    if (currentView === "trash") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Papierkorb</h2>
          {loadingReports ? (
            <p style={{ color: colors.muted }}>Lade Papierkorb...</p>
          ) : trashedReports.length === 0 ? (
            <p style={{ color: colors.muted }}>Papierkorb ist leer.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {trashedReports.map((report) => (
                <div key={report.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 6 }}>
                  <strong style={{ color: "#f0ece4" }}>{report.customer || "-"}</strong>
                  <div style={{ color: "#f0ece4", opacity: 0.9 }}>{report.date || "-"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => handleRestoreReport(report)} style={{ ...buttonPrimary, minHeight: 34 }}>Wiederherstellen</button>
                    <button type="button" onClick={() => handleHardDeleteReport(report)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: "#f0ece4", padding: "0 12px", cursor: "pointer" }}>Endgültig löschen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (currentView === "customers") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Kunden</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Kundenname"
              value={customerForm.name}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Adresse"
              value={customerForm.address}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                type="text"
                placeholder="Telefon"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="E-Mail"
                value={customerForm.email}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <button type="button" onClick={handleSaveCustomer} disabled={savingCustomer} style={{ ...buttonPrimary, opacity: savingCustomer ? 0.7 : 1 }}>
              {savingCustomer ? "Speichert..." : "Kunde speichern"}
            </button>
          </div>
          {loadingCustomers ? (
            <p style={{ color: colors.muted }}>Lade Kunden...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: colors.muted }}>Keine Kunden gefunden.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {customers.map((customer) => (
                <div key={customer.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
                  <strong>{customer.name || "-"}</strong>
                  <div style={{ color: colors.muted }}>{customer.address || "-"}</div>
                  <div style={{ color: colors.muted }}>{customer.phone || "-"} | {customer.email || "-"}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (currentView === "settings") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Einstellungen</h2>
          <p style={{ color: colors.muted, marginTop: 0 }}>
            Benutzer: <strong style={{ color: colors.text }}>{userEmail || "-"}</strong>
          </p>
          <button type="button" onClick={handlePasswordReset} style={buttonPrimary}>
            Passwort andern
          </button>
        </section>
      );
    }

    return (
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Start</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ color: colors.muted, fontSize: 13 }}>Rapporte</div>
            <strong style={{ fontSize: 24 }}>{reports.length}</strong>
          </div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ color: colors.muted, fontSize: 13 }}>Kunden</div>
            <strong style={{ fontSize: 24 }}>{customers.length}</strong>
          </div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ color: colors.muted, fontSize: 13 }}>Aktive Ansicht</div>
            <strong style={{ fontSize: 24, color: colors.gold }}>{currentView}</strong>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: `1px solid ${colors.border}`, background: colors.panel, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>
            Bau<span style={{ color: colors.gold }}>Abnahme</span>
          </div>

          <nav style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={() => setCurrentView("home")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "home" ? colors.gold : colors.border}`, background: currentView === "home" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Start</button>
            <button type="button" onClick={() => setCurrentView("new-report")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "new-report" ? colors.gold : colors.border}`, background: currentView === "new-report" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Neuer Rapport</button>
            <button type="button" onClick={() => setCurrentView("reports")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "reports" ? colors.gold : colors.border}`, background: currentView === "reports" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Alle Rapporte</button>
            <button type="button" onClick={() => setCurrentView("trash")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "trash" ? colors.gold : colors.border}`, background: currentView === "trash" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Papierkorb</button>
            <button type="button" onClick={() => setCurrentView("customers")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "customers" ? colors.gold : colors.border}`, background: currentView === "customers" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Kunden</button>
            <button type="button" onClick={() => setCurrentView("settings")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "settings" ? colors.gold : colors.border}`, background: currentView === "settings" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Einstellungen</button>
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>Dashboard</h1>
              <p style={{ marginTop: 6, marginBottom: 0, color: colors.muted }}>
                {session?.user?.email || "Nicht angemeldet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                  return;
                }
                if (onNavigate) onNavigate("/");
              }}
              style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, cursor: "pointer", padding: "0 14px" }}
            >
              Abmelden
            </button>
          </header>

          {notice ? (
            <div style={{ marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", color: colors.muted }}>
              {notice}
            </div>
          ) : null}

          {renderView()}
        </main>
      </div>
    </div>
  );
}
