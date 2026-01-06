import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  // ICONS
  LayoutDashboard, FlaskConical, ShoppingCart, History, Users, 
  LogOut, Plus, Trash2, CheckCircle, Upload, FileText, 
  Menu, X, Download, FileCheck, Activity, Key, Edit, ShieldCheck, Lock, 
  ChevronRight, Eye, EyeOff, TrendingUp, Award, BarChart2, XCircle, ChevronDown, ChevronUp,
  Clock, Smartphone, MessageSquare, FileSpreadsheet, Search, RefreshCw, XSquare, Info, 
  Calendar, Filter, Send, Inbox, UserCog, Save, Settings, PlusCircle, GripVertical, BellRing,
  AlertTriangle, HelpCircle, FileText as LogIcon, RotateCcw
} from 'lucide-react';
import { supabase } from './supabaseClient';
// CHART
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import logoAtlas from './assets/logo_atlas.png'
// =========================================
// ASSETS
// =========================================
import logoQcst from './assets/logo_qcst.png';           
import logoAtlasWhite from './assets/logo_atlas.png'; 
// =========================================

const STATUS_COLORS = {
  'Permintaan Terkirim': '#64748b', 
  'Diterima Lab': '#3b82f6',        
  'Diproses': '#f59e0b',            
  'Selesai': '#10b981',             
  'Dibatalkan': '#ef4444'           
};
const COLORS = Object.values(STATUS_COLORS);

// --- COMPONENT: SKELETON LOADER ---
const RequestSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 animate-pulse space-y-4">
    <div className="flex justify-between items-center">
        <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        <div className="h-6 bg-slate-200 rounded w-20"></div>
    </div>
    <div className="h-2 bg-slate-100 rounded w-full"></div>
    <div className="flex gap-4 mt-4">
        <div className="h-4 bg-slate-100 rounded w-1/4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/4"></div>
    </div>
    <div className="space-y-2 pt-2">
        <div className="h-10 bg-slate-50 rounded w-full"></div>
        <div className="h-10 bg-slate-50 rounded w-full"></div>
    </div>
  </div>
);

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4"><AlertTriangle size={48} className="text-red-600"/></div>
            <h1 className="text-2xl font-bold mb-2">Mohon Maaf, Terjadi Kesalahan Sistem</h1>
            <p className="text-slate-500 mb-6 max-w-md">Aplikasi mengalami kendala teknis. Tim IT telah dinotifikasi. Silakan coba muat ulang halaman.</p>
            <button onClick={() => window.location.reload()} className="bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-red-800 transition-all flex items-center gap-2"><RotateCcw size={18}/> MUAT ULANG APLIKASI</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWrapper() {
    return ( <ErrorBoundary> <App /> </ErrorBoundary> );
}

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('login'); 
  const [cart, setCart] = useState([]);
  const [requests, setRequests] = useState([]); 
  const [usersList, setUsersList] = useState([]);
  
  // STATE: CONFIG
  const [materialsConfig, setMaterialsConfig] = useState({});
  const [materialOrder, setMaterialOrder] = useState([]); 
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // STATE: DND
  const dragItem = useRef();
  const dragOverItem = useRef();
  const dragParamItem = useRef();
  const dragParamOverItem = useRef();
  const dragParamMaterial = useRef();

  // STATE: UI & FORM
  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [greeting, setGreeting] = useState('Selamat Datang');

  // STATE: CONFIRMATION MODAL
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });

  // STATE: DASHBOARD
  const [stats, setStats] = useState({
      totalSamples: 0, totalTickets: 0, pendingCount: 0, processingCount: 0, completedCount: 0,  
      materialDistribution: [], statusDistribution: [], topUsers: []
  });
  const [selectedUserStats, setSelectedUserStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // STATE: PROFIL & CONFIG
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myProfileForm, setMyProfileForm] = useState({ full_name: '', password: '' });
  const [showProfileMenu, setShowProfileMenu] = useState(false); 
  const profileMenuRef = useRef(null); 
  const [configTab, setConfigTab] = useState('users'); 
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newParamInput, setNewParamInput] = useState({}); 

  // STATE: UI LAYOUT & LOGIN
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);

  // FORM ORDER
  const [orderForm, setOrderForm] = useState({ 
    material: '', params: [], isSelfService: false, quantity: 1, specificName: '', oxideMethod: '', description: '' 
  });
  const [userForm, setUserForm] = useState({ id: null, username: '', password: '', full_name: '', role: 'user' });
  const [isEditingUser, setIsEditingUser] = useState(false);

  // --- UTILS: DEBOUNCE EFFECT ---
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearch(searchTerm); }, 600);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ====================================================================
  // DATA FETCHING FUNCTIONS (Moved Up)
  // ====================================================================

  const fetchTableRequests = useCallback(async () => {
    if (!session) return;
    setIsDataLoading(true);
    try {
        let query = supabase.from('requests')
            .select(`*, samples!inner (*), creator:created_by_id(full_name), validator:validated_by(full_name)`)
            .order('created_at', { ascending: false });

        if (session.role === 'user') query = query.eq('created_by_id', session.id);

        // Server Side Search Logic
        if (debouncedSearch) {
            // Pencarian sederhana berdasarkan nomor tiket atau status (bisa dikembangkan)
            query = query.or(`ticket_number.ilike.%${debouncedSearch}%,status.ilike.%${debouncedSearch}%`);
        }

        if (dateFilter.start) query = query.gte('created_at', dateFilter.start);
        if (dateFilter.end) {
            const endDate = new Date(dateFilter.end);
            endDate.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endDate.toISOString());
        }

        const limit = debouncedSearch ? 99 : 49;
        query = query.range(0, limit);

        const { data, error } = await query;
        if (!error) setRequests(data || []);
        else console.error(error);
    } catch (err) { console.error("Fetch Error:", err); }
    setIsDataLoading(false);
  }, [session, debouncedSearch, dateFilter]);

  const fetchMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
        const { data } = await supabase.from('app_materials').select('*').order('order_index', { ascending: true });
        if (data) {
            const configObj = {}; const orderArr = [];
            data.forEach(item => { configObj[item.name] = item.parameters || []; orderArr.push(item.name); });
            setMaterialsConfig(configObj); setMaterialOrder(orderArr);
            if (!orderForm.material && data.length > 0) setOrderForm(prev => ({ ...prev, material: data[0].name }));
        }
    } catch (err) { console.error(err); }
    setIsLoadingMaterials(false);
  };

  const fetchGlobalStats = async () => {
      const { data: allData } = await supabase.from('requests').select(`*, samples (*), creator:created_by_id(full_name)`);
      if (allData) {
          let matCounts = {}; let statCounts = {}; let userCounts = {}; let totalSamps = 0;
          const pending = allData.filter(r => r.status === 'Permintaan Terkirim' || r.status === 'Diterima Lab').length;
          const processing = allData.filter(r => r.status === 'Diproses').length;
          const completed = allData.filter(r => r.status === 'Selesai').length;
          allData.forEach(req => {
              statCounts[req.status] = (statCounts[req.status] || 0) + 1;
              const userName = req.creator?.full_name || 'Unknown';
              userCounts[userName] = (userCounts[userName] || 0) + 1;
              (req.samples || []).forEach(s => { matCounts[s.material_type] = (matCounts[s.material_type] || 0) + 1; totalSamps++; });
          });
          setStats({
              totalSamples: totalSamps, totalTickets: allData.length, pendingCount: pending, processingCount: processing, completedCount: completed,   
              materialDistribution: Object.keys(matCounts).map(k => ({ name: k, value: matCounts[k] })).sort((a,b) => b.value - a.value),
              statusDistribution: Object.keys(statCounts).map(k => ({ name: k, value: statCounts[k] })),
              topUsers: Object.keys(userCounts).map(k => ({ name: k, count: userCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 5)
          });
      }
  };

  const fetchUsers = async () => {
    if (session?.role === 'user' || session?.role === 'analyst') return;
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: false }); setUsersList(data || []);
  };
  
  const fetchLogs = async () => {
      if (session?.role === 'user') return;
      const { data } = await supabase.from('app_logs').select('*').order('created_at', { ascending: false }).limit(100);
      setAuditLogs(data || []);
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (session) fetchTableRequests();
  }, [session, fetchTableRequests]); 

  useEffect(() => {
      if(session) {
          fetchMaterials(); fetchGlobalStats();
          if(session.role !== 'user' && session.role !== 'analyst') { fetchUsers(); fetchLogs(); }
      }
  }, [session]);

  // --- REALTIME ---
  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('realtime-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            fetchTableRequests(); fetchGlobalStats();
            if (payload.eventType === 'UPDATE' && session.role === 'user' && session.id === payload.new.created_by_id) { addToast(`Status Tiket ${payload.new.ticket_number} berubah: ${payload.new.status}`, 'success'); }
            if (payload.eventType === 'INSERT' && session.role !== 'user') { addToast(`Permintaan Baru Masuk`, 'info'); }
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, fetchTableRequests]); 

  // --- LOG ACTIVITY ---
  const logActivity = async (action, details) => {
      if (!session) return;
      try { await supabase.from('app_logs').insert([{ actor_name: session.full_name, role: session.role, action: action, details: details }]); } catch (e) { console.error(e); }
  };

  // --- HANDLERS ---
  const handleDragStart = (e, pos) => { dragItem.current = pos; };
  const handleDragEnter = (e, pos) => { dragOverItem.current = pos; e.preventDefault(); };
  const handleDragEnd = async () => {
    if (dragItem.current === undefined || dragOverItem.current === undefined) return;
    const copy = [...materialOrder];
    const item = copy[dragItem.current];
    copy.splice(dragItem.current, 1); copy.splice(dragOverItem.current, 0, item);
    dragItem.current = null; dragOverItem.current = null; setMaterialOrder(copy);
    const updates = copy.map((name, idx) => ({ name, order_index: idx }));
    for (const u of updates) await supabase.from('app_materials').update({ order_index: u.order_index }).eq('name', u.name);
    logActivity("REORDER MATERIAL", "Mengubah urutan material");
  };

  const handleParamDragStart = (e, mat, pos) => { e.stopPropagation(); dragParamItem.current = pos; dragParamMaterial.current = mat; };
  const handleParamDragEnter = (e, mat, pos) => { e.preventDefault(); e.stopPropagation(); if (dragParamMaterial.current === mat) dragParamOverItem.current = pos; };
  const handleParamDragEnd = async (e, mat) => {
      e.preventDefault(); e.stopPropagation();
      if (dragParamItem.current === undefined || dragParamOverItem.current === undefined || dragParamMaterial.current !== mat) { dragParamItem.current = null; return; }
      const params = [...materialsConfig[mat]];
      const item = params[dragParamItem.current];
      params.splice(dragParamItem.current, 1); params.splice(dragParamOverItem.current, 0, item);
      setMaterialsConfig(p => ({...p, [mat]: params}));
      await supabase.from('app_materials').update({ parameters: params }).eq('name', mat);
      dragParamItem.current = null; dragParamOverItem.current = null; dragParamMaterial.current = null;
      logActivity("REORDER PARAMETER", `Mengubah urutan parameter di ${mat}`);
  };

  useEffect(() => { const h = new Date().getHours(); if (h >= 4 && h < 10) setGreeting("Selamat Pagi"); else if (h >= 10 && h < 15) setGreeting("Selamat Siang"); else if (h >= 15 && h < 18) setGreeting("Selamat Sore"); else setGreeting("Selamat Malam"); }, []);
  useEffect(() => { function handleClickOutside(e) { if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setShowProfileMenu(false); } document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, []);
// KODE BARU (Session Resmi)
useEffect(() => {
  // 1. Cek sesi saat aplikasi dibuka
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      // Ambil data detail user dari tabel app_users
      fetchUserProfile(session.user.email); 
    }
  });

  // 2. Dengarkan jika user Login/Logout
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      fetchUserProfile(session.user.email);
    } else {
      setSession(null);
      setView('login');
    }
  });

  return () => subscription.unsubscribe();
}, []);

