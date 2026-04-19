import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, update, remove } from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import './index.css';

const ArsipTab = ({ currentUser }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadForm, setUploadForm] = useState({ 
    dataName: '', 
    type: '', 
    date: new Date().toISOString().split('T')[0], 
    file: null 
  });

  useEffect(() => {
    const archiveRef = ref(db, `user_archives/${currentUser.id}`);
    const unsubscribe = onValue(archiveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setFiles(Object.entries(data).map(([key, val]) => ({ ...val, fbKey: key })));
      } else {
        setFiles([]);
      }
    });
    return () => unsubscribe();
  }, [currentUser.id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 1 * 1024 * 1024) {
      alert("⚠️ MODE GRATIS: Ukuran file maksimal 1MB (1.024 KB). Mohon gunakan screenshot atau kecilkan ukuran gambar.");
      return;
    }
    setUploadForm({ ...uploadForm, file });
  };

  const submitUpload = async () => {
    if (!uploadForm.dataName || !uploadForm.type || !uploadForm.date || !uploadForm.file) {
      alert("Mohon lengkapi seluruh data dan pilih file");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(uploadForm.file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const archiveRef = ref(db, `user_archives/${currentUser.id}`);
        await push(archiveRef, {
          dataName: uploadForm.dataName,
          type: uploadForm.type,
          transactionDate: uploadForm.date,
          url: base64Data, // Save directly to RTDB (FREE)
          timestamp: Date.now(),
          uploaddate: new Date().toLocaleString('id-ID')
        });

        setUploading(false);
        setShowUploadModal(false);
        setUploadForm({ dataName: '', type: '', date: new Date().toISOString().split('T')[0], file: null });
        alert("Arsip berhasil disimpan secara gratis ke database!");
      } catch (err) {
        alert("Gagal menyimpan data ke database.");
        setUploading(false);
      }
    };
    reader.onerror = () => {
      alert("Gagal membaca file gambar.");
      setUploading(false);
    };
  };

  const handleEdit = async () => {
     if (!editingItem.dataName || !editingItem.type || !editingItem.transactionDate) return;
     await update(ref(db, `user_archives/${currentUser.id}/${editingItem.fbKey}`), {
       dataName: editingItem.dataName,
       type: editingItem.type,
       transactionDate: editingItem.transactionDate
     });
     setEditingItem(null);
     alert("Data berhasil diperbarui");
  };

  const deleteFile = async (item) => {
    if (window.confirm("Hapus arsip ini?")) {
      try {
        await remove(ref(db, `user_archives/${currentUser.id}/${item.fbKey}`));
      } catch (err) { alert("Gagal menghapus"); }
    }
  };

  return (
    <div className="card">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowUploadModal(true)} className="btn btn-primary" style={{ padding: '12px 24px' }}>
          ＋ Tambah Arsip Baru
        </button>
        <div style={{ color: '#059669', fontSize: 12, background: '#f0fdf4', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
          ⚡ Mode Database Aktif (Gratis)
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <h2 style={{ marginBottom: 20 }}>Upload Arsip (Gratis)</h2>
            <div className="form-group">
              <label>Data Transaksi</label>
              <input type="text" value={uploadForm.dataName} onChange={e => setUploadForm({...uploadForm, dataName: e.target.value})} placeholder="Nama transaksi/arsip" />
            </div>
            <div className="form-group">
              <label>Jenis Transaksi</label>
              <input type="text" value={uploadForm.type} onChange={e => setUploadForm({...uploadForm, type: e.target.value})} placeholder="Pemasukan / Pengeluaran / dll" />
            </div>
            <div className="form-group">
              <label>Tanggal Transaksi</label>
              <input type="date" value={uploadForm.date} onChange={e => setUploadForm({...uploadForm, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Pilih File (Gambar, Maks 1MB)</label>
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Tips: Gunakan screenshot atau kompres file jika terlalu besar.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button disabled={uploading} onClick={submitUpload} className="btn btn-primary" style={{ flex: 1 }}>{uploading ? 'Menyimpan...' : 'Simpan Arsip'}</button>
              <button disabled={uploading} onClick={() => setShowUploadModal(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingItem && (
        <div className="modal-overlay" onClick={() => setViewingItem(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 700, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
               <h2>Detail Arsip</h2>
               <button onClick={() => setViewingItem(null)} style={{ background: 'none', fontSize: 20 }}>✕</button>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, textAlign: 'left' }}>
               <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Data Transaksi</p>
                  <p style={{ fontWeight: 700 }}>{viewingItem.dataName}</p>
               </div>
               <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jenis Transaksi</p>
                  <p style={{ fontWeight: 700 }}>{viewingItem.type}</p>
               </div>
               <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tanggal Transaksi</p>
                  <p style={{ fontWeight: 700 }}>{viewingItem.transactionDate}</p>
               </div>
               <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Waktu Upload</p>
                  <p style={{ fontWeight: 700 }}>{viewingItem.uploaddate}</p>
               </div>
            </div>
            <div style={{ border: '2px dashed #ddd', borderRadius: 12, overflow: 'hidden', textAlign: 'center', background: '#f8fafc' }}>
               <img src={viewingItem.url} style={{ maxWidth: '100%', maxHeight: '50vh' }} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <h2 style={{ marginBottom: 20 }}>Edit Data Arsip</h2>
            <div className="form-group">
              <label>Data Transaksi</label>
              <input type="text" value={editingItem.dataName} onChange={e => setEditingItem({...editingItem, dataName: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Jenis Transaksi</label>
              <input type="text" value={editingItem.type} onChange={e => setEditingItem({...editingItem, type: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Tanggal Transaksi</label>
              <input type="date" value={editingItem.transactionDate} onChange={e => setEditingItem({...editingItem, transactionDate: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={handleEdit} className="btn btn-primary" style={{ flex: 1 }}>Simpan Perubahan</button>
              <button onClick={() => setEditingItem(null)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {files.length === 0 ? (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Belum ada arsip.</p>
        ) : (
          files.sort((a,b) => b.timestamp - a.timestamp).map(item => (
            <div key={item.fbKey} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 160, overflow: 'hidden', background: '#f8fafc', cursor: 'zoom-in' }} onClick={() => setViewingItem(item)}>
                 <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: 16 }}>
                 <h4 style={{ fontSize: 15, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.dataName}</h4>
                 <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{item.type} • {item.transactionDate}</p>
                 <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setViewingItem(item)} className="btn" style={{ flex: 1, fontSize: 12, padding: '6px', background: '#f1f5f9' }}>Lihat</button>
                    <button onClick={() => setEditingItem(item)} className="btn" style={{ flex: 1, fontSize: 12, padding: '6px', background: '#f1f5f9' }}>Edit</button>
                    <button onClick={() => deleteFile(item)} className="btn" style={{ flex: 1, fontSize: 12, padding: '6px', background: '#fee2e2', color: '#ef4444' }}>Hapus</button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Auth Helpers ---
const getDeviceId = () => {
  let id = localStorage.getItem('pasarku_device_id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    localStorage.setItem('pasarku_device_id', id);
  }
  return id;
};

// --- Auth Components ---

const AuthPage = ({ users, setUsers, setCurrentUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', name: '' });
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const userList = Object.values(users || {});
      const user = userList.find(u => u.username === formData.username && u.password === formData.password);
      if (!user) {
        setError('Username atau Katasandi salah');
      } else if (!user.active) {
        setError('Akun Anda belum aktif. Mohon hubungi ADMIN.');
      } else {
        const currentDeviceId = getDeviceId();
        
        // --- 1 Device 1 Account Logic ---
        if (user.role !== 'ADMIN' && user.deviceId && user.deviceId !== currentDeviceId) {
           setError('⚠️ Akun ini sudah terkunci di perangkat lain. Mohon hubungi ADMIN untuk reset.');
           return;
        }

        // Lock to current device if not already set
        if (!user.deviceId) {
           update(ref(db, `users/${user.id}`), { deviceId: currentDeviceId });
        }
        
        setCurrentUser(user);
        localStorage.setItem('pasarku_current_user', JSON.stringify(user));
      }
    } else {
      const userList = Object.values(users || {});
      if (userList.find(u => u.username === formData.username)) {
        setError('Username sudah digunakan');
        return;
      }
      const newUser = {
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: 'PETUGAS',
        active: false
      };
      
      try {
        const usersRef = ref(db, 'users');
        const newUserRef = push(usersRef);
        await set(newUserRef, { ...newUser, id: newUserRef.key });
        alert('Pendaftaran berhasil! Silakan tunggu aktivasi dari ADMIN.');
        setIsLogin(true);
      } catch (err) {
        setError('Gagal mendaftar. Coba lagi.');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="logo-icon" style={{ width: 64, height: 64, margin: '0 auto 16px', fontSize: 32 }}>P</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{isLogin ? 'Selamat Datang' : 'Daftar Akun'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>PASAR<span>KU</span> | Belanja Mudah & Cepat</p>
        </div>

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nama Anda" />
            </div>
          )}
          <div className="form-group">
            <label>Username</label>
            <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Username" />
          </div>
          <div className="form-group">
            <label>Katasandi</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="********" />
          </div>
          
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 16 }}>
            {isLogin ? 'Masuk Sekarang' : 'Daftar Sekarang'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
          {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'} {' '}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            style={{ color: 'var(--primary)', fontWeight: 600, background: 'none' }}
          >
            {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Application Layout Components ---

const Sidebar = ({ activeTab, setActiveTab, currentUser, onLogout, isOpen, onClose }) => {
  const handleNavClick = (tab) => {
    setActiveTab(tab);
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose}></div>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div>
          <div className="logo" style={{ marginBottom: 32 }}>
            <div className="logo-icon">P</div>
            PASAR<span>KU</span>
          </div>
          <div className="nav-links">
            {(currentUser.role === 'ADMIN' || currentUser.role === 'VERIFIKATOR PAYMENT') && (
              <button 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                <span>📊</span> Ringkasan
              </button>
            )}

            <button 
              className={`nav-item ${activeTab === 'pembayaran' ? 'active' : ''}`}
              onClick={() => handleNavClick('pembayaran')}
            >
              <span>🌐</span> PPOB & Tagihan
            </button>

            <button 
              className={`nav-item ${activeTab === 'harian' ? 'active' : ''}`}
              onClick={() => handleNavClick('harian')}
            >
              <span>🛒</span> Transaksi Harian
            </button>

            {(currentUser.role === 'ADMIN' || currentUser.role === 'VERIFIKATOR PAYMENT') && (
              <button 
                className={`nav-item ${activeTab === 'verifikasi' ? 'active' : ''}`}
                onClick={() => handleNavClick('verifikasi')}
              >
                <span>✔️</span> Verifikasi Pembayaran
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
              <button 
                className={`nav-item ${activeTab === 'pengaturan' ? 'active' : ''}`}
                onClick={() => handleNavClick('pengaturan')}
              >
                <span>⚙️</span> Pengaturan
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
              <button 
                className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => handleNavClick('users')}
              >
                <span>👥</span> Manajemen User
              </button>
            )}

            {(currentUser.role === 'ADMIN' || currentUser.role === 'VERIFIKATOR PAYMENT') && (
              <button 
                className={`nav-item ${activeTab === 'riwayat' ? 'active' : ''}`}
                onClick={() => handleNavClick('riwayat')}
              >
                <span>📜</span> Riwayat Transaksi
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
              <button 
                className={`nav-item ${activeTab === 'arsip' ? 'active' : ''}`}
                onClick={() => handleNavClick('arsip')}
              >
                <span>📂</span> Data Transaksi
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
              <button 
                className={`nav-item ${activeTab === 'bpjstk' ? 'active' : ''}`}
                onClick={() => handleNavClick('bpjstk')}
              >
                <span>🏢</span> BPJS TK Business
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
              <button 
                className={`nav-item ${activeTab === 'bpjstk_settings' ? 'active' : ''}`}
                onClick={() => handleNavClick('bpjstk_settings')}
              >
                <span>🛠️</span> Paket BPJS TK
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>{currentUser.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentUser.role}</p>
          </div>
          <button onClick={onLogout} className="nav-item" style={{ width: '100%', background: '#fee2e2', color: '#991b1b' }}>
            <span>🚪</span> Keluar
          </button>
        </div>
      </div>
    </>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('pembayaran');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    // Safety check: if user is not admin but on 'arsip' tab, redirect to 'pembayaran'
    if (currentUser?.role !== 'ADMIN' && activeTab === 'arsip') {
      setActiveTab('pembayaran');
    }
  }, [currentUser, activeTab]);
  
  const [users, setUsers] = useState({});
  const [storeInfo, setStoreInfo] = useState({
    name: "PASARKU",
    address: "Jl. Merdeka No. 123, Jakarta",
    bankAccount: "BANK BNI - 1234567890",
    footer: "Terima kasih telah belanja di PASARKU!"
  });
  const [products, setProducts] = useState({});
  const [bpjstkPackages, setBPJSTKPackages] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // 1. Sync Users
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(data);
      } else {
        // Initial Admin Seed if DB is empty
        const adminId = 'admin';
        set(ref(db, 'users/' + adminId), {
          id: adminId,
          name: "Administrator",
          username: 'admin',
          password: 'admin123',
          role: 'ADMIN',
          active: true
        });
      }
    });

    // 2. Sync Store Info
    const storeRef = ref(db, 'storeInfo');
    onValue(storeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setStoreInfo(data);
      else set(storeRef, storeInfo); // Seed default
    });

    // 3. Sync Products
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProducts(data);
      } else {
        setProducts({});
      }
    });

    // 4. Sync Transactions
    const transRef = ref(db, 'transactions');
    onValue(transRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const transList = Object.entries(data).map(([key, val]) => ({
          ...val,
          fbKey: key
        }));
        setTransactions(transList);
      } else {
        setTransactions([]);
      }
    });

    // 5. Sync BPJS TK Packages
    const bRef = ref(db, 'bpjstk_packages');
    onValue(bRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setBPJSTKPackages(Object.entries(data).map(([key, val]) => ({ ...val, fbKey: key })));
      } else {
        setBPJSTKPackages([]);
      }
    });

    // 6. Auth Session
    const savedSession = localStorage.getItem('pasarku_current_user');
    if (savedSession) {
      const user = JSON.parse(savedSession);
      // Validate device lock in real-time
      const userRef = ref(db, `users/${user.id}`);
      onValue(userRef, (snapshot) => {
        const dbUser = snapshot.val();
        if (!dbUser || !dbUser.active || (dbUser.role !== 'ADMIN' && dbUser.deviceId && dbUser.deviceId !== getDeviceId())) {
           handleLogout();
        } else {
           setCurrentUser(dbUser);
        }
      });
    }
    
    setIsInitialized(true);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pasarku_current_user');
    setActiveTab('pembayaran');
  };

  if (!isInitialized) return null;

  if (!currentUser) {
    return <AuthPage users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} />;
  }

  return (
    <div className="app-container">
      <header className="mobile-header">
        <div className="logo">
           <div className="logo-icon" style={{ width: 28, height: 28, fontSize: 14 }}>P</div>
           PASAR<span>KU</span>
        </div>
        <button className="hamburger" onClick={() => setIsSidebarOpen(true)}>☰</button>
      </header>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="main-content">
        {activeTab === 'dashboard' && (currentUser.role === 'ADMIN' || currentUser.role === 'VERIFIKATOR PAYMENT') && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Ringkasan Dashboard</h1>
              <p className="page-subtitle">Ringkasan performa penjualan PASARKU</p>
            </header>
            <DashboardTab transactions={transactions} users={Object.values(users || {})} />
          </div>
        )}
        
        {activeTab === 'pembayaran' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">PPOB & Tagihan</h1>
              <p className="page-subtitle">Pilih layanan dan lakukan transaksi</p>
            </header>
            <PaymentTab products={Object.values(products || {})} storeInfo={storeInfo} />
          </div>
        )}

        {activeTab === 'harian' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Transaksi Harian</h1>
              <p className="page-subtitle">Penjualan kebutuhan pokok & barang harian</p>
            </header>
            <DailyTransactionTab products={Object.values(products || {})} storeInfo={storeInfo} />
          </div>
        )}
        
        {activeTab === 'pengaturan' && currentUser.role === 'ADMIN' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Pengaturan</h1>
              <p className="page-subtitle">Kelola produk dan profil kedai</p>
            </header>
            <SettingsTab 
              products={Object.values(products || {})}
              storeInfo={storeInfo}
            />
          </div>
        )}

        {activeTab === 'users' && currentUser.role === 'ADMIN' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Manajemen User</h1>
              <p className="page-subtitle">Aktifkan dan kelola akun petugas</p>
            </header>
            <UserManagementTab users={Object.values(users || {})} />
          </div>
        )}
        {activeTab === 'riwayat' && (currentUser.role === 'ADMIN' || currentUser.role === 'VERIFIKATOR PAYMENT') && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Riwayat Transaksi</h1>
              <p className="page-subtitle">Daftar seluruh transaksi yang telah lunas</p>
            </header>
            <TransactionHistoryTab transactions={transactions} />
          </div>
        )}

        {activeTab === 'verifikasi' && (currentUser.role === 'ADMIN' || currentUser.role === 'VERIFIKATOR PAYMENT') && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Verifikasi Pembayaran</h1>
              <p className="page-subtitle">Verifikasi transaksi pending dan masukkan no. referensi</p>
            </header>
            <VerificationTab transactions={transactions} />
          </div>
        )}

        {activeTab === 'bpjstk' && currentUser.role === 'ADMIN' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">BPJS TK Business</h1>
              <p className="page-subtitle">Pembayaran Iuran BPJS Ketenagakerjaan Perusahaan</p>
            </header>
            <BPJSTKTab packages={bpjstkPackages || []} storeInfo={storeInfo} />
          </div>
        )}

        {activeTab === 'bpjstk_settings' && currentUser.role === 'ADMIN' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Paket BPJS TK</h1>
              <p className="page-subtitle">Kelola daftar layanan dan nominal BPJS TK</p>
            </header>
            <BPJSTKSettingsTab packages={bpjstkPackages || []} />
          </div>
        )}

        {activeTab === 'arsip' && currentUser.role === 'ADMIN' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Data Transaksi (Arsip)</h1>
              <p className="page-subtitle">Upload dan simpan bukti transaksi pribadi Anda</p>
            </header>
            <ArsipTab currentUser={currentUser} />
          </div>
        )}
      </main>
    </div>
  );
}

