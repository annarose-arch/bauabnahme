import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

const STATUS_COLORS = {
  offen: "#d4a853",
  bearbeitet: "#4b7bec",
  gesendet: "#d4a853",
  archiviert: "#80c783",
  geloescht: "#8b8b8b"
};

const STATUS_OPTIONS = ["offen", "bearbeitet", "gesendet", "archiviert"];

export default function Dashboard({ session, onLogout, onNavigate }) {
  const [currentView, setCurrentView] = useState("home");
  const [reports, setReports] = useState([]);
  const [trashReports, setTrashReports] = useState([]);
  const [archiveReports, setArchiveReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [openedReport, setOpenedReport] = useState(null);
  const [notice, setNotice] = useState("");
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const signatureCanvasRef = useRef(null);
  const [isSigning, setIsSigning] = useState(false);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";

  const [reportForm, setReportForm] = useState({
    customer: "",
    address: "",
    orderNo: "",
    customerEmail: "",
    date: new Date().toISOString().slice(0, 10),
    status: "offen",
    beforePhoto: "",
    afterPhoto: "",
    expenses: "",
    notes: "",
    signerName: "",
    signatureData: ""
  });

  const [workRows, setWorkRows] = useState([{ employee: "", from: "", to: "", rate: "" }]);
  const [materialRows, setMaterialRows] = useState([{ name: "", quantity: "", unit: "", price: "" }]);

  const [customerForm, setCustomerForm] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    address: "",
    zip: "",
    city: "",
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

  const inputStyle = {
    minHeight: 42,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: "#111",
    color: colors.text,
    padding: "0 12px"
  };

  const buttonPrimary = {
    minHeight: 40,
    borderRadius: 8,
    border: "none",
    background: colors.gold,
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 12px"
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

  const workSubtotal = useMemo(() => workRows.reduce((sum, row) => sum + getWorkRowTotal(row), 0), [workRows]);
  const materialSubtotal = useMemo(() => materialRows.reduce((sum, row) => sum + getMaterialRowTotal(row), 0), [materialRows]);
  const expenseTotal = toNumber(reportForm.expenses);
  const subtotal = workSubtotal + materialSubtotal + expenseTotal;
  const vat = subtotal * 0.081;
  const grandTotal = subtotal + vat;

  const parseReportPayload = (report) => {
    if (!report?.description) return null;
    try {
      return JSON.parse(report.description);
    } catch (_e) {
      return null;
    }
  };

  const parseCustomerAddress = (value) => {
    if (!value) return { address: "", zip: "", city: "", firstName: "", lastName: "" };
    try {
      const parsed = JSON.parse(value);
      return {
        address: parsed.address || "",
        zip: parsed.zip || "",
        city: parsed.city || "",
        firstName: parsed.firstName || "",
        lastName: parsed.lastName || ""
      };
    } catch (_e) {
      return { address: value, zip: "", city: "", firstName: "", lastName: "" };
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .neq("status", "geloescht")
      .not("status", "in", "(gesendet,archiviert)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error:", error);
      setReports([]);
      return;
    }
    setReports(data || []);
  };

  const fetchTrashReports = async () => {
    const { data, error } = await supabase.from("reports").select("*").eq("status", "geloescht");
    if (error) {
      console.error("Error:", error);
      setTrashReports([]);
      return;
    }
    setTrashReports(data || []);
  };

  const fetchArchiveReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .in("status", ["gesendet", "archiviert"])
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error:", error);
      setArchiveReports([]);
      return;
    }
    setArchiveReports(data || []);
  };

  const fetchCustomers = async () => {
    if (!userId) return;
    setLoadingCustomers(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (error) {
      setCustomers([]);
    } else {
      setCustomers(data || []);
    }
    setLoadingCustomers(false);
  };

  useEffect(() => {
    if (!userId) {
      setReports([]);
      setTrashReports([]);
      setArchiveReports([]);
      setCustomers([]);
      return;
    }
    fetchCustomers();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (currentView === "reports") {
      setLoadingReports(true);
      fetchReports().finally(() => setLoadingReports(false));
    }
  }, [currentView]);

  useEffect(() => {
    if (!userId) return;
    if (currentView === "trash") {
      setLoadingReports(true);
      fetchTrashReports().finally(() => setLoadingReports(false));
    }
  }, [currentView]);

  useEffect(() => {
    if (!userId) return;
    if (currentView === "archive") {
      setLoadingReports(true);
      fetchArchiveReports().finally(() => setLoadingReports(false));
    }
  }, [currentView]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event?.data?.type !== "BAU_REPORT_SENT") return;
      const reportId = event?.data?.id;
      if (!reportId) return;
      handleUpdateStatusById(reportId, "gesendet", true);
      setCurrentView("archive");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reports, trashReports, archiveReports]);

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
    } catch (_e) {
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
    if (canvas) setReportForm((prev) => ({ ...prev, signatureData: canvas.toDataURL("image/png") }));
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

  const findReportById = (id) =>
    reports.find((r) => r.id === id) || trashReports.find((r) => r.id === id) || archiveReports.find((r) => r.id === id);

  const handleUpdateStatusById = async (reportId, nextStatus, silent = false) => {
    const report = findReportById(reportId);
    if (!report) return;

    const { error } = await supabase.from("reports").update({ status: nextStatus }).eq("id", reportId);
    if (error) {
      if (!silent) setNotice("Status konnte nicht geändert werden.");
      return;
    }

    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setTrashReports((prev) => prev.filter((r) => r.id !== reportId));
    setArchiveReports((prev) => prev.filter((r) => r.id !== reportId));

    const next = { ...report, status: nextStatus };
    if (nextStatus === "geloescht") {
      setTrashReports((prev) => [next, ...prev]);
    } else if (nextStatus === "gesendet" || nextStatus === "archiviert") {
      setArchiveReports((prev) => [next, ...prev]);
    } else {
      setReports((prev) => [next, ...prev]);
    }

    if (openedReport?.id === reportId) setOpenedReport(next);
    if (!silent) setNotice("Status aktualisiert.");
  };

  const handleMoveToTrash = async (report) => {
    const ok = window.confirm("Sicher löschen?");
    if (!ok) return;
    const { error } = await supabase.from("reports").update({ status: "geloescht" }).eq("id", report.id);
    if (error) {
      setNotice("Rapport konnte nicht gelöscht werden.");
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setTrashReports((prev) => [{ ...report, status: "geloescht" }, ...prev.filter((r) => r.id !== report.id)]);
    if (openedReport?.id === report.id) setOpenedReport(null);
    setNotice("Rapport in Papierkorb verschoben.");
  };

  const handleRestoreReport = async (report) => {
    const { error } = await supabase.from("reports").update({ status: "offen" }).eq("id", report.id);
    if (error) {
      setNotice("Rapport konnte nicht wiederhergestellt werden.");
      return;
    }
    setTrashReports((prev) => prev.filter((r) => r.id !== report.id));
    setReports((prev) => [{ ...report, status: "offen" }, ...prev.filter((r) => r.id !== report.id)]);
    setNotice("Rapport wiederhergestellt.");
  };

  const handleHardDeleteReport = async (report) => {
    const ok = window.confirm("Endgültig löschen?");
    if (!ok) return;
    const { error } = await supabase.from("reports").delete().eq("id", report.id);
    if (error) {
      setNotice("Rapport konnte nicht endgültig gelöscht werden.");
      return;
    }
    setTrashReports((prev) => prev.filter((r) => r.id !== report.id));
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setArchiveReports((prev) => prev.filter((r) => r.id !== report.id));
    if (openedReport?.id === report.id) setOpenedReport(null);
    setNotice("Rapport endgültig gelöscht.");
  };

  const handleSaveReport = async () => {
    if (!userId || !reportForm.customer.trim()) {
      setNotice("Bitte Kundenname ausfüllen.");
      return;
    }
    setSavingReport(true);
    setNotice("");

    const payload = {
      customer: reportForm.customer.trim(),
      address: reportForm.address.trim(),
      orderNo: reportForm.orderNo.trim(),
      customerEmail: reportForm.customerEmail.trim(),
      date: reportForm.date,
      status: reportForm.status,
      photos: { before: reportForm.beforePhoto, after: reportForm.afterPhoto },
      workRows: workRows.map((row) => ({ ...row, hours: getWorkRowHours(row), total: getWorkRowTotal(row) })),
      materialRows: materialRows.map((row) => ({ ...row, total: getMaterialRowTotal(row) })),
      costs: { expenses: expenseTotal, notes: reportForm.notes },
      totals: { workSubtotal, materialSubtotal, subtotal, vat, grandTotal },
      signature: { customerName: reportForm.signerName.trim(), imageBase64: reportForm.signatureData }
    };

    const { error } = await supabase.from("reports").insert({
      user_id: userId,
      customer: reportForm.customer.trim(),
      description: JSON.stringify(payload),
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
      status: "offen",
      beforePhoto: "",
      afterPhoto: "",
      expenses: "",
      notes: "",
      signerName: "",
      signatureData: ""
    });
    setSelectedCustomerId("");
    setWorkRows([{ employee: "", from: "", to: "", rate: "" }]);
    setMaterialRows([{ name: "", quantity: "", unit: "", price: "" }]);
    clearSignature();

    setCurrentView("reports");
    await fetchReports();
    setNotice("Rapport gespeichert.");
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => String(c.id) === String(customerId));
    if (!found) return;
    const meta = parseCustomerAddress(found.address);
    setReportForm((prev) => ({
      ...prev,
      customer: found.name || prev.customer,
      customerEmail: found.email || prev.customerEmail,
      address: meta.address || prev.address
    }));
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      companyName: "",
      firstName: "",
      lastName: "",
      address: "",
      zip: "",
      city: "",
      phone: "",
      email: ""
    });
    setEditingCustomerId(null);
  };

  const handleSaveCustomer = async () => {
    if (!userId || !customerForm.companyName.trim()) {
      setNotice("Bitte Firmenname ausfüllen.");
      return;
    }

    setSavingCustomer(true);
    const addressData = JSON.stringify({
      address: customerForm.address.trim(),
      zip: customerForm.zip.trim(),
      city: customerForm.city.trim(),
      firstName: customerForm.firstName.trim(),
      lastName: customerForm.lastName.trim()
    });

    if (editingCustomerId) {
      const { error } = await supabase
        .from("customers")
        .update({
          name: customerForm.companyName.trim(),
          address: addressData,
          phone: customerForm.phone.trim(),
          email: customerForm.email.trim()
        })
        .eq("id", editingCustomerId);
      setSavingCustomer(false);
      if (error) {
        setNotice("Kunde konnte nicht aktualisiert werden.");
        return;
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomerId
            ? { ...c, name: customerForm.companyName.trim(), address: addressData, phone: customerForm.phone.trim(), email: customerForm.email.trim() }
            : c
        )
      );
      setNotice("Kunde aktualisiert.");
      resetCustomerForm();
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id: userId,
        name: customerForm.companyName.trim(),
        address: addressData,
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim()
      })
      .select("*")
      .single();

    setSavingCustomer(false);
    if (error) {
      setNotice("Kunde konnte nicht gespeichert werden.");
      return;
    }
    setCustomers((prev) => [data, ...prev]);
    setNotice("Kunde gespeichert.");
    resetCustomerForm();
  };

  const handleEditCustomer = (customer) => {
    const meta = parseCustomerAddress(customer.address);
    setEditingCustomerId(customer.id);
    setCustomerForm({
      companyName: customer.name || "",
      firstName: meta.firstName || "",
      lastName: meta.lastName || "",
      address: meta.address || "",
      zip: meta.zip || "",
      city: meta.city || "",
      phone: customer.phone || "",
      email: customer.email || ""
    });
  };

  const handleDeleteCustomer = async (customer) => {
    const ok = window.confirm("Kunde wirklich löschen?");
    if (!ok) return;
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) {
      setNotice("Kunde konnte nicht gelöscht werden.");
      return;
    }
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    if (editingCustomerId === customer.id) resetCustomerForm();
    setNotice("Kunde gelöscht.");
  };

  const openPdfWindow = (report) => {
    const payload = parseReportPayload(report) || {};
    const workData = payload.workRows || [];
    const materialData = payload.materialRows || [];
    const totals = payload.totals || {};
    const costs = payload.costs || {};
    const photos = payload.photos || {};
    const signature = payload.signature || {};
    const customerName = report.customer || payload.customer || "-";
    const customerEmail = report.customer_email || payload.customerEmail || "";
    const subject = `BauAbnahme Rapport - ${customerName} - ${report.date || payload.date || "-"}`;
    const body = [
      "BauAbnahme Rapport",
      "",
      `Kunde: ${customerName}`,
      `Datum: ${report.date || payload.date || "-"}`,
      `Auftrag-Nr: ${report.auftrag_nr || payload.orderNo || "-"}`,
      "",
      `Zwischensumme CHF: ${Number(totals.subtotal || 0).toFixed(2)}`,
      `MwSt 8.1% CHF: ${Number(totals.vat || 0).toFixed(2)}`,
      `TOTAL CHF: ${Number(totals.grandTotal || 0).toFixed(2)}`
    ].join("\n");

    const esc = (value) =>
      String(value ?? "-")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const mailto = `mailto:${encodeURIComponent(customerEmail)}?cc=${encodeURIComponent(userEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) {
      setNotice("Popup blockiert. Bitte Popups erlauben.");
      return;
    }

    const workRowsHtml = workData
      .map(
        (row, idx) => `<tr>
          <td>${idx + 1}</td>
          <td>${esc(row.employee)}</td>
          <td>${esc(row.from)} - ${esc(row.to)}</td>
          <td style="text-align:right">${Number(row.hours || 0).toFixed(2)}</td>
          <td style="text-align:right">CHF ${Number(row.total || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const materialRowsHtml = materialData
      .map(
        (row, idx) => `<tr>
          <td>${idx + 1}</td>
          <td>${esc(row.name)}</td>
          <td>${esc(row.quantity)} ${esc(row.unit)}</td>
          <td style="text-align:right">CHF ${Number(row.total || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Rapport ${esc(report.id)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #222; margin: 24px; background: #fff; }
      .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; gap: 10px; flex-wrap: wrap; }
      .brand { font-size: 28px; font-weight: 700; color: #d4a853; }
      .actions { display: flex; gap: 8px; }
      .btn { background: #d4a853; border: none; color: #111; padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; }
      .card { border: 1px solid rgba(212,168,83,0.4); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
      h2 { margin: 0 0 8px 0; font-size: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 13px; }
      th { background: #f6f3eb; text-align: left; }
      .total { font-size: 24px; font-weight: 800; color: #d4a853; text-align: right; margin-top: 10px; }
      .photos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .photos img { width: 100%; max-height: 220px; object-fit: cover; border: 1px solid rgba(212,168,83,0.4); border-radius: 8px; }
      .signature img { width: 280px; max-width: 100%; border: 1px solid rgba(212,168,83,0.4); border-radius: 8px; }
      @media print { .actions { display: none; } body { margin: 10mm; } }
    </style>
  </head>
  <body>
    <div class="top">
      <div class="brand">BauAbnahme</div>
      <div class="actions">
        <button class="btn" onclick="window.print()">Drucken/Speichern als PDF</button>
        <a class="btn" href="${mailto}" onclick="window.opener && window.opener.postMessage({ type: 'BAU_REPORT_SENT', id: ${Number(report.id)} }, '*')">Per E-Mail senden</a>
      </div>
    </div>

    <div class="card">
      <h2>Rapport</h2>
      <div><strong>Rapport Nr:</strong> ${esc(report.id)}</div>
      <div><strong>Kunde:</strong> ${esc(customerName)}</div>
      <div><strong>Datum:</strong> ${esc(report.date || payload.date)}</div>
      <div><strong>Auftrag-Nr:</strong> ${esc(report.auftrag_nr || payload.orderNo || "-")}</div>
      <div><strong>Beschreibung:</strong> ${esc(costs.notes || payload.description || report.description || "-")}</div>
    </div>

    ${(photos.before || photos.after) ? `
    <div class="card">
      <h2>Fotos</h2>
      <div class="photos">
        <div>
          <div>Vorher</div>
          ${photos.before ? `<img src="${photos.before}" alt="Vorher" />` : "<div>Kein Vorher Foto</div>"}
        </div>
        <div>
          <div>Nachher</div>
          ${photos.after ? `<img src="${photos.after}" alt="Nachher" />` : "<div>Kein Nachher Foto</div>"}
        </div>
      </div>
    </div>` : ""}

    <div class="card">
      <h2>Arbeitsstunden</h2>
      <table><thead><tr><th>#</th><th>Mitarbeiter</th><th>Zeit</th><th>Stunden</th><th>Total</th></tr></thead>
      <tbody>${workRowsHtml || "<tr><td colspan='5'>Keine Daten</td></tr>"}</tbody></table>
    </div>

    <div class="card">
      <h2>Material</h2>
      <table><thead><tr><th>#</th><th>Bezeichnung</th><th>Menge</th><th>Total</th></tr></thead>
      <tbody>${materialRowsHtml || "<tr><td colspan='4'>Keine Daten</td></tr>"}</tbody></table>
    </div>

    <div class="card">
      <h2>Kosten & Totals</h2>
      <div><strong>Spesen:</strong> CHF ${Number(costs.expenses || 0).toFixed(2)}</div>
      <div><strong>Zwischensumme:</strong> CHF ${Number(totals.subtotal || 0).toFixed(2)}</div>
      <div><strong>MwSt 8.1%:</strong> CHF ${Number(totals.vat || 0).toFixed(2)}</div>
      <div class="total">TOTAL CHF ${Number(totals.grandTotal || 0).toFixed(2)}</div>
    </div>

    ${signature.imageBase64 ? `
    <div class="card signature">
      <h2>Unterschrift</h2>
      <div><strong>Name:</strong> ${esc(signature.customerName || "-")}</div>
      <div style="margin-top:8px"><img src="${signature.imageBase64}" alt="Unterschrift" /></div>
    </div>` : ""}
  </body>
</html>`);
    win.document.close();
  };

  const statusBadge = (status) => (
    <span
      style={{
        color: STATUS_COLORS[status] || colors.muted,
        fontWeight: 700,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${colors.border}`,
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 12
      }}
    >
      {status || "-"}
    </span>
  );

  const renderReportDetail = (report) => {
    const payload = parseReportPayload(report) || {};
    const photos = payload.photos || {};
    const workData = payload.workRows || [];
    const materialData = payload.materialRows || [];
    const totals = payload.totals || {};
    const costs = payload.costs || {};
    const signature = payload.signature || {};

    return (
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Rapport Details</h2>
          {statusBadge(report.status)}
        </div>
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <div><strong>Kunde:</strong> {report.customer || payload.customer || "-"}</div>
          <div><strong>Adresse:</strong> {payload.address || "-"}</div>
          <div><strong>Datum:</strong> {report.date || payload.date || "-"}</div>
          <div><strong>Auftrag-Nr:</strong> {report.auftrag_nr || payload.orderNo || "-"}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: colors.muted, marginRight: 8 }}>Status ändern:</label>
          <select value={report.status || "offen"} onChange={(e) => handleUpdateStatusById(report.id, e.target.value)} style={{ ...inputStyle, minHeight: 36, width: 200 }}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {(photos.before || photos.after) ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>{photos.before ? <img src={photos.before} alt="Vorher" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: `1px solid ${colors.border}` }} /> : <div style={{ color: colors.muted }}>Kein Vorher Foto</div>}</div>
            <div>{photos.after ? <img src={photos.after} alt="Nachher" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: `1px solid ${colors.border}` }} /> : <div style={{ color: colors.muted }}>Kein Nachher Foto</div>}</div>
          </div>
        ) : null}

        <h3>Arbeitsstunden</h3>
        <div style={{ overflowX: "auto", marginBottom: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Mitarbeiter</th><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Von</th><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Bis</th><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Stunden</th><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Total CHF</th></tr>
            </thead>
            <tbody>
              {workData.length === 0 ? <tr><td colSpan={5} style={{ border: `1px solid ${colors.border}`, padding: 6, color: colors.muted }}>Keine Daten</td></tr> : workData.map((row, i) => (
                <tr key={`wd-${i}`}>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{row.employee || "-"}</td>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{row.from || "-"}</td>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{row.to || "-"}</td>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{Number(row.hours || 0).toFixed(2)}</td>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{Number(row.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Material</h3>
        <div style={{ overflowX: "auto", marginBottom: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Bezeichnung</th><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Menge</th><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Einheit</th><th style={{ border: `1px solid ${colors.border}`, padding: 6 }}>Total CHF</th></tr>
            </thead>
            <tbody>
              {materialData.length === 0 ? <tr><td colSpan={4} style={{ border: `1px solid ${colors.border}`, padding: 6, color: colors.muted }}>Keine Daten</td></tr> : materialData.map((row, i) => (
                <tr key={`md-${i}`}>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{row.name || "-"}</td>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{row.quantity || "-"}</td>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{row.unit || "-"}</td>
                  <td style={{ border: `1px solid ${colors.border}`, padding: 6 }}>{Number(row.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gap: 4, marginBottom: 12 }}>
          <div><strong>Spesen:</strong> CHF {Number(costs.expenses || 0).toFixed(2)}</div>
          <div><strong>Notizen:</strong> {costs.notes || "-"}</div>
          <div><strong>MwSt 8.1%:</strong> CHF {Number(totals.vat || 0).toFixed(2)}</div>
          <div style={{ color: colors.gold, fontSize: 24, fontWeight: 800 }}><strong>TOTAL CHF {Number(totals.grandTotal || 0).toFixed(2)}</strong></div>
        </div>

        {signature.imageBase64 ? (
          <div style={{ marginBottom: 12 }}>
            <div><strong>Unterschrift:</strong> {signature.customerName || "-"}</div>
            <img src={signature.imageBase64} alt="Unterschrift" style={{ width: 280, maxWidth: "100%", marginTop: 6, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setOpenedReport(null)} style={{ ...buttonPrimary, background: "#2a2a2a", color: colors.text }}>Zurück</button>
          <button type="button" onClick={() => openPdfWindow(report)} style={buttonPrimary}>PDF E-Mail</button>
        </div>
      </section>
    );
  };

  const renderReportCards = (list, isTrash = false) => (
    <div style={{ display: "grid", gap: 8 }}>
      {list.map((report) => {
        const payload = parseReportPayload(report) || {};
        return (
          <div key={report.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ color: "#f0ece4" }}>{report.customer || "-"}</strong>
              {statusBadge(report.status)}
            </div>
            <div style={{ color: "#f0ece4", opacity: 0.9, fontSize: 13 }}>Auftrag-Nr: {report.auftrag_nr || payload.orderNo || "-"}</div>
            <div style={{ color: "#f0ece4" }}>{report.date || "-"}</div>
            {!isTrash ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" onClick={() => setOpenedReport(report)} style={{ ...buttonPrimary, minHeight: 34 }}>Öffnen</button>
                <button type="button" onClick={() => handleMoveToTrash(report)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: "#f0ece4", padding: "0 12px", cursor: "pointer" }}>🗑️ Löschen</button>
                <button type="button" onClick={() => openPdfWindow(report)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: "#f0ece4", padding: "0 12px", cursor: "pointer" }}>PDF E-Mail</button>
                <select value={report.status || "offen"} onChange={(e) => handleUpdateStatusById(report.id, e.target.value)} style={{ ...inputStyle, minHeight: 34 }}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => handleRestoreReport(report)} style={{ ...buttonPrimary, minHeight: 34 }}>Wiederherstellen</button>
                <button type="button" onClick={() => handleHardDeleteReport(report)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: "#f0ece4", padding: "0 12px", cursor: "pointer" }}>Endgültig löschen</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderView = () => {
    if (openedReport) return renderReportDetail(openedReport);

    if (currentView === "new-report") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0, marginBottom: 14 }}>Swiss Regierapport</h2>
          <div style={{ display: "grid", gap: 16 }}>
            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Header</h3>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <select value={selectedCustomerId} onChange={(e) => handleCustomerSelect(e.target.value)} style={inputStyle}>
                  <option value="">Kunde auswählen</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="text" placeholder="Kundenname" value={reportForm.customer} onChange={(e) => setReportForm((p) => ({ ...p, customer: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="Adresse" value={reportForm.address} onChange={(e) => setReportForm((p) => ({ ...p, address: e.target.value }))} style={inputStyle} />
                <input type="date" value={reportForm.date} onChange={(e) => setReportForm((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="Auftrag-Nr" value={reportForm.orderNo} onChange={(e) => setReportForm((p) => ({ ...p, orderNo: e.target.value }))} style={inputStyle} />
                <input type="email" placeholder="Kunde E-Mail" value={reportForm.customerEmail} onChange={(e) => setReportForm((p) => ({ ...p, customerEmail: e.target.value }))} style={inputStyle} />
                <select value={reportForm.status} onChange={(e) => setReportForm((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Fotos</h3>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: colors.muted }}>Vorher Foto</label>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload("beforePhoto", e.target.files?.[0])} style={{ color: colors.muted }} />
                  {reportForm.beforePhoto ? <img src={reportForm.beforePhoto} alt="Vorher" style={{ marginTop: 8, width: 140, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${colors.border}` }} /> : null}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: colors.muted }}>Nachher Foto</label>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload("afterPhoto", e.target.files?.[0])} style={{ color: colors.muted }} />
                  {reportForm.afterPhoto ? <img src={reportForm.afterPhoto} alt="Nachher" style={{ marginTop: 8, width: 140, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${colors.border}` }} /> : null}
                </div>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Arbeitsstunden</h3>
              <button type="button" onClick={() => setWorkRows((prev) => [...prev, { employee: "", from: "", to: "", rate: "" }])} style={{ ...buttonPrimary, minHeight: 36, marginBottom: 10 }}>Zeile hinzufügen</button>
              <div style={{ display: "grid", gap: 8 }}>
                {workRows.map((row, idx) => (
                  <div key={`w-${idx}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                    <input type="text" placeholder="Mitarbeiter" value={row.employee} onChange={(e) => updateWorkRow(idx, "employee", e.target.value)} style={inputStyle} />
                    <input type="time" value={row.from} onChange={(e) => updateWorkRow(idx, "from", e.target.value)} style={inputStyle} />
                    <input type="time" value={row.to} onChange={(e) => updateWorkRow(idx, "to", e.target.value)} style={inputStyle} />
                    <input type="text" value={getWorkRowHours(row).toString()} readOnly style={{ ...inputStyle, color: colors.gold }} />
                    <input type="number" placeholder="Ansatz CHF" value={row.rate} onChange={(e) => updateWorkRow(idx, "rate", e.target.value)} style={inputStyle} />
                    <input type="text" value={getWorkRowTotal(row).toFixed(2)} readOnly style={{ ...inputStyle, color: colors.gold }} />
                  </div>
                ))}
                <div style={{ textAlign: "right", color: colors.gold, fontWeight: 700 }}>Subtotal Arbeitsstunden: CHF {workSubtotal.toFixed(2)}</div>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Material</h3>
              <button type="button" onClick={() => setMaterialRows((prev) => [...prev, { name: "", quantity: "", unit: "", price: "" }])} style={{ ...buttonPrimary, minHeight: 36, marginBottom: 10 }}>Zeile hinzufügen</button>
              <div style={{ display: "grid", gap: 8 }}>
                {materialRows.map((row, idx) => (
                  <div key={`m-${idx}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                    <input type="text" placeholder="Bezeichnung" value={row.name} onChange={(e) => updateMaterialRow(idx, "name", e.target.value)} style={inputStyle} />
                    <input type="number" placeholder="Menge" value={row.quantity} onChange={(e) => updateMaterialRow(idx, "quantity", e.target.value)} style={inputStyle} />
                    <input type="text" placeholder="Einheit" value={row.unit} onChange={(e) => updateMaterialRow(idx, "unit", e.target.value)} style={inputStyle} />
                    <input type="number" placeholder="Preis CHF" value={row.price} onChange={(e) => updateMaterialRow(idx, "price", e.target.value)} style={inputStyle} />
                    <input type="text" value={getMaterialRowTotal(row).toFixed(2)} readOnly style={{ ...inputStyle, color: colors.gold }} />
                  </div>
                ))}
                <div style={{ textAlign: "right", color: colors.gold, fontWeight: 700 }}>Subtotal Material: CHF {materialSubtotal.toFixed(2)}</div>
              </div>
            </section>

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Kosten</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <input type="number" placeholder="Spesen CHF" value={reportForm.expenses} onChange={(e) => setReportForm((p) => ({ ...p, expenses: e.target.value }))} style={inputStyle} />
                <textarea placeholder="Notizen" rows={4} value={reportForm.notes} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 100, padding: 12 }} />
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
                <input type="text" placeholder="Kundenname" value={reportForm.signerName} onChange={(e) => setReportForm((p) => ({ ...p, signerName: e.target.value }))} style={inputStyle} />
                <button type="button" onClick={clearSignature} style={{ ...buttonPrimary, minHeight: 42 }}>Unterschrift löschen</button>
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
          {loadingReports ? <p style={{ color: colors.muted }}>Lade Rapporte...</p> : activeReports.length === 0 ? <p style={{ color: colors.muted }}>Keine Rapporte gefunden.</p> : renderReportCards(activeReports)}
        </section>
      );
    }

    if (currentView === "archive") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Archiv</h2>
          {loadingReports ? <p style={{ color: colors.muted }}>Lade Archiv...</p> : archiveReports.length === 0 ? <p style={{ color: colors.muted }}>Archiv ist leer.</p> : renderReportCards(archiveReports)}
        </section>
      );
    }

    if (currentView === "trash") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Papierkorb</h2>
          {loadingReports ? <p style={{ color: colors.muted }}>Lade Papierkorb...</p> : trashedReports.length === 0 ? <p style={{ color: colors.muted }}>Papierkorb ist leer.</p> : renderReportCards(trashedReports, true)}
        </section>
      );
    }

    if (currentView === "customers") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Kundenprofil</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            <input type="text" placeholder="Firmenname" value={customerForm.companyName} onChange={(e) => setCustomerForm((p) => ({ ...p, companyName: e.target.value }))} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="text" placeholder="Vorname" value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={inputStyle} />
              <input type="text" placeholder="Nachname" value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={inputStyle} />
            </div>
            <input type="text" placeholder="Adresse" value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="text" placeholder="PLZ" value={customerForm.zip} onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))} style={inputStyle} />
              <input type="text" placeholder="Ort" value={customerForm.city} onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))} style={inputStyle} />
            </div>
            <input type="text" placeholder="Telefon" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} style={inputStyle} />
            <input type="email" placeholder="E-Mail" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={handleSaveCustomer} disabled={savingCustomer} style={{ ...buttonPrimary, opacity: savingCustomer ? 0.7 : 1 }}>
                {savingCustomer ? "Speichert..." : editingCustomerId ? "Aktualisieren" : "Kunde speichern"}
              </button>
              {editingCustomerId ? <button type="button" onClick={resetCustomerForm} style={{ ...buttonPrimary, background: "#2a2a2a", color: colors.text }}>Abbrechen</button> : null}
            </div>
          </div>

          {loadingCustomers ? (
            <p style={{ color: colors.muted }}>Lade Kunden...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: colors.muted }}>Keine Kunden gefunden.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {customers.map((customer) => {
                const meta = parseCustomerAddress(customer.address);
                return (
                  <div key={customer.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
                    <strong>{customer.name || "-"}</strong>
                    <div style={{ color: colors.muted }}>{[meta.firstName, meta.lastName].filter(Boolean).join(" ") || "-"}</div>
                    <div style={{ color: colors.muted }}>{meta.address || "-"}, {meta.zip || "-"} {meta.city || "-"}</div>
                    <div style={{ color: colors.muted }}>{customer.phone || "-"} | {customer.email || "-"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button type="button" onClick={() => handleEditCustomer(customer)} style={{ ...buttonPrimary, minHeight: 34 }}>Edit</button>
                      <button type="button" onClick={() => handleDeleteCustomer(customer)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, padding: "0 12px", cursor: "pointer" }}>Delete</button>
                    </div>
                  </div>
                );
              })}
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
        </section>
      );
    }

    return (
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Start</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>Rapporte</div><strong style={{ fontSize: 24 }}>{reports.length}</strong></div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>Archiv</div><strong style={{ fontSize: 24 }}>{archiveReports.length}</strong></div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>Papierkorb</div><strong style={{ fontSize: 24 }}>{trashReports.length}</strong></div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>Kunden</div><strong style={{ fontSize: 24 }}>{customers.length}</strong></div>
        </div>
      </section>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: `1px solid ${colors.border}`, background: colors.panel, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Bau<span style={{ color: colors.gold }}>Abnahme</span></div>
          <nav style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={() => setCurrentView("home")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "home" ? colors.gold : colors.border}`, background: currentView === "home" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Start</button>
            <button type="button" onClick={() => setCurrentView("customers")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "customers" ? colors.gold : colors.border}`, background: currentView === "customers" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Kunden</button>
            <button type="button" onClick={() => setCurrentView("new-report")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "new-report" ? colors.gold : colors.border}`, background: currentView === "new-report" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Neuer Rapport</button>
            <button type="button" onClick={() => setCurrentView("reports")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "reports" ? colors.gold : colors.border}`, background: currentView === "reports" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Alle Rapporte</button>
            <button type="button" onClick={() => setCurrentView("archive")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "archive" ? colors.gold : colors.border}`, background: currentView === "archive" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Archiv</button>
            <button type="button" onClick={() => setCurrentView("trash")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "trash" ? colors.gold : colors.border}`, background: currentView === "trash" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Papierkorb</button>
            <button type="button" onClick={() => setCurrentView("settings")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "settings" ? colors.gold : colors.border}`, background: currentView === "settings" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Einstellungen</button>
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>Dashboard</h1>
              <p style={{ marginTop: 6, marginBottom: 0, color: colors.muted }}>{userEmail || "Nicht angemeldet"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onLogout) return onLogout();
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