// Fungsi bantu untuk ambil data Role & Nama
const fetchUserProfile = async (email) => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (data) {
      // Gabungkan data Auth + Data Profil Database
      setSession({ ...data, id: data.id }); // Pastikan ID mengacu ke app_users
      setView('dashboard');
    }
  } catch (err) {
    console.error("Gagal load profil:", err);
  }
};
  useEffect(() => { const h = (e) => { e.preventDefault(); setDeferredPrompt(e); }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h); }, []);

  const addToast = (msg, type = 'info') => { const id = Date.now(); setToasts(p => [...p, { id, message: msg, type }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000); };
  const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));
  const handleInstallClick = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); setDeferredPrompt(null); };

// KODE BARU (Login Tembus RLS)
const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    // 1. Minta tiket masuk resmi ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginForm.username, // Asumsi inputnya adalah EMAIL
      password: loginForm.password,
    });

    if (authError) throw new Error(authError.message);

    // 2. Jika sukses, ambil data nama & role dari tabel app_users
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', authData.user.email)
      .single();

    if (userError || !userData) throw new Error("User login sukses, tapi data profil tidak ditemukan.");

    // 3. Simpan sesi
    setSession(userData);
    setView('dashboard');
    addToast(`Selamat datang, ${userData.full_name}!`, 'success');
    
    logActivity("LOGIN", "User masuk ke sistem");

  } catch (err) {
    addToast("Login Gagal: " + err.message, 'error');
  } finally {
    setLoading(false);
  }
};
  const handleLogout = async () => {
  logActivity("LOGOUT", "User keluar sistem");
  await supabase.auth.signOut(); // Logout resmi dari server
  setSession(null);
  setView('login');
  setLoginForm({ username: '', password: '', remember: false });
  setCart([]);
};
 const openProfileModal = () => { setMyProfileForm({ full_name: session.full_name, password: session.password }); setShowProfileModal(true); setShowProfileMenu(false); };
  const handleUpdateProfile = async () => { if (!myProfileForm.full_name || !myProfileForm.password) return addToast("Data tidak lengkap!", "error"); setLoading(true); try { const { error } = await supabase.from('app_users').update({ full_name: myProfileForm.full_name, password: myProfileForm.password }).eq('id', session.id); if (error) throw error; const newSession = { ...session, full_name: myProfileForm.full_name, password: myProfileForm.password }; setSession(newSession); if (localStorage.getItem('atlas_session')) { localStorage.setItem('atlas_session', JSON.stringify(newSession)); } addToast("Profil diperbarui!", "success"); setShowProfileModal(false); logActivity("UPDATE PROFILE", "Mengubah nama/password sendiri"); } catch (err) { addToast("Gagal: " + err.message, "error"); } finally { setLoading(false); } };

  const triggerConfirm = (title, message, type, action) => { setConfirmModal({ isOpen: true, title, message, type, onConfirm: action }); };
  const closeConfirm = () => { setConfirmModal({ ...confirmModal, isOpen: false }); };
  const executeConfirm = () => { if (confirmModal.onConfirm) confirmModal.onConfirm(); closeConfirm(); };

  const handleAddMaterial = async () => { if (!newMaterialName.trim()) return addToast("Nama kosong!", "error"); if (materialsConfig[newMaterialName]) return addToast("Sudah ada!", "error"); try { const idx = materialOrder.length; const { error } = await supabase.from('app_materials').insert([{ name: newMaterialName, parameters: [], order_index: idx }]); if (error) throw error; addToast("Material ditambahkan!", "success"); setNewMaterialName(''); fetchMaterials(); logActivity("ADD MATERIAL", `Menambah material: ${newMaterialName}`); } catch (err) { addToast(err.message, "error"); } };
  const handleDeleteMaterial = (name) => { triggerConfirm("Hapus Material?", `Hapus "${name}" permanen?`, "danger", async () => { try { await supabase.from('app_materials').delete().eq('name', name); addToast("Material dihapus.", "info"); if (orderForm.material === name) setOrderForm({ ...orderForm, material: '', params: [] }); fetchMaterials(); logActivity("DELETE MATERIAL", `Menghapus material: ${name}`); } catch (err) { addToast(err.message, "error"); } }); };
  const handleAddParameter = async (mat) => { const p = newParamInput[mat]; if (!p || !p.trim()) return addToast("Kosong!", "error"); if (materialsConfig[mat].includes(p)) return addToast("Sudah ada!", "error"); const newParams = [...materialsConfig[mat], p]; try { await supabase.from('app_materials').update({ parameters: newParams }).eq('name', mat); setNewParamInput({...newParamInput, [mat]: ''}); addToast("Parameter ditambahkan.", "success"); fetchMaterials(); logActivity("ADD PARAMETER", `Menambah parameter ${p} ke ${mat}`); } catch (err) { addToast(err.message, "error"); } };
  const handleDeleteParameter = async (mat, p) => { const newParams = materialsConfig[mat].filter(x => x !== p); try { await supabase.from('app_materials').update({ parameters: newParams }).eq('name', mat); addToast("Parameter dihapus.", "info"); fetchMaterials(); logActivity("DELETE PARAMETER", `Menghapus parameter ${p} dari ${mat}`); } catch (err) { addToast(err.message, "error"); } };

  // --- FIX: DEFINISIKAN filteredRequests AGAR TIDAK CRASH ---
  // Karena filtering sudah dilakukan di Server (fetchTableRequests), maka variabel ini cukup me-refer ke state 'requests'
  const filteredRequests = requests; 

  const handleReorder = (req) => { const items = (req.samples || []).map((s, i) => ({ id: Date.now() + i, material: s.material_type, params: s.parameters, isSelfService: s.is_self_service, specificName: s.specific_name, oxideMethod: s.oxide_method, description: s.description })); setCart([...cart, ...items]); if (window.innerWidth < 1024) setIsCartOpen(true); addToast("Item masuk keranjang!", "success"); };
  const handleExportExcel = () => { if (filteredRequests.length === 0) return addToast("No data!", "error"); let csv = "No Tiket,Tanggal,Jam,Pemohon,Material,Nama Spesifik,Parameter Uji,Metode Oksida,Keterangan,Tipe Layanan,Status,Validator\n"; filteredRequests.forEach(r => { (r.samples || []).forEach(s => { const d = new Date(r.created_at); const clean = (t) => t ? `"${t.toString().replace(/"/g, '""')}"` : "-"; csv += [r.ticket_number, d.toLocaleDateString('id-ID'), d.toLocaleTimeString('id-ID'), clean(r.creator?.full_name), clean(s.material_type), clean(s.specific_name || s.material_type), clean(s.parameters.join('; ')), clean(s.oxide_method), clean(s.description), s.is_self_service ? "Mandiri" : "Full Service", r.status, clean(r.validator?.full_name)].join(",") + "\n"; }); }); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `Laporan_Lab_ATLAS_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); addToast("Export berhasil!", "success"); logActivity("EXPORT DATA", "Mengunduh data Excel"); };
  
  const handleValidate = (id) => { triggerConfirm("Validasi?", "Data akan divalidasi dan status menjadi Selesai.", "success", async () => { const { error } = await supabase.from('requests').update({ validated_by: session.id, validated_at: new Date().toISOString(), status: 'Selesai' }).eq('id', id); if(error) addToast(error.message, "error"); else { addToast("Validasi Berhasil!", "success"); fetchTableRequests(); fetchGlobalStats(); logActivity("VALIDATE", `Memvalidasi tiket ID: ${id}`); } }); };
  const updateStatus = async (id, status) => { await supabase.from('requests').update({ status }).eq('id', id); addToast(`Status: ${status}`, "info"); fetchTableRequests(); fetchGlobalStats(); logActivity("UPDATE STATUS", `Ubah status tiket ID: ${id} menjadi ${status}`); };
  const handleDeleteUser = (id) => { triggerConfirm("Hapus User?", "User akan dihapus permanen.", "danger", async () => { await supabase.from('app_users').delete().eq('id', id); fetchUsers(); addToast("User dihapus", "info"); logActivity("DELETE USER", `Menghapus user ID: ${id}`); }); };
  const prepareEditUser = (user) => { setUserForm({ id: user.id, username: user.username, password: user.password, full_name: user.full_name, role: user.role }); setIsEditingUser(true); setIsUserFormOpen(true); };
  const resetUserForm = () => { setUserForm({ id: null, username: '', password: '', full_name: '', role: 'user' }); setIsEditingUser(false); };
  const handleSaveUser = async () => { if (!userForm.username || !userForm.password) return addToast("Data tidak lengkap!", "error"); if (isEditingUser) { const { error } = await supabase.from('app_users').update({ password: userForm.password, full_name: userForm.full_name, role: userForm.role }).eq('id', userForm.id); if(error) addToast(error.message, "error"); else { addToast("User updated!", "success"); logActivity("UPDATE USER", `Update data user: ${userForm.username}`); } } else { const { error } = await supabase.from('app_users').insert([{ username: userForm.username, password: userForm.password, full_name: userForm.full_name, role: userForm.role }]); if(error) addToast(error.message, "error"); else { addToast("User created!", "success"); logActivity("CREATE USER", `Membuat user baru: ${userForm.username}`); } } fetchUsers(); resetUserForm(); };
  
  // --- FIX: KEMBALIKAN FUNGSI openUserStats ---
  const openUserStats = (user) => { const fetchS = async () => { const { data } = await supabase.from('requests').select(`*, samples (*)`).eq('created_by_id', user.id); if(data) { let m = {}, p = {}, t = 0; data.forEach(r => { (r.samples||[]).forEach(s => { t++; m[s.material_type] = (m[s.material_type]||0)+1; s.parameters.forEach(x => p[x] = (p[x]||0)+1); }); }); setSelectedUserStats({ user, totalSamples: t, materialData: Object.keys(m).map(k=>({name:k, value:m[k]})), paramData: Object.keys(p).map(k=>({name:k, value:p[k]})).sort((a,b)=>b.value-a.value).slice(0,7) }); setShowStatsModal(true); } }; fetchS(); };

  const handleDeleteRequest = (id) => { triggerConfirm("Hapus Permintaan?", "Data akan hilang permanen.", "danger", async () => { const { error } = await supabase.from('requests').delete().eq('id', id); if(error) addToast(error.message, "error"); else { fetchTableRequests(); fetchGlobalStats(); addToast("Dihapus", "info"); logActivity("DELETE REQUEST", `Menghapus tiket ID: ${id}`); } }); };
  const uploadResult = async (e, id) => { const f = e.target.files[0]; if (!f) return; if(f.type !== 'application/pdf') return addToast("Harus PDF!", "error"); if(f.size > 2*1024*1024) return addToast("Max 2MB!", "error"); setUploadingId(id); const n = `REQ_${id}_${Date.now()}.pdf`; try { const { error } = await supabase.storage.from('lab-results').upload(n, f); if (error) throw error; const { data } = supabase.storage.from('lab-results').getPublicUrl(n); await supabase.from('requests').update({ result_pdf_url: data.publicUrl, validated_by: null, validated_at: null }).eq('id', id); addToast("Uploaded!", "success"); fetchTableRequests(); fetchGlobalStats(); logActivity("UPLOAD RESULT", `Upload hasil untuk tiket ID: ${id}`); } catch (err) { addToast(err.message, "error"); } finally { setUploadingId(null); } };
  const addToCart = () => { if (orderForm.params.length === 0) return addToast("Pilih parameter!", "error"); const qty = parseInt(orderForm.quantity)||0; if (qty < 1) return addToast("Jumlah min 1", "error"); const items = []; for (let i = 0; i < qty; i++) { items.push({ id: Date.now() + i, material: orderForm.material, params: orderForm.params, isSelfService: orderForm.isSelfService, specificName: (orderForm.material === 'Raw Material' || orderForm.material === 'AFR') ? orderForm.specificName : orderForm.material, oxideMethod: orderForm.params.includes('Oksida') ? orderForm.oxideMethod : null, description: orderForm.description }); } setCart([...cart, ...items]); setOrderForm({ ...orderForm, params: [], quantity: 1, specificName: '', oxideMethod: '', description: '' }); if (window.innerWidth < 1024) setIsCartOpen(true); addToast("Masuk list!", "success"); };
  const handleCheckout = async () => { if (cart.length === 0) return; setLoading(true); const ticket = `ATL-${Math.floor(Math.random() * 10000)}`; try { const { data: req } = await supabase.from('requests').insert([{ ticket_number: ticket, status: 'Permintaan Terkirim', created_by_id: session.id }]).select().single(); const sData = cart.map(i => ({ request_id: req.id, material_type: i.material, parameters: i.params, is_self_service: i.isSelfService, specific_name: i.specificName, oxide_method: i.oxideMethod, description: i.description })); await supabase.from('samples').insert(sData); addToast("Sukses! Tiket: " + ticket, "success"); setCart([]); setView((session.role !== 'user') ? 'admin_requests' : 'history'); fetchTableRequests(); fetchGlobalStats(); logActivity("CREATE REQUEST", `Membuat request baru: ${ticket}`); } catch (err) { addToast(err.message, "error"); } finally { setLoading(false); } };
  const toggleParam = (p) => { if (orderForm.params.includes(p)) setOrderForm({...orderForm, params: orderForm.params.filter(x => x !== p)}); else setOrderForm({...orderForm, params: [...orderForm.params, p]}); };
  const isFullSelfService = (s) => { if (!s || s.length === 0) return false; return s.every(x => x.is_self_service === true); };

  // --- RENDER LOGIN ---
  if (view === 'login') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-white-900 via-red-800 to-slate-900 overflow-hidden relative">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20"><div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-700 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse"></div><div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-700 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse delay-1000"></div></div>
        <div className="z-10 bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl w-full max-w-sm shadow-2xl m-4 text-center relative">
          <div className="mb-8 flex flex-col items-center justify-center"><img src={logoQcst} alt="QCST Logo" className="h-20 w-auto object-contain drop-shadow-lg animate-fade-in-down" /><img src={logoAtlasWhite} alt="ATLAS Logo" className="h-20 w-auto object-contain drop-shadow-xl animate-fade-in-up" /><p className="text-black-900 text-xs font-medium tracking-wider uppercase border-t border-red-400/30 pt-4 mt-2 w-full">Aplikasi Terpadu Layanan Analisa Sample</p></div>
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <input type="text" placeholder="Username" className="w-full bg-slate-200 border border-white-300/30 rounded-lg p-3 text-black placeholder-white-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} autoComplete="off" />
            <div className="relative"><input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full bg-slate-200 border border-white-300/30 rounded-lg p-3 text-black placeholder-white-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-600 hover:text-white transition-colors focus:outline-none">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
            <div className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer" onClick={() => setLoginForm({...loginForm, remember: !loginForm.remember})}><div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${loginForm.remember ? 'bg-red-600 border-red-600' : 'border-red-500'}`}>{loginForm.remember && <CheckCircle size={14} className="text-white" />}</div><span className="text-xs font-bold tracking-wide select-none">Auto Log-in</span></div>
            <button disabled={loading} className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg shadow-red-900/50 tracking-wider">{loading ? 'MEMPROSES...' : 'MASUK'}</button>
          </form>
          <p className="mt-8 text-center text-[10px] text-black-200/70 uppercase font-bold tracking-widest">© 2026 PT Semen Tonasa | Quality Control</p>
        </div>
      </div>
    );
  }

  // --- VIEW: MAIN ---
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-800 relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* CONFIRM MODAL */}
      {confirmModal.isOpen && ( <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in"> <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in"> <div className={`p-6 text-center ${confirmModal.type === 'success' ? 'bg-green-50' : confirmModal.type === 'danger' ? 'bg-red-50' : 'bg-blue-50'}`}> <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'success' ? 'bg-green-100 text-green-600' : confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}> {confirmModal.type === 'success' ? <CheckCircle size={32}/> : confirmModal.type === 'danger' ? <AlertTriangle size={32}/> : <HelpCircle size={32}/>} </div> <h3 className="text-lg font-bold text-slate-800 mb-2">{confirmModal.title}</h3> <p className="text-sm text-slate-500">{confirmModal.message}</p> </div> <div className="p-4 bg-white border-t border-slate-100 flex gap-3"> <button onClick={closeConfirm} className="flex-1 py-2.5 rounded-lg border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">BATAL</button> <button onClick={executeConfirm} className={`flex-1 py-2.5 rounded-lg font-bold text-sm text-white shadow-md transition-all ${confirmModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}> YA, LANJUTKAN </button> </div> </div> </div> )}
      {showProfileModal && ( <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in"><div className="p-4 bg-red-800 text-white flex justify-between items-center"><h3 className="font-bold flex items-center gap-2"><UserCog size={20}/> Edit Profil Saya</h3><button onClick={() => setShowProfileModal(false)} className="text-white/70 hover:text-white"><X size={20}/></button></div><div className="p-6 space-y-4"><div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 mb-2"><p className="font-bold">Info:</p> Perubahan akan langsung tersimpan di sistem.</div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Username (Tidak bisa diubah)</label><input className="w-full bg-slate-100 border border-slate-300 rounded-lg p-3 text-sm font-medium text-slate-500 cursor-not-allowed" value={session.username} disabled /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nama Lengkap</label><input className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-bold focus:border-red-600 outline-none" value={myProfileForm.full_name} onChange={(e) => setMyProfileForm({...myProfileForm, full_name: e.target.value})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Password Baru</label><div className="relative"><input className="w-full border-2 border-slate-200 rounded-lg p-3 pr-12 text-sm font-bold focus:border-red-600 outline-none" type={showPassword ? "text" : "password"} value={myProfileForm.password} onChange={(e) => setMyProfileForm({...myProfileForm, password: e.target.value})} /><button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div><button onClick={handleUpdateProfile} className="w-full bg-red-700 hover:bg-red-800 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2 transition-all mt-2">{loading ? 'Menyimpan...' : <><Save size={18}/> SIMPAN PERUBAHAN</>}</button></div></div></div> )}
      {showStatsModal && selectedUserStats && ( <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"><div className="p-6 bg-gradient-to-r from-red-800 to-red-600 text-white flex justify-between items-center"><div><h3 className="text-xl font-bold">Rapor Kinerja User</h3><p className="text-red-100 text-sm">{selectedUserStats.user.full_name} ({selectedUserStats.user.role})</p></div><button onClick={() => setShowStatsModal(false)} className="text-white/70 hover:text-white"><XCircle size={32}/></button></div><div className="p-6 overflow-y-auto space-y-6">{selectedUserStats.totalSamples === 0 ? (<div className="flex flex-col items-center justify-center py-10 text-slate-400"><FlaskConical size={64} className="mb-4 opacity-20"/><p>User ini belum pernah mengajukan sampel.</p></div>) : (<><div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between"><div><p className="text-red-600 text-xs font-bold uppercase tracking-wider">Total Sampel Diajukan</p><p className="text-3xl font-extrabold text-red-800">{selectedUserStats.totalSamples}</p></div><Activity className="text-red-200" size={48} /></div><div className="grid md:grid-cols-2 gap-6"><div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col items-center"><h4 className="font-bold text-slate-700 mb-4 w-full border-b pb-2">Komposisi Material</h4><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={selectedUserStats.materialData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label>{selectedUserStats.materialData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right"/></PieChart></ResponsiveContainer></div></div><div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm"><h4 className="font-bold text-slate-700 mb-4 w-full border-b pb-2">Top Parameter Uji</h4><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={selectedUserStats.paramData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={80} tick={{fontSize: 10}} /><Tooltip cursor={{fill: '#fef2f2'}} /><Bar dataKey="value" fill="#b91c1c" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer></div></div></div></>)}</div></div></div> )}

      <aside className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-red-900 to-slate-900 text-white transform transition-all duration-300 ease-in-out shadow-2xl flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}>
        <div className={`p-6 border-b border-red-800/50 flex items-center ${isSidebarCollapsed ? 'justify-center p-4' : 'justify-between'}`}> {!isSidebarCollapsed && ( <div><img src={logoAtlasWhite} alt="ATLAS" className="h-10 w-auto mb-1" /><p className="text-[6px] text-red-200 font-bold uppercase tracking-widest">Aplikasi Terpadu Layanan Analisa Sampel</p></div> )} <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:block text-red-200 hover:text-white transition-colors"><Menu size={24} /></button><button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-red-200 hover:text-white"><X/></button></div>
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto"> 
            <SidebarItem icon={<LayoutDashboard/>} label="Dashboard" active={view === 'dashboard'} collapsed={isSidebarCollapsed} onClick={() => {setView('dashboard'); setIsMobileMenuOpen(false)}} /> 
            
            {session.role !== 'analyst' && session.role !== 'manager' && (
                <>
                    <SidebarItem icon={<FlaskConical/>} label="Permintaan Uji" active={view === 'order'} collapsed={isSidebarCollapsed} onClick={() => {setView('order'); setIsMobileMenuOpen(false)}} />
                    <SidebarItem icon={<History/>} label="Riwayat Saya" active={view === 'history'} collapsed={isSidebarCollapsed} onClick={() => {setView('history'); setIsMobileMenuOpen(false)}} />
                </>
            )}

            {(session.role === 'admin' || session.role === 'manager' || session.role === 'analyst') && ( 
                <> 
                    {!isSidebarCollapsed ? (<div className="text-xs font-bold text-red-300 uppercase px-3 mt-4 mb-2 tracking-wider animate-fade-in">Admin Area</div>) : (<div className="h-px bg-red-800/50 my-4 mx-2"></div>)} 
                    <SidebarItem icon={<FileText/>} label="Daftar Permintaan" active={view === 'admin_requests'} collapsed={isSidebarCollapsed} onClick={() => {setView('admin_requests'); setIsMobileMenuOpen(false)}} />
                    {session.role !== 'analyst' && <SidebarItem icon={<Settings/>} label="Konfigurasi Sistem" active={view === 'admin_config'} collapsed={isSidebarCollapsed} onClick={() => {setView('admin_config'); setIsMobileMenuOpen(false)}} />} 
                </> 
            )} 
            
            {deferredPrompt && ( <div className="mt-4 pt-4 border-t border-red-800/50"> {!isSidebarCollapsed ? (<button onClick={handleInstallClick} className="w-full flex items-center justify-center gap-2 bg-white text-red-800 px-4 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-100 transition-all"><Smartphone size={18} /> INSTALL APLIKASI</button>) : (<button onClick={handleInstallClick} className="w-full flex items-center justify-center bg-white text-red-800 p-3 rounded-xl shadow-lg hover:bg-slate-100 transition-all" title="Install Aplikasi"><Smartphone size={20} /></button>)} </div> )} 
        </nav>
        <div className={`bg-red-950/30 border-t border-red-800/50 relative ${isSidebarCollapsed ? 'p-2' : 'p-4'}`} ref={profileMenuRef}> {showProfileMenu && ( <div className={`absolute bottom-20 bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in-up text-slate-800 z-50 ${isSidebarCollapsed ? 'left-16 w-48' : 'left-4 right-4'}`}> <button onClick={openProfileModal} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm font-bold border-b border-slate-100"><UserCog size={16} className="text-slate-500"/> Edit Profil</button> <button onClick={handleLogout} className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-600"><LogOut size={16}/> Keluar</button> </div> )} <div className={`flex items-center gap-3 mb-0 cursor-pointer hover:bg-white/10 rounded-lg transition-all select-none ${isSidebarCollapsed ? 'justify-center p-2' : 'p-2'}`} onClick={() => setShowProfileMenu(!showProfileMenu)}> <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center font-bold text-sm shadow-inner border border-red-400/30 shrink-0">{session.username.charAt(0).toUpperCase()}</div> {!isSidebarCollapsed && ( <div className="overflow-hidden flex-1 animate-fade-in"><p className="text-sm font-bold truncate w-24 text-red-50">{session.full_name}</p><p className="text-[10px] text-red-300 uppercase tracking-wider flex items-center gap-1">{session.role} {showProfileMenu ? <ChevronDown size={10}/> : <ChevronUp size={10}/>}</p></div> )} </div> </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100">
        <header className="md:hidden bg-gradient-to-r from-red-900 to-slate-900 p-4 flex justify-between items-center shadow-md z-10"><img src={logoAtlasWhite} alt="ATLAS" className="h-8" /><button onClick={() => setIsMobileMenuOpen(true)} className="text-white"><Menu/></button></header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-slate-200 to-slate-100 opacity-50 pointer-events-none z-0"></div>
          <div className="relative z-10">
            {view === 'dashboard' && ( <div className="max-w-6xl mx-auto space-y-6 animate-fade-in"> <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-2xl p-6 md:p-10 text-white shadow-lg relative overflow-hidden border-b-4 border-red-900"> <div className="relative z-10"> <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{greeting}, {session.full_name}</h2> <p className="text-red-100 mb-8 max-w-lg text-sm md:text-base leading-relaxed">Sistem ATLAS siap membantu proses analisa sampel Anda hari ini dengan cepat, akurat dan presisi.</p> {(session.role !== 'analyst' && session.role !== 'manager') && <button onClick={() => setView('order')} className="bg-white text-red-800 px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg hover:bg-red-50 transition-all flex items-center gap-2 text-sm tracking-wide"><Plus size={18}/> BUAT PERMINTAAN BARU</button>} </div> <FlaskConical className="absolute -bottom-12 -right-12 text-white/10 w-72 h-72 rotate-12" /> </div> <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"> <StatCard label="Total Sampel" value={stats.totalSamples} color="red" /> <StatCard label="Permintaan Baru" value={stats.pendingCount} color="purple" /> <StatCard label="Sedang Diproses" value={stats.processingCount} color="yellow" /> <StatCard label="Selesai" value={stats.completedCount} color="green" /> <StatCard label="Total Tiket" value={stats.totalTickets} color="blue" /> </div> <div className="grid md:grid-cols-2 gap-6 mt-6"> <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-red-600"/> Statistik jenis sample uji</h3><div className="h-80 md:h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.materialDistribution} layout="vertical" margin={{top: 5, right: 30, left: 10, bottom: 5}}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={80} tick={{fontSize: 11, fontWeight: 'bold'}} /><Tooltip cursor={{fill: '#f3f4f6'}} /><Bar dataKey="value" fill="#b91c1c" radius={[0, 4, 4, 0]} barSize={24} /></BarChart></ResponsiveContainer></div></div> <div className="space-y-6"> <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center"> <h3 className="font-bold text-slate-800 mb-2 flex w-full text-center gap-2"><Clock className="text-red-600"/>Status Uji</h3> <div className="h-64 md:h-48 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.statusDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">{stats.statusDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cbd5e1'} stroke="none" />))}</Pie><Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }} /><Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "11px", fontWeight: "600", color: "#475569" }} /></PieChart></ResponsiveContainer></div> </div> <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Award className="text-yellow-500"/> Top Kontributor</h3><ul className="space-y-3">{stats.topUsers.map((u, idx) => (<li key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0"><span className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx===0?'bg-yellow-100 text-yellow-700':idx===1?'bg-gray-100 text-gray-700':'bg-orange-50 text-orange-700'}`}>{idx+1}</span>{u.name}</span><span className="font-bold text-slate-600">{u.count} Tiket</span></li>))}</ul></div> </div> </div> </div> )}
            {view === 'order' && ( <div className="flex flex-col lg:flex-row gap-6 h-full animate-fade-in"> <div className="flex-1 overflow-y-auto pb-48"> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8"> <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-red-800 border-b pb-4"><FlaskConical className="text-red-600"/> Formulir Pengajuan Uji</h2> {isLoadingMaterials ? <div className="text-center py-10"><Activity className="animate-spin text-red-600 mx-auto mb-2"/><p className="text-sm text-slate-500">Memuat konfigurasi material...</p></div> : ( <div className="space-y-8"> <div><label className="text-xs font-bold text-slate-500 uppercase mb-3 block tracking-wider">1. Pilih Material</label> <div className="grid grid-cols-2 md:grid-cols-3 gap-3"> {materialOrder.map(m => ( <button key={m} onClick={() => setOrderForm({...orderForm, material: m, params: [], specificName: ''})} className={`p-4 rounded-lg border-2 text-left text-sm font-bold transition-all ${orderForm.material === m ? 'border-red-600 bg-red-50 text-red-800 shadow-sm' : 'border-slate-100 hover:border-slate-300 text-slate-600'}`}> {m} </button> ))} </div> </div> {(orderForm.material === 'Raw Material' || orderForm.material === 'AFR') && (<div className="bg-slate-50 p-5 rounded-lg border-2 border-slate-200 animate-fade-in"><label className="block text-sm font-bold text-slate-700 mb-2">Sebutkan Nama Spesifik {orderForm.material} <span className="text-red-600">*</span></label><input type="text" placeholder="Contoh: Batu Kapur, Sekam Padi..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none bg-white font-medium" value={orderForm.specificName} onChange={(e) => setOrderForm({...orderForm, specificName: e.target.value})} /></div>)} <div><label className="text-xs font-bold text-slate-500 uppercase mb-3 block tracking-wider">2. Parameter Uji <span className="text-red-600">*</span></label> <div className="grid grid-cols-2 md:grid-cols-4 gap-2"> {materialsConfig[orderForm.material]?.map(p => (<button key={p} onClick={() => toggleParam(p)} className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${orderForm.params.includes(p) ? 'bg-red-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>{orderForm.params.includes(p) ? <CheckCircle size={14}/> : <div className="w-3.5 h-3.5 border-2 rounded-full border-slate-300"/>} {p}</button>)) || <p className="text-slate-400 text-sm italic col-span-4">Belum ada parameter untuk material ini.</p>} </div></div> {orderForm.params.includes('Oksida') && (<div className="bg-slate-50 p-5 rounded-lg border-2 border-slate-200 animate-fade-in"><label className="block text-sm font-bold text-slate-700 mb-3">Metode Uji Oksida <span className="text-red-600">*</span></label><div className="flex flex-col md:flex-row gap-4"><label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-white transition-all bg-white"><input type="radio" name="oxide" value="Fusebead" className="accent-red-600 w-4 h-4" onChange={(e) => setOrderForm({...orderForm, oxideMethod: e.target.value})} /><span className="text-sm font-medium">Fusebead</span></label><label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-white transition-all bg-white"><input type="radio" name="oxide" value="Pressed Pellet" className="accent-red-600 w-4 h-4" onChange={(e) => setOrderForm({...orderForm, oxideMethod: e.target.value})} /><span className="text-sm font-medium">Pressed Pellet</span></label></div></div>)} <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t"> <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Jumlah Sampel</label><input type="number" min="1" max="50" className="w-full p-4 border-2 border-slate-200 rounded-lg font-bold text-lg text-slate-800 focus:border-red-600 outline-none" value={orderForm.quantity} onChange={(e) => { const val = e.target.value; setOrderForm({...orderForm, quantity: val === '' ? '' : parseInt(val)}) }} /></div> <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg border-2 border-amber-100 hover:border-amber-200 transition-all cursor-pointer" onClick={() => setOrderForm({...orderForm, isSelfService: !orderForm.isSelfService})}><input type="checkbox" className="w-5 h-5 accent-amber-600 pointer-events-none" checked={orderForm.isSelfService} readOnly /><div><p className="text-sm font-bold text-amber-900">Mode Self Service</p><p className="text-xs text-amber-700 mt-0.5">Uji mandiri oleh user (Tanpa Laporan)</p></div></div> </div> <div className="pt-2"><label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Keterangan Tambahan (Opsional)</label><input type="text" placeholder="Contoh: Output Silo, Stream Sample, Kondisi basah..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none bg-slate-50 font-medium text-sm" value={orderForm.description} onChange={(e) => setOrderForm({...orderForm, description: e.target.value})} /></div> <button onClick={addToCart} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-3 tracking-wider text-sm mt-4"><Plus size={20}/> TAMBAHKAN KE LIST</button> </div> )} </div> </div> <div className={`fixed bottom-0 left-0 w-full lg:static lg:w-96 bg-white border-t lg:border-l border-slate-200 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:shadow-none z-20 transition-all duration-300 flex flex-col ${isCartOpen ? 'h-[70vh]' : 'h-auto'} lg:h-auto ${cart.length > 0 ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}> <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white cursor-pointer lg:cursor-default" onClick={() => setIsCartOpen(!isCartOpen)}> <div className="flex items-center gap-2"><div className="lg:hidden text-slate-400">{isCartOpen ? <ChevronRight className="rotate-90" size={20}/> : <ChevronRight className="-rotate-90" size={20}/>}</div><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ShoppingCart className="text-red-700"/> <span className="text-sm md:text-lg">List Sampel ({cart.length})</span></h3></div><button onClick={(e) => { e.stopPropagation(); setCart([]); }} className="text-red-500 text-xs font-bold hover:underline uppercase tracking-wider">Hapus Semua</button> </div> <div className={`flex-1 overflow-y-auto space-y-3 p-4 bg-slate-50 ${isCartOpen ? 'block' : 'hidden lg:block'}`}> {cart.map(item => ( <div key={item.id} className="bg-white p-4 rounded-lg border border-slate-200 text-sm relative group hover:border-red-200 hover:shadow-sm transition-all shadow-sm"> <button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button> <p className="font-bold text-slate-800 text-base">{item.specificName}</p> <p className="text-xs text-slate-500 mt-1 font-medium">{item.params.join(', ')}</p> {item.description && (<p className="text-xs text-slate-500 mt-1 italic flex items-start gap-1"><MessageSquare size={10} className="mt-0.5 shrink-0"/> {item.description}</p>)} <div className="flex gap-2 mt-2">{item.oxideMethod && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded font-bold border border-purple-100">{item.oxideMethod}</span>}{item.isSelfService && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold border border-amber-100">Mandiri</span>}</div> </div> ))} {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg p-4"><FlaskConical size={40} className="mb-2 opacity-20"/><p className="text-sm font-medium">Belum ada sampel</p></div>} </div> <div className="p-4 bg-white border-t border-slate-200"><button onClick={handleCheckout} disabled={cart.length===0} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:shadow-none tracking-wider text-sm flex items-center justify-center gap-2 transition-all">{loading ? 'MEMPROSES...' : <><FileCheck size={18}/> KIRIM PERMINTAAN</>}</button></div> </div> </div> )}
            {view === 'history' || view === 'admin_requests' ? ( <div className="max-w-6xl mx-auto animate-fade-in"> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6"> <div className="flex flex-col lg:flex-row justify-between items-center gap-4"> <h2 className="text-2xl font-bold text-slate-800 tracking-tight whitespace-nowrap">{view === 'history' ? 'Riwayat Permintaan' : 'Daftar Permintaan'}</h2> <div className="flex flex-col md:flex-row gap-2 w-full lg:w-auto"> <div className="relative flex-1 min-w-[200px]"><input type="text" placeholder="Cari tiket/nama..." className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:border-red-600 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /></div> <div className="flex gap-2"><div className="relative"><input type="date" className={`pl-3 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-red-600 outline-none w-36 transition-colors ${dateFilter.start ? 'text-slate-700 font-bold' : 'text-slate-400'}`} value={dateFilter.start} onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})} title="Dari Tanggal" /></div><span className="self-center text-slate-400 font-bold">-</span><div className="relative"><input type="date" className={`pl-3 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-red-600 outline-none w-36 transition-colors ${dateFilter.end ? 'text-slate-700 font-bold' : 'text-slate-400'}`} value={dateFilter.end} onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})} title="Sampai Tanggal" /></div></div> <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm whitespace-nowrap"><FileSpreadsheet size={18}/> Excel</button> <button onClick={fetchTableRequests} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg border border-slate-200"><RefreshCw size={18}/></button> </div> </div> </div> <div className="space-y-6"> 
            {isDataLoading ? (
                <> <RequestSkeleton/><RequestSkeleton/><RequestSkeleton/> </>
            ) : filteredRequests.length === 0 ? (<div className="text-center py-10 text-slate-400"><Search size={48} className="mx-auto mb-2 opacity-20"/><p>Tidak ditemukan data yang cocok.</p></div>) : filteredRequests.map(req => ( <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all"> <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4"> <div className="flex-1"><div className="flex items-center gap-3 mb-2"><span className="font-mono font-extrabold text-red-700 text-xl tracking-tight">{req.ticket_number}</span>{(session.role === 'admin' || session.role === 'analyst') && (<select value={req.status} onChange={(e) => updateStatus(req.id, e.target.value)} className="text-xs font-bold border-2 border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:border-red-500 cursor-pointer"><option>Permintaan Terkirim</option><option>Diterima Lab</option><option>Diproses</option><option>Selesai</option><option>Dibatalkan</option></select>)}</div><StatusTracker status={req.status} /><div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500 font-medium"><span>📅 {new Date(req.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span><span>👤 {req.creator?.full_name}</span></div></div> <div className="flex items-center gap-3 flex-wrap justify-end"> {(session.role === 'user' || session.role === 'admin') && <button onClick={() => handleReorder(req)} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm" title="Ajukan Lagi"><RefreshCw size={14}/> Ajukan Lagi</button>} {(session.role === 'admin' || session.role === 'manager' || session.role === 'analyst') && (<label className={`flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700 shadow-sm cursor-pointer transition-all ${uploadingId === req.id ? 'opacity-50 pointer-events-none' : ''}`}>{uploadingId === req.id ? <span className="animate-pulse font-bold">Mengupload...</span> : <><Upload size={16}/> {req.result_pdf_url ? 'Revisi PDF' : 'Upload Hasil'}</>}<input type="file" accept="application/pdf" className="hidden" onChange={(e) => uploadResult(e, req.id)} /></label>)} {(session.role === 'manager' && req.result_pdf_url && !req.validated_by) && (<div className="flex gap-2"><a href={req.result_pdf_url} target="_blank" className="flex items-center gap-2 bg-cyan-100 text-cyan-800 px-4 py-2 rounded-lg text-xs font-bold hover:bg-cyan-200 shadow-sm transition-all"><Eye size={16}/> Periksa</a><button onClick={() => handleValidate(req.id)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 shadow-sm transition-all animate-pulse border-b-2 border-orange-700"><ShieldCheck size={16}/> Validasi (ACC)</button></div>)} {isFullSelfService(req.samples) ? (<span className="text-xs font-bold text-amber-700 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 flex items-center gap-2"><CheckCircle size={14}/> Selesai (Mandiri)</span>) : (req.result_pdf_url ? ((req.validated_by || session.role !== 'user') ? (<a href={req.result_pdf_url} target="_blank" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-500 shadow-sm transition-all border-b-2 border-green-800"><FileCheck size={16}/> {req.validated_by ? 'Download Laporan' : 'Draft Laporan'}</a>) : (<span className="text-xs text-orange-600 font-bold bg-orange-50 px-4 py-2 rounded-lg flex items-center gap-2 border border-orange-100"><Lock size={14}/> Menunggu Validasi Manager</span>)) : (req.status !== 'Dibatalkan' && <span className="text-xs text-slate-400 font-bold italic bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-2"><Activity size={14} className="animate-spin opacity-50"/> Proses di Lab...</span>))} {(req.status === 'Permintaan Terkirim' || session.role === 'admin') && (<button onClick={() => handleDeleteRequest(req.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border-2 border-slate-200 hover:border-red-200 rounded-lg transition-all" title="Hapus Permintaan"><Trash2 size={16}/></button>)} </div> </div> <div className="p-0 overflow-x-auto"> <table className="w-full text-sm min-w-[600px]"> <thead><tr className="text-left text-xs font-bold text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100"><th className="py-3 px-5">Material / Sampel</th><th className="py-3 px-2">Parameter Uji</th><th className="py-3 px-2">Metode / Keterangan</th><th className="py-3 px-5 text-right">Tipe Layanan</th></tr></thead> <tbody className="divide-y divide-slate-100"> {(req.samples || []).map(s => ( <tr key={s.id} className="hover:bg-slate-50/50 transition-colors"> <td className="py-4 px-5 font-bold text-slate-800"> {s.specific_name || s.material_type} {s.description && (<div className="text-[10px] text-slate-500 font-medium italic mt-1 flex items-center gap-1"><MessageSquare size={10}/> {s.description}</div>)} </td> <td className="py-4 px-2 text-slate-600 font-medium text-xs">{s.parameters.join(', ')}</td> <td className="py-4 px-2 text-xs font-bold">{s.oxide_method ? <span className="text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100">{s.oxide_method}</span> : '-'}</td> <td className="py-4 px-5 text-right">{s.is_self_service ? <span className="text-[10px] uppercase font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100">Mandiri</span> : <span className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">Full Service</span>}</td> </tr> ))} </tbody> </table> </div> </div> ))} </div> </div> ) : null}
            {view === 'admin_config' && ( <div className="max-w-5xl mx-auto animate-fade-in"> <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-200 pb-4"> <h2 className="text-2xl font-bold text-slate-800">Konfigurasi Sistem</h2> 
            
            {/* TAB NAVIGATION: HIDE MATERIAL TAB FOR MANAGER */}
            <div className="flex gap-2 mt-4 md:mt-0 bg-slate-100 p-1 rounded-lg"> 
                <button onClick={() => setConfigTab('users')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${configTab === 'users' ? 'bg-white shadow text-red-700' : 'text-slate-500 hover:text-slate-700'}`}><Users size={16}/> Pengguna</button> 
                {session.role !== 'manager' && <button onClick={() => setConfigTab('materials')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${configTab === 'materials' ? 'bg-white shadow text-red-700' : 'text-slate-500 hover:text-slate-700'}`}><FlaskConical size={16}/> Material & Parameter</button>}
                {/* NEW TAB: LOGS */}
                {session.role !== 'user' && <button onClick={() => setConfigTab('logs')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${configTab === 'logs' ? 'bg-white shadow text-red-700' : 'text-slate-500 hover:text-slate-700'}`}><BellRing size={16}/> Log Aktivitas</button>}
            </div> </div> 
            
            {configTab === 'users' && ( <div className="grid md:grid-cols-3 gap-8 animate-fade-in"> 
            
            {/* HIDE ADD USER FORM FOR MANAGER */}
            {session.role !== 'manager' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit sticky top-8 md:col-span-1 col-span-3"> <div className="p-6 flex justify-between items-center cursor-pointer md:cursor-default bg-slate-50 md:bg-white border-b md:border-b-0 border-slate-100" onClick={() => window.innerWidth < 768 && setIsUserFormOpen(!isUserFormOpen)}> <h3 className="font-bold text-sm uppercase text-slate-700 tracking-wider flex items-center gap-2">{isEditingUser ? 'Edit Data User' : 'Tambah User Baru'}<span className="md:hidden text-red-600">{isUserFormOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span></h3>{isEditingUser && <button onClick={(e) => { e.stopPropagation(); resetUserForm(); }} className="text-[10px] text-red-500 font-bold hover:underline">BATAL</button>} </div> <div className={`p-6 pt-0 space-y-4 ${isUserFormOpen ? 'block' : 'hidden md:block'}`}> <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Username / Email</label><input className="w-full border-2 rounded-lg p-3 text-sm font-medium focus:border-red-700 outline-none bg-slate-50 focus:bg-white transition-all" placeholder="Contoh: budi@qcst" value={userForm.username} onChange={e=>setUserForm({...userForm, username: e.target.value})} disabled={isEditingUser} /></div> <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Password</label><input className="w-full border-2 rounded-lg p-3 text-sm font-medium focus:border-red-700 outline-none bg-slate-50 focus:bg-white transition-all" placeholder={isEditingUser ? "(Kosongkan jika tidak ubah)" : "Password..."} value={userForm.password} onChange={e=>setUserForm({...userForm, password: e.target.value})} /></div> <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nama Lengkap / Jabatan</label><input className="w-full border-2 rounded-lg p-3 text-sm font-medium focus:border-red-700 outline-none bg-slate-50 focus:bg-white transition-all" placeholder="Nama Lengkap..." value={userForm.full_name} onChange={e=>setUserForm({...userForm, full_name: e.target.value})} /></div> <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role (Hak Akses)</label><select className="w-full border-2 rounded-lg p-3 text-sm font-bold focus:border-red-700 outline-none bg-slate-50 focus:bg-white transition-all" value={userForm.role} onChange={e=>setUserForm({...userForm, role: e.target.value})}><option value="user">USER (Hanya Request)</option><option value="admin">ADMIN (Upload & Kelola)</option><option value="manager">MANAGER (Validasi)</option><option value="analyst">ANALYST (Analisa Lab)</option></select></div> <button onClick={handleSaveUser} className={`w-full text-white py-4 rounded-xl font-bold text-sm tracking-wider shadow-md hover:shadow-lg transition-all mt-4 ${isEditingUser ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-800 hover:bg-red-700'}`}>{isEditingUser ? 'UPDATE DATA USER' : 'SIMPAN USER BARU'}</button> </div> </div> 
            )}

            <div className={`${session.role === 'manager' ? 'col-span-3' : 'md:col-span-2 col-span-3'} bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200`}> <div className="overflow-x-auto"> <table className="w-full text-sm text-left min-w-[600px]"> <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4 text-xs font-bold text-slate-500 uppercase">Nama Lengkap</th><th className="p-4 text-xs font-bold text-slate-500 uppercase">Username</th><th className="p-4 text-xs font-bold text-slate-500 uppercase">Role</th><th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th></tr></thead> <tbody className="divide-y divide-slate-100">{usersList.map(u=>(<tr key={u.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-4 font-bold text-slate-800">{u.full_name}</td><td className="p-4 text-slate-600 font-medium">{u.username}</td><td className="p-4"><RoleBadge role={u.role} /></td><td className="p-4 text-right flex justify-end gap-2"><button onClick={()=>openUserStats(u)} className="p-2 text-purple-600 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 rounded-lg transition-all" title="Lihat Statistik User"><BarChart2 size={14}/></button>
            {/* HIDE EDIT/DELETE FOR MANAGER */}
            {session.role !== 'manager' && (
                <>
                <button onClick={()=>prepareEditUser(u)} className="p-2 text-slate-600 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-lg transition-all"><Edit size={14}/></button><button onClick={()=>handleDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 border-2 border-red-100 hover:border-red-200 rounded-lg transition-all"><Trash2 size={14}/></button>
                </>
            )}
            </td></tr>))}</tbody> </table> </div> </div> </div> )} 
            
            {configTab === 'materials' && ( <div className="space-y-8 animate-fade-in"> <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r-lg"> <p className="text-sm text-blue-800 flex items-center gap-2"><Info size={16}/> <strong>Info Admin:</strong> Urutan material DAN parameter bisa diubah dengan Drag & Drop.</p> </div> <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center"> <div className="flex-1 w-full"> <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tambah Jenis Material Baru</label> <input type="text" placeholder="Nama Material (Misal: Batubara)" className="w-full p-3 border-2 border-slate-200 rounded-lg font-bold focus:border-red-600 outline-none" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} /> </div> <button onClick={handleAddMaterial} className="w-full md:w-auto mt-6 bg-slate-800 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-slate-700 transition-all flex items-center justify-center gap-2"><PlusCircle size={18}/> TAMBAH MATERIAL</button> </div> <div className="grid md:grid-cols-2 gap-6"> 
            {/* MAP MATERIAL ORDER UNTUK DND VISUAL */}
            {materialOrder.map((materialName, index) => ( 
                <div 
                    key={materialName} 
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-move hover:shadow-md transition-shadow relative"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                > 
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center"> 
                        <h4 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                            <GripVertical size={20} className="text-slate-400 cursor-grab active:cursor-grabbing"/>
                            <FlaskConical size={18} className="text-red-600"/> {materialName}
                        </h4> 
                        <button onClick={() => handleDeleteMaterial(materialName)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Material"><Trash2 size={18}/></button> 
                    </div> 
                    <div className="p-4"> 
                        <div className="flex flex-wrap gap-2 mb-4"> 
                            {materialsConfig[materialName]?.length === 0 && <span className="text-slate-400 text-xs italic">Belum ada parameter.</span>} 
                            
                            {/* MAP PARAMETER UNTUK DND VISUAL */}
                            {materialsConfig[materialName]?.map((param, pIndex) => ( 
                                <span 
                                    key={param} 
                                    draggable
                                    onDragStart={(e) => handleParamDragStart(e, materialName, pIndex)}
                                    onDragEnter={(e) => handleParamDragEnter(e, materialName, pIndex)}
                                    onDragEnd={(e) => handleParamDragEnd(e, materialName)}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 flex items-center gap-2 group hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all cursor-grab active:cursor-grabbing"
                                > 
                                    {param} 
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteParameter(materialName, param); }} 
                                        className="opacity-50 group-hover:opacity-100 hover:text-red-600"
                                    ><X size={12}/></button> 
                                </span> 
                            ))} 
                        </div> 
                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100"> <input type="text" placeholder="Tambah Parameter..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" value={newParamInput[materialName] || ''} onChange={(e) => setNewParamInput({ ...newParamInput, [materialName]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddParameter(materialName)} /> <button onClick={() => handleAddParameter(materialName)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-sm"><Plus size={16}/></button> </div> 
                    </div> 
                </div> 
            ))} 
            </div> </div> )} 
            
            {/* NEW TAB CONTENT: LOGS */}
            {configTab === 'logs' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="text-blue-600"/> Riwayat Aktivitas Sistem</h3>
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">100 Terakhir</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                                <tr>
                                    <th className="p-4 font-bold uppercase text-xs">Waktu</th>
                                    <th className="p-4 font-bold uppercase text-xs">User / Role</th>
                                    <th className="p-4 font-bold uppercase text-xs">Aktivitas</th>
                                    <th className="p-4 font-bold uppercase text-xs">Detail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {auditLogs.length === 0 ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">Belum ada aktivitas tercatat.</td></tr>
                                ) : auditLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-700">{log.actor_name}</p>
                                            <RoleBadge role={log.role} />
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border
                                                ${log.action.includes('DELETE') ? 'bg-red-50 text-red-700 border-red-100' : 
                                                  log.action.includes('UPDATE') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                  log.action.includes('CREATE') || log.action.includes('ADD') ? 'bg-green-50 text-green-700 border-green-100' :
                                                  'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600 max-w-xs truncate" title={log.details}>
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            </div> )}

          </div> 
        </main>
      </div>
    </div>
  );
}