// --- Specific Tabs Components ---
const ADMIN_FEE = 2500;

const DashboardTab = ({ transactions, users }) => {
  const totalRevenue = transactions
    .filter(t => t.status === 'LUNAS')
    .reduce((acc, t) => acc + (t.total || 0), 0);
  const totalTransactions = transactions.length;
  const activeStaff = users.filter(u => u.active).length;

  // Calculating top products
  const productSales = {};
  transactions.forEach(t => {
    productSales[t.productName] = (productSales[t.productName] || 0) + (t.quantity || 1);
  });

  const sortedProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="grid">
        <div className="card stats-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>TOTAL PENDAPATAN</p>
          <h2 style={{ fontSize: 28, color: 'var(--primary)', marginTop: 8 }}>Rp {totalRevenue.toLocaleString()}</h2>
        </div>
        <div className="card stats-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>TOTAL TRANSAKSI</p>
          <h2 style={{ fontSize: 28, color: 'var(--accent)', marginTop: 8 }}>{totalTransactions}</h2>
        </div>
        <div className="card stats-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>PETUGAS AKTIF</p>
          <h2 style={{ fontSize: 28, color: 'var(--secondary)', marginTop: 8 }}>{activeStaff}</h2>
        </div>
      </div>

      <div className="grid">
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ marginBottom: 20 }}>Produk Terlaris</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sortedProducts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Belum ada data</p>
            ) : (
              sortedProducts.map(([name, count], index) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ width: 24, height: 24, background: '#f1f5f9', borderRadius: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 12, fontWeight: 700 }}>{index+1}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
                  </div>
                  <span className="badge badge-primary">{count} Terjual</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Aktivitas Terakhir</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {transactions.slice(-5).reverse().map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.productName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t.customerName} • {t.date}</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Rp {t.total.toLocaleString()}</div>
              </div>
            ))}
            {transactions.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Belum ada transaksi</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const UserManagementTab = ({ users }) => {
  const toggleStatus = (id, currentStatus) => {
    update(ref(db, `users/${id}`), { active: !currentStatus });
  };

  const setRole = (id, role) => {
    update(ref(db, `users/${id}`), { role });
  };

  const deleteUser = (id) => {
    if (id === 'admin') return;
    if (window.confirm('Hapus user ini?')) {
      remove(ref(db, `users/${id}`));
    }
  };

  const resetDevice = (id, name) => {
    if (window.confirm(`Reset kunci perangkat untuk ${name}? Pengguna ini akan bisa login di perangkat lain.`)) {
      update(ref(db, `users/${id}`), { deviceId: null });
      alert(`Kunci perangkat untuk ${name} berhasil di-reset.`);
    }
  };

  const handleResetPassword = (id, name) => {
    const newPassword = window.prompt(`Masukkan katasandi baru untuk ${name}:`);
    if (newPassword && newPassword.trim() !== '') {
      update(ref(db, `users/${id}`), { password: newPassword });
      alert(`Katasandi ${name} berhasil diubah!`);
    }
  };

  return (
    <div className="card">
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td>
                  {u.id === 'admin' ? (
                    <span className="badge badge-primary">ADMIN</span>
                  ) : (
                    <select 
                      value={u.role} 
                      onChange={(e) => setRole(u.id, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      <option value="PETUGAS">PETUGAS</option>
                      <option value="VERIFIKATOR PAYMENT">VERIFIKATOR PAYMENT</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  )}
                </td>
                <td>
                  <span className={`badge ${u.active ? 'badge-success' : 'badge-warning'}`}>
                    {u.active ? 'AKTIF' : 'PENDING'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {u.id !== 'admin' && (
                      <button 
                        onClick={() => toggleStatus(u.id, u.active)}
                        style={{ color: u.active ? '#92400e' : '#065f46', background: 'none', fontWeight: 600, fontSize: 13 }}
                      >
                        {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    )}
                    <button 
                      onClick={() => handleResetPassword(u.id, u.name)}
                      style={{ color: 'var(--accent)', background: 'none', fontWeight: 600, fontSize: 13 }}
                    >
                      Ganti Sandi
                    </button>
                    {u.id !== 'admin' && (
                      <button 
                        onClick={() => deleteUser(u.id)}
                        style={{ color: '#ef4444', background: 'none', fontWeight: 600, fontSize: 13 }}
                      >
                        Hapus
                      </button>
                    )}
                    {u.id !== 'admin' && (
                      <button 
                         onClick={() => resetDevice(u.id, u.name)}
                         style={{ color: '#6366f1', background: 'none', fontWeight: 600, fontSize: 13 }}
                      >
                         Reset Device
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PaymentTab = ({ products, storeInfo }) => {
  const [step, setStep] = useState(1); // 1: Category, 2: Product, 3: Form
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    productId: '',
    customerId: '', // ID Pelanggan
    quantity: 1
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [noAdminFee, setNoAdminFee] = useState(false);

  const selectedProduct = products.find(p => String(p.id) === String(formData.productId));

  const categories = [
    { name: 'PLN', icon: '⚡' },
    { name: 'INTERNET', icon: '🌐' },
    { name: 'PDAM', icon: '💧' },
    { name: 'BPJS', icon: '🏥' },
    { name: 'PULSA', icon: '📱' },
    { name: 'TV VOUCHER', icon: '📺' },
    { name: 'IPTV', icon: '🎞️' },
  ];

  const handlePayment = async (e) => {
    e.preventDefault();
    
    // Validation
    const needsId = (selectedProduct?.name === 'PLN Postpaid' || ['INTERNET', 'BPJS', 'TV VOUCHER'].includes(selectedCategory));
    if (!formData.name || !formData.phone || (needsId && !formData.customerId)) {
      alert("Mohon lengkapi data transaksi");
      return;
    }

    if (selectedProduct.stock < formData.quantity) {
      alert("Stok tidak mencukupi");
      return;
    }
    
    const currentAdminFee = (selectedCategory === 'PULSA' || noAdminFee) ? 0 : ADMIN_FEE;
    const subtotal = selectedProduct.price * formData.quantity;
    
    // BPJS Ketenagakerjaan Discount Logic
    let discountPercentage = 0;
    const isBPJSKetenagakerjaan = selectedProduct?.name?.toUpperCase().includes("BPJS KETENAGAKERJAAN");
    if (isBPJSKetenagakerjaan) {
      if ([1, 3, 6, 9].includes(formData.quantity)) discountPercentage = 50;
      else if (formData.quantity === 12) discountPercentage = 37.5;
    }
    const discountAmount = subtotal * (discountPercentage / 100);

    const ticket = {
      id: "TRX-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerName: formData.name,
      customerPhone: formData.phone,
      customerId: formData.customerId,
      productName: selectedProduct.name,
      price: selectedProduct.price,
      quantity: formData.quantity,
      adminFee: currentAdminFee,
      discountPercentage: discountPercentage,
      discountAmount: discountAmount,
      total: (subtotal - discountAmount) + currentAdminFee,
      date: new Date().toLocaleString('id-ID'),
      status: selectedCategory === 'BPJS' ? 'MENUNGGU VERIFIKASI' : 'LUNAS',
      paidAt: selectedCategory === 'BPJS' ? null : new Date().toLocaleString('id-ID'),
      timestamp: Date.now(),
      storeInfo: storeInfo,
      bankChannel: isBPJSKetenagakerjaan ? (formData.bankChannel || 'BCA') : null
    };
    
    try {
      // 1. Log Transaction
      const transRef = ref(db, 'transactions');
      await push(transRef, ticket);

      // 2. Update Stock
      const productRef = ref(db, `products/${selectedProduct.id}`);
      await update(productRef, { stock: selectedProduct.stock - formData.quantity });

      setCurrentTicket(ticket);
      setShowReceipt(true);
    } catch (err) {
      alert("Gagal memproses transaksi");
    }
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setStep(2);
  };

  const handleProductClick = (id) => {
    setFormData({ ...formData, productId: id, bankChannel: 'BCA' });
    setStep(3);
  };

  if (showReceipt) {
    const isBPJSKetenagakerjaan = currentTicket?.productName?.toUpperCase().includes("BPJS KETENAGAKERJAAN");
    if (isBPJSKetenagakerjaan) {
      return <ElectronicBPJSReceipt ticket={currentTicket} onBack={() => setShowReceipt(false)} />;
    }
    return <Receipt ticket={currentTicket} onBack={() => setShowReceipt(false)} />;
  }

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  return (
    <div className="fade-in">
      {step === 1 && (
        <div className="card">
          <h2 style={{ marginBottom: 24 }}>Pilih Kategori Layanan</h2>
          <div className="service-grid">
            {categories.map(cat => (
              <div 
                key={cat.name} 
                className="service-card"
                onClick={() => handleCategoryClick(cat.name)}
                style={{ padding: '30px 20px' }}
              >
                <span className="service-icon" style={{ fontSize: 48 }}>{cat.icon}</span>
                <span className="service-name" style={{ fontSize: 16 }}>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
            <button onClick={() => setStep(1)} style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>← Kembali</button>
            <h2>Pilih Layanan {selectedCategory}</h2>
          </div>
          <div className="service-grid">
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                className="service-card"
                onClick={() => handleProductClick(p.id)}
              >
                <span className="service-name">{p.name}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginTop: 8 }}>
                  Rp {p.price.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: p.stock > 0 ? 'var(--secondary)' : '#ef4444', marginTop: 4, fontWeight: 600 }}>
                  Stok: {p.stock}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fade-in">
          {!selectedProduct ? (
            <div className="card">
              <p>Terjadi kesalahan: Produk tidak ditemukan.</p>
              <button onClick={() => setStep(1)} className="btn btn-primary" style={{ marginTop: 16 }}>Kembali ke Kategori</button>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
                  <button onClick={() => setStep(2)} style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>← Kembali</button>
                  <h2>Detail Transaksi: {selectedProduct.name}</h2>
                </div>
                
                <div className="grid">
                  <div className="form-group">
                    <label>Nama Pelanggan</label>
                    <input 
                      type="text" value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="Masukkan nama..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Nomor Ponsel</label>
                    <input 
                      type="text" value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      placeholder="0812..."
                    />
                  </div>
                  {(selectedProduct?.name === 'PLN Postpaid' || ['INTERNET', 'BPJS', 'TV VOUCHER'].includes(selectedCategory)) && (
                    <div className="form-group">
                      <label>ID Pelanggan / Nomor Kontrak</label>
                      <input 
                        type="text" value={formData.customerId} 
                        onChange={e => setFormData({...formData, customerId: e.target.value})} 
                        placeholder="Masukkan ID..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Konfirmasi Pembayaran</h3>
                <div style={{ padding: 24, background: '#f8fafc', borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: 16, marginBottom: 4 }}>{selectedProduct.name}</h4>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        Harga Satuan: Rp {selectedProduct.price.toLocaleString()}
                      </p>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                        Biaya Admin: Rp {(selectedCategory === 'PULSA' || noAdminFee ? 0 : ADMIN_FEE).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL PEMBAYARAN</p>
                      <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
                        Rp {(() => {
                          const subtotal = formData.quantity * selectedProduct.price;
                          let disc = 0;
                          if (selectedProduct?.name?.toUpperCase().includes("BPJS KETENAGAKERJAAN")) {
                            if ([1, 3, 6, 9].includes(formData.quantity)) disc = 0.5;
                            else if (formData.quantity === 12) disc = 0.375;
                          }
                          const admin = (selectedCategory === 'PULSA' || noAdminFee) ? 0 : ADMIN_FEE;
                          return (subtotal * (1 - disc) + admin).toLocaleString();
                        })()}
                      </p>
                    </div>
                  </div>

                  {selectedCategory !== 'PULSA' && (
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', padding: '10px 16px', borderRadius: 12, border: '1px solid #fef3c7' }}>
                      <input 
                        type="checkbox" 
                        id="noAdminFee" 
                        checked={noAdminFee} 
                        onChange={(e) => setNoAdminFee(e.target.checked)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <label htmlFor="noAdminFee" style={{ fontSize: 13, fontWeight: 600, color: '#92400e', cursor: 'pointer' }}>
                        Hapus Biaya Admin untuk transaksi ini
                      </label>
                    </div>
                  )}
                  {(() => {
                    const isBPJSKetenagakerjaan = selectedProduct?.name?.toUpperCase().includes("BPJS KETENAGAKERJAAN");
                    let discP = 0;
                    if (isBPJSKetenagakerjaan) {
                      if ([1, 3, 6, 9].includes(formData.quantity)) discP = 50;
                      else if (formData.quantity === 12) discP = 37.5;
                    }
                    if (discP > 0) {
                       const subtotal = formData.quantity * selectedProduct.price;
                       const discA = subtotal * (discP / 100);
                       return (
                         <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                           <span style={{ color: '#059669', fontWeight: 600 }}>Potongan Khusus ({discP}%)</span>
                           <span style={{ color: '#059669', fontWeight: 700 }}>- Rp {discA.toLocaleString()}</span>
                         </div>
                       );
                    }
                    return null;
                  })()}
                  <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                    <div className="form-group" style={{ maxWidth: 120 }}>
                      <label>Jumlah</label>
                      <input 
                        type="number" min="1" value={formData.quantity} 
                        onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                </div>

                {selectedCategory === 'BPJS' && selectedProduct?.name?.toUpperCase().includes("BPJS KETENAGAKERJAAN") && (
                  <div className="form-group" style={{ marginTop: 20 }}>
                    <label style={{ color: '#0f172a', fontWeight: 700 }}>Bank Pembayaran (Cetak Kwitansi)</label>
                    <select 
                      value={formData.bankChannel || 'BCA'} 
                      onChange={e => setFormData({...formData, bankChannel: e.target.value})}
                      className="select-input"
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600 }}
                    >
                      <option value="BCA">BANK BCA</option>
                      <option value="BNI">BANK BNI</option>
                      <option value="BRI">BANK BRI</option>
                      <option value="MANDIRI">BANK MANDIRI</option>
                    </select>
                  </div>
                )}
                
                <button 
                  onClick={handlePayment}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: 16, fontSize: 16, marginTop: 16, borderRadius: 12, fontWeight: 700 }}
                >
                  Bayar Sekarang & Cetak
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const DailyTransactionTab = ({ products, storeInfo }) => {
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [customerName, setCustomerName] = useState('');

  const harianProducts = products.filter(p => p.category === 'HARIAN');

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id, q) => {
    if (q < 1) return;
    setCart(cart.map(item => 
      item.id === id ? { ...item, quantity: q } : item
    ));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    const ticket = {
      id: "SHOP-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerName: customerName || "Pelanggan Umum",
      items: cart,
      productName: `Harian (${cart.length} item)`,
      subtotal: subtotal,
      total: subtotal,
      date: new Date().toLocaleString('id-ID'),
      paidAt: new Date().toLocaleString('id-ID'),
      timestamp: Date.now(),
      storeInfo: storeInfo,
      category: 'HARIAN',
      status: 'LUNAS'
    };

    try {
      // 1. Log Transaction
      const transRef = ref(db, 'transactions');
      await push(transRef, ticket);

      // 2. Update Stocks
      for (const item of cart) {
        const productRef = ref(db, `products/${item.id}`);
        await update(productRef, { stock: (item.stock || 0) - item.quantity });
      }

      setCurrentTicket(ticket);
      setShowReceipt(true);
      setCart([]);
      setCustomerName('');
    } catch (err) {
      alert("Gagal memproses transaksi");
    }
  };

  if (showReceipt) {
    return <SupermarketReceipt ticket={currentTicket} onBack={() => setShowReceipt(false)} />;
  }

  return (
    <div className="grid harian-layout" style={{ gridTemplateColumns: '1fr 350px', alignItems: 'start' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Daftar Barang</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {harianProducts.map(p => (
            <div key={p.id} className="service-card" onClick={() => addToCart(p)} style={{ textAlign: 'left', padding: 15 }}>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</p>
              <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 4 }}>Rp {p.price.toLocaleString()}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stok: {p.stock}</p>
              <button className="btn btn-primary" style={{ marginTop: 8, padding: '4px 8px', fontSize: 11, width: '100%' }}>+ Tambah</button>
            </div>
          ))}
          {harianProducts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Belum ada produk 'HARIAN'. Tambahkan di Pengaturan.</p>}
        </div>
      </div>

      <div className="card" style={{ position: 'sticky', top: 20 }}>
        <h2 style={{ marginBottom: 20 }}>Keranjang</h2>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Nama Pelanggan (Opsional)</label>
          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Pelanggan Umum" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', marginBottom: 20, padding: 4 }}>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    style={{ width: 50, padding: '2px 4px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4 }} 
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>x Rp {item.price.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: 13 }}>Rp {(item.price * item.quantity).toLocaleString()}</p>
                <button onClick={() => removeFromCart(item.id)} style={{ color: '#ef4444', background: 'none', fontSize: 11, marginTop: 4 }}>Hapus</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>Keranjang kosong</p>}
        </div>
        <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
            <span>Subtotal</span>
            <span>Rp {cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--primary)' }}>
              Rp {cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}
            </span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="btn btn-primary" 
            style={{ width: '100%', padding: 14, opacity: cart.length === 0 ? 0.5 : 1 }}
          >
            Selesaikan & Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
};

const SupermarketReceipt = ({ ticket, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-container fade-in">
       <div className="market-receipt-box">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{ticket.storeInfo.name.toUpperCase()}</h2>
            <p style={{ fontSize: 12, margin: '4px 0' }}>{ticket.storeInfo.address}</p>
          </div>
          
          <div style={{ borderTop: '1px dashed #333', padding: '10px 0', fontSize: 12, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TGL: {ticket.date}</span>
              <span>NO: {ticket.id}</span>
            </div>
            <p style={{ marginTop: 4 }}>PELANGGAN: {ticket.customerName}</p>
          </div>

          <div style={{ borderTop: '1px dashed #333', borderBottom: '1px dashed #333', padding: '15px 0', margin: '10px 0' }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <tbody>
                {ticket.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr>
                      <td colSpan="3" style={{ fontWeight: 600, paddingBottom: 2 }}>{item.name}</td>
                    </tr>
                    <tr style={{ marginBottom: 10 }}>
                      <td style={{ width: 100, paddingBottom: 8 }}>{item.quantity} x {item.price.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', paddingBottom: 8 }}>{(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {ticket.discountAmount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px dashed #333', paddingTop: 10 }}>
                <span>Subtotal</span>
                <span>{ticket.subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#059669', marginBottom: 5 }}>
                <span>Potongan ({ticket.discountPercentage}%)</span>
                <span>- {ticket.discountAmount.toLocaleString()}</span>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, borderTop: ticket.discountAmount > 0 ? '1px dashed #333' : 'none', paddingTop: 10 }}>
            <span>TOTAL</span>
            <span>Rp {ticket.total.toLocaleString()}</span>
          </div>

          {ticket.status === 'LUNAS' && (
            <div style={{ textAlign: 'center', marginTop: 15, border: '2px dashed #059669', color: '#059669', padding: 8, borderRadius: 8 }}>
              <p style={{ margin: 0, fontWeight: 800 }}>LUNAS</p>
              <p style={{ margin: 0, fontSize: 10 }}>Tgl Bayar: {ticket.paidAt}</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12 }}>
            <p style={{ margin: 0 }}>{ticket.storeInfo.footer}</p>
            <p style={{ marginTop: 8, fontSize: 10 }}>TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
          </div>
       </div>

       <div className="no-print" style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
          <button onClick={onBack} className="btn" style={{ background: '#e2e8f0' }}>Kembali</button>
          <button onClick={handlePrint} className="btn btn-primary">Cetak Struk</button>
       </div>
    </div>
  );
};

const SettingsTab = ({ products, storeInfo }) => {
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: 'PLN', stock: 100 });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  // Local state for storeInfo to avoid flickering and allow 'Save' button
  const [localStoreInfo, setLocalStoreInfo] = useState({ ...storeInfo });

  useEffect(() => {
    setLocalStoreInfo({ ...storeInfo });
  }, [storeInfo]);

  const handleUpdateStore = () => {
    update(ref(db, 'storeInfo'), localStoreInfo);
    alert('Informasi Kedai berhasil disimpan!');
  };

  const addProduct = () => {
    if (!newProduct.name) return;
    const productsRef = ref(db, 'products');
    const newProductRef = push(productsRef);
    set(newProductRef, { ...newProduct, id: newProductRef.key });
    setNewProduct({ name: '', price: 0, category: 'PLN', stock: 100 });
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditData({ ...product });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = () => {
    if (!editData.name) return;
    update(ref(db, `products/${editingId}`), editData);
    setEditingId(null);
    setEditData(null);
  };

  const deleteProduct = (id) => {
    if (window.confirm('Hapus produk ini?')) {
      remove(ref(db, `products/${id}`));
    }
  };

  const clearAllProducts = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus SELURUH daftar produk?')) {
      remove(ref(db, 'products'));
    }
  };

  const resetTransactions = () => {
    if (window.confirm('PERINGATAN: Hapus semua data transaksi? Tindakan ini tidak dapat dibatalkan.')) {
      const confirmCode = window.prompt('Ketik "HAPUS" untuk konfirmasi:');
      if (confirmCode === 'HAPUS') {
        remove(ref(db, 'transactions'));
        alert('Semua data transaksi telah dihapus.');
      }
    }
  };

  const resetAllData = () => {
    if (window.confirm('PERINGATAN KRITIS: Anda akan menghapus SELURUH data aplikasi (Transaksi, Produk, dan User Petugas). Tindakan ini tidak dapat dibatalkan!')) {
      const confirmCode = window.prompt('Ketik "RESET TOTAL" untuk konfirmasi:');
      if (confirmCode === 'RESET TOTAL') {
        // 1. Remove Transactions
        remove(ref(db, 'transactions'));
        
        // 2. Remove Products (will be re-seeded or empty)
        remove(ref(db, 'products'));
        
        // 3. Remove Users EXCEPT Admin
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
          const users = snapshot.val();
          if (users) {
            Object.keys(users).forEach(id => {
              if (id !== 'admin') {
                remove(ref(db, `users/${id}`));
              }
            });
          }
        }, { onlyOnce: true });

        alert('Aplikasi telah berhasil direset ke pengaturan awal.');
        window.location.reload(); // Reload to refresh state
      }
    }
  };

  const renderProductRow = (p) => (
    <tr key={p.id}>
      <td>
        {editingId === p.id ? (
          <input style={{ padding: 4 }} value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
        ) : p.name}
      </td>
      <td>
        {editingId === p.id ? (
          <select style={{ padding: 4 }} value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})}>
            <option value="PLN">PLN</option>
            <option value="INTERNET">INTERNET</option>
            <option value="PDAM">PDAM</option>
            <option value="BPJS">BPJS</option>
            <option value="PULSA">PULSA</option>
            <option value="TV VOUCHER">TV VOUCHER</option>
            <option value="IPTV">IPTV</option>
            <option value="HARIAN">HARIAN</option>
          </select>
        ) : (
          <span className="badge badge-primary">{p.category}</span>
        )}
      </td>
      <td>
        {editingId === p.id ? (
          <input type="number" style={{ padding: 4 }} value={editData.price} onChange={e => setEditData({...editData, price: parseInt(e.target.value)})} />
        ) : (
          `Rp ${p.price.toLocaleString()}`
        )}
      </td>
      <td>
        {editingId === p.id ? (
          <input type="number" style={{ padding: 4 }} value={editData.stock} onChange={e => setEditData({...editData, stock: parseInt(e.target.value)})} />
        ) : p.stock}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 12 }}>
          {editingId === p.id ? (
            <>
              <button onClick={saveEdit} style={{ color: '#059669', background: 'none', fontWeight: 600 }}>Simpan</button>
              <button onClick={cancelEdit} style={{ color: '#64748b', background: 'none', fontWeight: 600 }}>Batal</button>
            </>
          ) : (
            <>
              <button onClick={() => startEdit(p)} style={{ color: 'var(--primary)', background: 'none', fontWeight: 600 }}>Edit</button>
              <button onClick={() => deleteProduct(p.id)} style={{ color: '#ef4444', background: 'none', fontWeight: 600 }}>Hapus</button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section className="card">
        <h2 style={{ marginBottom: 16 }}>Informasi Kedai</h2>
        <div className="grid">
          <div className="form-group">
            <label>Nama Kedai</label>
            <input 
              type="text" value={localStoreInfo.name} 
              onChange={e => setLocalStoreInfo({ ...localStoreInfo, name: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Alamat Kedai</label>
            <input 
              type="text" value={localStoreInfo.address} 
              onChange={e => setLocalStoreInfo({ ...localStoreInfo, address: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Nomor Rekening</label>
            <input 
              type="text" value={localStoreInfo.bankAccount} 
              onChange={e => setLocalStoreInfo({ ...localStoreInfo, bankAccount: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Footer Kwitansi</label>
            <input 
              type="text" value={localStoreInfo.footer} 
              onChange={e => setLocalStoreInfo({ ...localStoreInfo, footer: e.target.value })} 
            />
          </div>
        </div>
        <button onClick={handleUpdateStore} className="btn btn-primary" style={{ marginTop: 16, width: '100%' }}>Simpan Profil Kedai</button>
      </section>
      
      <section className="card" style={{ border: '1px solid #fee2e2' }}>
        <h2 style={{ marginBottom: 16, color: '#991b1b' }}>Pengaturan Sistem & Data</h2>
        <div style={{ background: '#fff1f1', padding: 20, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ color: '#991b1b', marginBottom: 4 }}>Reset Data Transaksi</h4>
            <p style={{ fontSize: 14, color: '#991b1b', opacity: 0.8 }}>Hapus seluruh riwayat transaksi secara permanen.</p>
          </div>
          <button 
            onClick={resetTransactions} 
            className="btn" 
            style={{ background: '#ef4444', color: 'white', padding: '10px 20px' }}
          >
            Hapus Semua Transaksi
          </button>
        </div>

        <div style={{ background: '#fff1f1', padding: 20, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div>
            <h4 style={{ color: '#991b1b', marginBottom: 4 }}>Reset Total Aplikasi</h4>
            <p style={{ fontSize: 14, color: '#991b1b', opacity: 0.8 }}>Hapus seluruh Transaksi, Produk, dan Akun Petugas.</p>
          </div>
          <button 
            onClick={resetAllData} 
            className="btn" 
            style={{ background: '#7f1d1d', color: 'white', padding: '10px 20px' }}
          >
            Reset Total Sekarang
          </button>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 16 }}>Kelola Produk & Stok</h2>
        <div className="grid" style={{ marginBottom: 24, gap: 12 }}>
          <input placeholder="Nama Produk" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
          <input type="number" placeholder="Harga" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value)})} />
          <input type="number" placeholder="Stok" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
          <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
            <option value="PLN">PLN</option>
            <option value="INTERNET">INTERNET</option>
            <option value="PDAM">PDAM</option>
            <option value="BPJS">BPJS</option>
            <option value="PULSA">PULSA</option>
            <option value="TV VOUCHER">TV VOUCHER</option>
            <option value="IPTV">IPTV</option>
            <option value="HARIAN">HARIAN</option>
          </select>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={addProduct} className="btn btn-primary" style={{ flex: 1 }}>Tambah Produk</button>
            <button onClick={clearAllProducts} className="btn" style={{ background: '#fee2e2', color: '#991b1b' }}>Hapus Semua</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Section 1: Produk Harian */}
          <div>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'var(--accent)', color: 'white', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</span>
              Stok Barang Harian
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.category === 'HARIAN').length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada produk harian</td></tr>
                  ) : (
                    products.filter(p => p.category === 'HARIAN').map(p => renderProductRow(p))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Produk Digital */}
          <div>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'var(--primary)', color: 'white', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌐</span>
              Layanan Produk Digital
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.category !== 'HARIAN').length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada layanan digital</td></tr>
                  ) : (
                    products.filter(p => p.category !== 'HARIAN').map(p => renderProductRow(p))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- Helper Functions ---
const terbilang = (n) => {
  const abjad = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (n < 12) return abjad[n];
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh " + terbilang(n % 10);
  if (n < 200) return "seratus " + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
  if (n < 2000) return "seribu " + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
  return "";
};

const Receipt = ({ ticket, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedTotal = ticket.total.toLocaleString('id-ID');
  const terbilangText = terbilang(ticket.total) + " rupiah";

  return (
    <div className="receipt-container fade-in">
      <div className="kwitansi-box">
        {/* Header Section */}
        <div className="kwitansi-header">
          <div className="header-left" style={{ textAlign: 'left' }}>
            <h2 className="store-name" style={{ margin: 0, fontWeight: 800 }}>{ticket.storeInfo.name.toUpperCase()}</h2>
            <p className="store-address" style={{ margin: 0, fontSize: 13 }}>{ticket.storeInfo.address.toUpperCase()}</p>
          </div>
          <div className="header-center">
            <h1 className="kwitansi-title" style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>KWITANSI</h1>
          </div>
          <div className="header-right">
            <table style={{ fontSize: 14 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 8px' }}>Tgl Angsuran</td>
                  <td>: {ticket.date.split(',')[0]}</td>
                </tr>
                <tr>
                  <td style={{ padding: '2px 8px' }}>Faktur No</td>
                  <td>: {ticket.id}</td>
                </tr>
                <tr>
                  <td style={{ padding: '2px 8px' }}>No Pelanggan</td>
                  <td>: {ticket.customerId || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="divider-line" style={{ borderTop: '2px solid #000', margin: '15px 0' }}></div>

        {/* Content Section 1 */}
        <div className="kwitansi-content-top">
          <div className="content-row" style={{ marginBottom: 12 }}>
            <span className="label" style={{ width: 140 }}>Telah terima dari</span>
            <span className="separator">:</span>
            <span className="value" style={{ fontWeight: 700 }}>{ticket.customerName.toUpperCase()}</span>
          </div>
          <div className="content-row" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
               <span className="label" style={{ width: 140 }}>Sejumlah uang</span>
               <span className="separator">:</span>
               <span className="value" style={{ fontWeight: 700, fontSize: 18, marginRight: 20 }}>{formattedTotal}</span>
            </div>
            <div className="terbilang-box" style={{ 
              border: '1.5px dashed #666', 
              borderRadius: '15px', 
              padding: '10px 25px', 
              fontStyle: 'italic',
              flex: 1,
              marginTop: -5
            }}>
              {terbilangText.charAt(0).toUpperCase() + terbilangText.slice(1)}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="kwitansi-table-container">
          <table className="kwitansi-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                <th style={{ width: 50, padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>NO</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>KETERANGAN</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>JUMLAH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', padding: '10px' }}>1</td>
                <td style={{ padding: '10px' }}>{ticket.productName} x {ticket.quantity}</td>
                <td style={{ textAlign: 'right', padding: '10px', fontWeight: 500 }}>{(ticket.price * ticket.quantity).toLocaleString('id-ID')}</td>
              </tr>
              {ticket.discountAmount > 0 && (
                <tr>
                  <td style={{ textAlign: 'center', padding: '10px' }}>2</td>
                  <td>Potongan ({ticket.discountPercentage}%)</td>
                  <td style={{ textAlign: 'right', padding: '10px', fontWeight: 500, color: '#059669' }}>- {ticket.discountAmount.toLocaleString('id-ID')}</td>
                </tr>
              )}
              {ticket.adminFee > 0 && (
                <tr>
                  <td style={{ textAlign: 'center', padding: '10px' }}>{ticket.discountAmount > 0 ? 3 : 2}</td>
                  <td>Biaya Admin</td>
                  <td style={{ textAlign: 'right', padding: '10px', fontWeight: 500 }}>{ticket.adminFee.toLocaleString('id-ID')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divider-line" style={{ borderTop: '3px double #333', margin: '20px 0 10px' }}></div>
        
        <div className="total-row" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 60, marginBottom: 30 }}>
          <span className="total-label" style={{ fontSize: 22, fontWeight: 700 }}>T O T A L :</span>
          <span className="total-value" style={{ fontSize: 22, fontWeight: 700 }}>{formattedTotal}</span>
        </div>

        {/* Footer Section */}
        <div className="kwitansi-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="footer-left">
            <p className="perhatian-label" style={{ fontWeight: 700, fontStyle: 'italic', marginBottom: 5 }}>Perhatian :</p>
            <div className="perhatian-box" style={{ 
              width: 350, 
              height: 100, 
              border: '1.5px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
               {ticket.status === 'LUNAS' && (
                 <div style={{ 
                   border: '3px solid #059669', 
                   color: '#059669', 
                   padding: '5px 15px', 
                   fontWeight: 900, 
                   fontSize: 24, 
                   transform: 'rotate(-5deg)', 
                   borderRadius: 8,
                   opacity: 0.8,
                   textAlign: 'center',
                   backgroundColor: 'rgba(255, 255, 255, 0.8)'
                 }}>
                   LUNAS
                   <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>TGL: {ticket.paidAt}</div>
                 </div>
               )}
            </div>
          </div>
          
          <div className="footer-right" style={{ textAlign: 'right' }}>
            <p className="kwitansi-date" style={{ fontSize: 16, marginBottom: 0 }}>{ticket.date.split(',')[0]} {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
      
      <div className="no-print" style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
        <button onClick={onBack} className="btn" style={{ background: '#e2e8f0' }}>Kembali</button>
        <button onClick={handlePrint} className="btn btn-primary">Cetak Kwitansi</button>
      </div>
    </div>
  );
};

const VerificationTab = ({ transactions }) => {
  const [verifyingTicket, setVerifyingTicket] = useState(null);
  const [noRef, setNoRef] = useState('');

  const pendingTransactions = transactions.filter(t => t.status === 'MENUNGGU VERIFIKASI');

  const handleVerify = () => {
    if (!noRef.trim()) {
      alert("Masukkan Nomor Referensi (Kode Transaksi)");
      return;
    }

    update(ref(db, `transactions/${verifyingTicket.fbKey}`), {
      status: 'LUNAS',
      noReferensi: noRef,
      paidAt: new Date().toLocaleString('id-ID')
    }).then(() => {
      alert("Pembayaran berhasil diverifikasi!");
      setVerifyingTicket(null);
      setNoRef('');
    }).catch(() => {
      alert("Gagal memverifikasi pembayaran.");
    });
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 20 }}>Daftar Menunggu Verifikasi</h3>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Trx</th>
              <th>Pelanggan</th>
              <th>Layanan</th>
              <th>Total</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pendingTransactions.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Tidak ada transaksi yang menunggu verifikasi.</td></tr>
            ) : (
              pendingTransactions.map(t => (
                <tr key={t.id}>
                  <td><code style={{ fontSize: 11 }}>{t.id}</code></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.customerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {t.customerId}</div>
                  </td>
                  <td>{t.productName}</td>
                  <td style={{ fontWeight: 700 }}>Rp {t.total.toLocaleString()}</td>
                  <td>
                    <button 
                      onClick={() => setVerifyingTicket(t)}
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      Verifikasi
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {verifyingTicket && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 450, padding: 24 }}>
            <h2 style={{ marginBottom: 16 }}>Verifikasi Pembayaran</h2>
            <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 12, fontSize: 14 }}>
              <p><strong>Layanan:</strong> {verifyingTicket.productName}</p>
              <p><strong>Pelanggan:</strong> {verifyingTicket.customerName}</p>
              <p><strong>Total:</strong> Rp {verifyingTicket.total.toLocaleString()}</p>
            </div>
            <div className="form-group">
              <label>Kode Transaksi / No. Referensi</label>
              <input 
                type="text" 
                value={noRef} 
                onChange={e => setNoRef(e.target.value)} 
                placeholder="Masukkan No. Referensi..." 
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={handleVerify} className="btn btn-primary" style={{ flex: 1 }}>Simpan & Tandai Lunas</button>
              <button onClick={() => { setVerifyingTicket(null); setNoRef(''); }} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionHistoryTab = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  if (showReceipt && selectedTicket) {
    if (selectedTicket.category === 'HARIAN') {
      return <SupermarketReceipt ticket={selectedTicket} onBack={() => setShowReceipt(false)} />;
    }
    const isBPJSKetenagakerjaan = selectedTicket.productName?.toUpperCase().includes("BPJS KETENAGAKERJAAN");
    if (selectedTicket.category === 'BPJS_TK' || isBPJSKetenagakerjaan) {
      return <ElectronicBPJSReceipt ticket={selectedTicket} onBack={() => setShowReceipt(false)} />;
    }
    return <Receipt ticket={selectedTicket} onBack={() => setShowReceipt(false)} />;
  }

  const deleteTransaction = (fbKey) => {
    if (!fbKey) {
      alert("Gagal menghapus: Key tidak ditemukan");
      return;
    }
    if (window.confirm('Hapus riwayat transaksi ini?')) {
      remove(ref(db, `transactions/${fbKey}`));
    }
  };

  const markAsLunas = (ticket) => {
    if (window.confirm(`Tandai transaksi ${ticket.id} sebagai LUNAS?`)) {
      update(ref(db, `transactions/${ticket.fbKey}`), { 
        status: 'LUNAS',
        paidAt: new Date().toLocaleString('id-ID')
      }).then(() => {
        alert("Transaksi berhasil ditandai LUNAS");
      }).catch(() => {
        alert("Gagal memperbarui status");
      });
    }
  };

  const removeAdminFee = (ticket) => {
    if (!ticket.adminFee || ticket.adminFee === 0) {
      alert("Transaksi ini tidak memiliki biaya admin.");
      return;
    }

    if (window.confirm(`Hapus biaya admin (Rp ${ticket.adminFee.toLocaleString()}) untuk transaksi ${ticket.id}? Total transaksi akan diperbarui.`)) {
      const newTotal = ticket.total - ticket.adminFee;
      update(ref(db, `transactions/${ticket.fbKey}`), { 
        adminFee: 0,
        total: newTotal
      }).then(() => {
        alert("Biaya admin berhasil dihapus!");
      }).catch(() => {
        alert("Gagal menghapus biaya admin.");
      });
    }
  };

  const handlePrint = (ticket) => {
    setSelectedTicket(ticket);
    setShowReceipt(true);
  };

  // Filter and Sort by timestamp (descending)
  const sortedTransactions = [...transactions]
    .filter(t => 
      (t.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (t.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (t.productName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return (
    <div className="card">
      <div style={{ marginBottom: 20 }}>
        <input 
          type="text" 
          placeholder="Cari berdasarkan ID Trx, Nama Pelanggan, atau Layanan..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Trx</th>
              <th>Tanggal</th>
              <th>Pelanggan</th>
              <th>Layanan</th>
              <th>Total</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>{searchTerm ? 'Transaksi tidak ditemukan' : 'Belum ada transaksi'}</td></tr>
            ) : (
              sortedTransactions.map(t => (
                <tr key={t.id}>
                  <td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 4px', borderRadius: 4 }}>{t.id}</code></td>
                  <td>{t.date}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.customerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.customerPhone}</div>
                  </td>
                  <td>{t.productName}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    Rp {t.total.toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${t.status === 'LUNAS' ? 'badge-success' : 'badge-warning'}`}>
                      {t.status || 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {t.status !== 'LUNAS' && (
                        <button onClick={() => markAsLunas(t)} style={{ color: '#059669', background: 'none', fontWeight: 600, fontSize: 13 }}>LUNAS</button>
                      )}
                      <button onClick={() => handlePrint(t)} style={{ color: 'var(--primary)', background: 'none', fontWeight: 600, fontSize: 13 }}>Cetak</button>
                      {t.adminFee > 0 && (
                        <button onClick={() => removeAdminFee(t)} style={{ color: '#f59e0b', background: 'none', fontWeight: 600, fontSize: 13 }}>Hapus Admin</button>
                      )}
                      <button onClick={() => deleteTransaction(t.fbKey)} style={{ color: '#ef4444', background: 'none', fontWeight: 600, fontSize: 13 }}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- BPJS TK COMPONENTS ---

const BPJSTKSettingsTab = ({ packages }) => {
  const [newPkg, setNewPkg] = useState({ name: '', nominal: 0, denda: 0 });
  const safePackages = Array.isArray(packages) ? packages : [];
  
  const addPkg = async () => {
    if (!newPkg.name || newPkg.nominal === 0) {
      alert("Mohon isi Nama Layanan dan Nominal iuran.");
      return;
    }
    try {
      const pkgRef = ref(db, 'bpjstk_packages');
      await push(pkgRef, newPkg);
      setNewPkg({ name: '', nominal: 0, denda: 0 });
      alert("Layanan BPJS TK berhasil ditambahkan!");
    } catch (err) {
      alert("Gagal menambahkan layanan: " + err.message);
    }
  };

  const deletePkg = (id) => {
    if (window.confirm('Hapus paket ini?')) {
      remove(ref(db, `bpjstk_packages/${id}`));
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: 20 }}>Manajemen Layanan BPJS TK</h2>
      <div className="grid" style={{ marginBottom: 30, gap: 12 }}>
        <div className="form-group">
           <label>Nama Layanan</label>
           <input placeholder="Contoh: JHT, JKK, dll" value={newPkg.name} onChange={e => setNewPkg({...newPkg, name: e.target.value})} />
        </div>
        <div className="form-group">
           <label>Nominal (Rp)</label>
           <input type="number" placeholder="0" value={newPkg.nominal} onChange={e => setNewPkg({...newPkg, nominal: parseInt(e.target.value) || 0})} />
        </div>
        <div className="form-group">
           <label>Denda (Rp)</label>
           <input type="number" placeholder="0" value={newPkg.denda} onChange={e => setNewPkg({...newPkg, denda: parseInt(e.target.value) || 0})} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 20 }}>
           <button onClick={addPkg} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>Tambah Layanan</button>
        </div>
      </div>
      
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Layanan</th>
              <th>Nominal</th>
              <th>Denda</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {safePackages.map((pkg, idx) => (
              <tr key={pkg.fbKey || idx}>
                <td style={{ fontWeight: 600 }}>{pkg.name}</td>
                <td>Rp {pkg.nominal?.toLocaleString()}</td>
                <td style={{ color: pkg.denda > 0 ? '#ef4444' : 'inherit' }}>Rp {pkg.denda?.toLocaleString()}</td>
                <td>
                  <button onClick={() => deletePkg(pkg.fbKey)} style={{ color: '#ef4444', background: 'none', fontWeight: 600 }}>Hapus</button>
                </td>
              </tr>
            ))}
            {safePackages.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Belum ada layanan BPJS TK. Tambahkan di atas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BPJSTKTab = ({ packages, storeInfo }) => {
  const [formData, setFormData] = useState({ 
    companyName: '', 
    npp: '', 
    kelas: '', 
    months: 1, 
    note: '',
    address: '',
    periode: '',
    ketPembayaran: '',
    nomJKKJKM: 0,
    nomJHT: 0,
    nomJP: 0,
    bankChannel: 'BCA'
  });
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const safePackages = Array.isArray(packages) ? packages : [];

  const togglePackage = (pkg) => {
    const isSelected = selectedPackages.find(p => p.fbKey === pkg.fbKey);
    if (isSelected) {
      setSelectedPackages(selectedPackages.filter(p => p.fbKey !== pkg.fbKey));
    } else {
      setSelectedPackages([...selectedPackages, pkg]);
    }
  };

  const handleCheckout = async () => {
    const totalNominalCheck = (formData.nomJKKJKM || 0) + (formData.nomJHT || 0) + (formData.nomJP || 0);
    if (!formData.companyName || totalNominalCheck === 0) {
      alert("Mohon isi Nama Perusahaan dan minimal satu nominal program.");
      return;
    }

    const totalNominal = (formData.nomJKKJKM || 0) + (formData.nomJHT || 0) + (formData.nomJP || 0);
    const total = totalNominal;

    // Generate 10 random digits for Kwitansi Number
    const random10Digits = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    const ticket = {
      id: "BTX-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      noKwitansi: random10Digits,
      category: 'BPJS_TK',
      customerName: formData.companyName,
      nik: formData.npp,
      address: formData.address,
      periode: formData.periode,
      untukPembayaran: formData.ketPembayaran,
      nomJKKJKM: formData.nomJKKJKM,
      nomJHT: formData.nomJHT,
      nomJP: formData.nomJP,
      kelas: formData.kelas,
      items: selectedPackages, // Keeping this for backward compat if needed, but using spec fields now
      months: formData.months,
      note: formData.note,
      total: total,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      timestamp: Date.now(),
      status: 'LUNAS',
      storeInfo: storeInfo,
      productName: "BPJS KETENAGAKERJAAN",
      bankChannel: formData.bankChannel
    };

    try {
      await push(ref(db, 'transactions'), ticket);
      setCurrentTicket(ticket);
      setShowReceipt(true);
    } catch (err) {
      alert("Gagal menyimpan transaksi.");
    }
  };

  if (showReceipt) return <ElectronicBPJSReceipt ticket={currentTicket} onBack={() => setShowReceipt(false)} />;

  return (
    <div className="grid harian-layout" style={{ gridTemplateColumns: '1fr 400px', alignItems: 'start' }}>
      <div className="card">
        <h2 style={{ marginBottom: 24 }}>Data Tagihan & Iuran Program</h2>
        <div className="grid" style={{ gap: 20 }}>
          <div className="form-group">
            <label>Program JKK & JKM (Nominal)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
              <input 
                type="number" style={{ paddingLeft: 40 }} 
                value={formData.nomJKKJKM} 
                onChange={e => setFormData({...formData, nomJKKJKM: parseInt(e.target.value) || 0})} 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Program JHT (Nominal)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
              <input 
                type="number" style={{ paddingLeft: 40 }} 
                value={formData.nomJHT} 
                onChange={e => setFormData({...formData, nomJHT: parseInt(e.target.value) || 0})} 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Program JP (Nominal)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Rp</span>
              <input 
                type="number" style={{ paddingLeft: 40 }} 
                value={formData.nomJP} 
                onChange={e => setFormData({...formData, nomJP: parseInt(e.target.value) || 0})} 
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Keterangan Tambahan</h3>
          <div className="form-group">
            <label>Alamat Lengkap</label>
            <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Masukkan alamat..." />
          </div>
          <div className="form-group">
            <label>Untuk Pembayaran</label>
            <input type="text" value={formData.ketPembayaran} onChange={e => setFormData({...formData, ketPembayaran: e.target.value})} placeholder="Contoh: Iuran BPJS Ketenagakerjaan..." />
          </div>
        </div>
      </div>

      <div className="card" style={{ position: 'sticky', top: 20 }}>
        <h2 style={{ marginBottom: 20 }}>Rincian Kwitansi</h2>
        <div className="form-group">
          <label>Nama Peserta / Perusahaan</label>
          <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value.toUpperCase()})} placeholder="PT. CONTOH ABADI / NAMA PESERTA" />
        </div>
        <div className="form-group">
          <label>NIK / Nomor NPP</label>
          <input type="text" value={formData.npp} onChange={e => setFormData({...formData, npp: e.target.value})} placeholder="Masukkan NIK Peserta..." />
        </div>
        <div className="form-group">
          <label>Periode Pembayaran</label>
          <input type="text" value={formData.periode} onChange={e => setFormData({...formData, periode: e.target.value})} placeholder="Contoh: Januari 2024..." />
        </div>
        
        <div className="form-group">
          <label>Bank Pembayaran (Logo di Kwitansi)</label>
          <select 
            value={formData.bankChannel} 
            onChange={e => setFormData({...formData, bankChannel: e.target.value})}
            className="select-input"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', fontWeight: 600 }}
          >
            <option value="BCA">BANK BCA</option>
            <option value="BNI">BANK BNI</option>
            <option value="BRI">BANK BRI</option>
            <option value="MANDIRI">BANK MANDIRI</option>
          </select>
        </div>

        <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: 16, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontWeight: 700 }}>TOTAL BAYAR</span>
            <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--primary)' }}>
              Rp {((formData.nomJKKJKM || 0) + (formData.nomJHT || 0) + (formData.nomJP || 0)).toLocaleString()}
            </span>
          </div>
          
          <button 
            disabled={!formData.companyName || ((formData.nomJKKJKM + formData.nomJHT + formData.nomJP) === 0)}
            onClick={handleCheckout}
            className="btn btn-primary" 
            style={{ width: '100%', padding: 16, fontSize: 16, fontWeight: 700, borderRadius: 12 }}
          >
            Cetak Kwitansi Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
};

const ElectronicBPJSReceipt = ({ ticket, onBack }) => {
  const handlePrint = () => window.print();

  const totalAmount = (ticket.nomJKKJKM || 0) + (ticket.nomJHT || 0) + (ticket.nomJP || 0);
  const terbilangText = terbilang(totalAmount);
  const terbilangCapitalized = terbilangText.charAt(0).toUpperCase() + terbilangText.slice(1) + ' Rupiah';

  return (
    <div className="modern-receipt-container fade-in">
      <div className="bpjs-kwitansi-box">

        {/* ── HEADER ── */}
        <div className="bpjs-header">
          <div className="bpjs-logo-container">
            <div className="bpjs-logo-crop">
              <img src="/bpjs-logo.png" alt="BPJS Ketenagakerjaan" className="bpjs-logo-img" />
            </div>
          </div>
          <h1 className="bpjs-kwitansi-title">KWITANSI PEMBAYARAN</h1>
        </div>

        <div className="bpjs-divider"></div>

        {/* ── CONTENT FIELDS ── */}
        <div className="bpjs-content">
          <div className="bpjs-row">
            <span className="bpjs-label">No. Kwitansi</span>
            <span className="bpjs-separator">:</span>
            <span className="bpjs-value-dotted">{ticket.noKwitansi || ticket.id}</span>
          </div>
          <div className="bpjs-row">
            <span className="bpjs-label">Tanggal</span>
            <span className="bpjs-separator">:</span>
            <span className="bpjs-value-dotted">{ticket.date}</span>
          </div>

          <div className="bpjs-spacer"></div>

          <div className="bpjs-row">
            <span className="bpjs-label">Telah Terima Dari</span>
            <span className="bpjs-separator">:</span>
            <span className="bpjs-value-dotted full-width">{ticket.customerName}</span>
          </div>
          <div className="bpjs-row">
            <span className="bpjs-label">Alamat</span>
            <span className="bpjs-separator">:</span>
            <span className="bpjs-value-dotted full-width">{ticket.address || ''}</span>
          </div>

          <div className="bpjs-spacer"></div>

          <div className="bpjs-row">
            <span className="bpjs-label">Untuk Pembayaran</span>
            <span className="bpjs-separator">:</span>
            <span className="bpjs-value-dotted full-width">{ticket.untukPembayaran || ticket.productName}</span>
          </div>
          <div className="bpjs-row">
            <span className="bpjs-label">Periode</span>
            <span className="bpjs-separator">:</span>
            <span className="bpjs-value-dotted full-width">{ticket.periode || ''}</span>
          </div>
        </div>

        {/* ── JUMLAH UANG ── */}
        <div className="bpjs-amount-section">
          <div className="bpjs-amount-row">
            <span className="bpjs-amount-label">Total Pembayaran:</span>
            <span className="bpjs-amount-value">Rp. {totalAmount.toLocaleString('id-ID')},-</span>
            <span className="bpjs-amount-terbilang">({terbilangCapitalized})</span>
          </div>
        </div>

        <div className="bpjs-divider" style={{marginTop: 12}}></div>

        {/* ── TABLE + SIGNATURE ── */}
        <div className="bpjs-bottom-section">
          <div className="bpjs-table-left">
            <table className="bpjs-table">
              <tbody>
                <tr>
                  <td className="bpjs-table-label">Program JKK & JKM</td>
                  <td className="bpjs-table-value">Rp. {(ticket.nomJKKJKM || 0).toLocaleString('id-ID')},-</td>
                </tr>
                <tr>
                  <td className="bpjs-table-label">Program JHT</td>
                  <td className="bpjs-table-value">Rp. {(ticket.nomJHT || 0).toLocaleString('id-ID')},-</td>
                </tr>
                <tr>
                  <td className="bpjs-table-label">Program JP</td>
                  <td className="bpjs-table-value">Rp. {(ticket.nomJP || 0).toLocaleString('id-ID')},-</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bpjs-signature-area">
            <p className="bpjs-signature-date">{ticket.date}</p>
            <p className="bpjs-signature-title">Petugas BPJS Ketenagakerjaan</p>
            <div className="bpjs-signature-space"></div>
            <p className="bpjs-signature-name">{ticket.storeInfo?.name || 'Petugas'}</p>
          </div>
        </div>


      </div>

      <div className="no-print" style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'center' }}>
        <button onClick={onBack} className="btn" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>← Kembali</button>
        <button onClick={handlePrint} className="btn btn-primary" style={{ minWidth: 160, fontWeight: 700 }}>Cetak Kwitansi</button>
      </div>
    </div>
  );
};

export default App;