const StatusTracker = ({ status }) => {
  if (status === 'Dibatalkan') return <div className="mt-2 mb-6 inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-xs font-bold border border-red-200 shadow-sm"><XSquare size={16}/> Permintaan Dibatalkan</div>;
  const steps = [ { label: 'Terkirim', icon: <Send size={14} />, fullLabel: 'Permintaan Terkirim' }, { label: 'Diterima', icon: <Inbox size={14} />, fullLabel: 'Diterima Lab' }, { label: 'Diproses', icon: <FlaskConical size={14} />, fullLabel: 'Diproses' }, { label: 'Selesai', icon: <CheckCircle size={14} />, fullLabel: 'Selesai' } ];
  const currentIdx = steps.findIndex(s => s.fullLabel === status);
  const isMoving = status !== 'Selesai' && status !== 'Dibatalkan';
  return (
    <div className="w-full max-w-lg mt-5 mb-10 px-4">
      <div className="relative flex items-center justify-between">
        <div className="absolute top-1/2 left-5 right-5 h-1 -translate-y-1/2 z-0">
            <div className={`absolute inset-0 bg-slate-100 rounded-full ${isMoving ? 'hidden' : ''}`} />
            <div className={`absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all duration-500 ease-out ${isMoving ? 'animate-progress-stripes' : ''}`} style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }} />
        </div>
        {steps.map((step, i) => {
          const isCompleted = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={i} className="relative flex flex-col items-center group z-20"> 
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white ${isCompleted ? 'border-green-500 text-green-600 shadow-md scale-100' : 'border-slate-200 text-slate-300'} ${isCurrent ? 'ring-4 ring-green-100 scale-110' : ''} `}>{step.icon}</div>
              <div className={`absolute -bottom-8 w-24 text-center left-1/2 -translate-x-1/2 transition-all duration-300 ${isCompleted ? 'opacity-100' : 'opacity-50 grayscale'}`}><p className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-green-700' : 'text-slate-500'}`}>{step.label}</p></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick, collapsed }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all mb-1 font-bold text-sm tracking-wide ${active ? 'bg-red-800 text-white shadow-md border-l-4 border-white' : 'text-red-200 hover:bg-red-950/50 hover:text-white border-l-4 border-transparent'} ${collapsed ? 'justify-center px-2' : ''}`} title={collapsed ? label : ''}>
        {React.cloneElement(icon, { size: 18, className: active ? 'text-white' : '' })} {!collapsed && <span className="animate-fade-in">{label}</span>}
    </button>
);
const StatCard = ({ label, value, color }) => { const c = { red: "bg-red-50 border-red-200 text-red-900", yellow: "bg-amber-50 border-amber-200 text-amber-900", green: "bg-green-50 border-green-200 text-green-900", blue: "bg-blue-50 border-blue-200 text-blue-900", purple: "bg-purple-50 border-purple-200 text-purple-900" }; return <div className={`p-5 rounded-xl border-2 ${c[color]} flex flex-col items-center justify-center hover:shadow-md transition-all group`}><span className="text-3xl font-extrabold group-hover:scale-110 transition-transform">{value}</span><span className="text-[10px] font-bold uppercase opacity-70 tracking-wider mt-1">{label}</span></div>; };
const RoleBadge = ({ role }) => { 
    const r = { 
        admin: 'bg-purple-100 text-purple-800 border-purple-200', 
        manager: 'bg-orange-100 text-orange-800 border-orange-200', 
        user: 'bg-slate-100 text-slate-700 border-slate-200',
        analyst: 'bg-teal-100 text-teal-800 border-teal-200' 
    }; 
    return <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${r[role] || r['user']}`}>{role}</span>; 
}
const ToastContainer = ({ toasts, removeToast }) => { return (<div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">{toasts.map((toast) => (<div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border-l-4 animate-slide-in min-w-[300px] text-sm font-bold bg-white ${toast.type === 'success' ? 'border-green-500 text-green-800' : toast.type === 'error' ? 'border-red-500 text-red-800' : 'border-blue-500 text-blue-800'}`}>{toast.type === 'success' ? <CheckCircle size={18} className="text-green-500"/> : toast.type === 'error' ? <XSquare size={18} className="text-red-500"/> : <Info size={18} className="text-blue-500"/>}<span className="flex-1">{toast.message}</span><button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100"><X size={14}/></button></div>))}</div>); };