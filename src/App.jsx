import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, update, remove } from "firebase/database";
import { db } from "./firebase";
import './index.css';

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
        setCurrentUser(user);
        localStorage.setItem('tokoku_current_user', JSON.stringify(user));
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
          <div className="logo-icon" style={{ width: 64, height: 64, margin: '0 auto 16px', fontSize: 32 }}>T</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{isLogin ? 'Selamat Datang' : 'Daftar Akun'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Toko-<span>KU</span> | Belanja Mudah & Cepat</p>
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

const Sidebar = ({ activeTab, setActiveTab, currentUser, onLogout }) => (
  <div className="sidebar">
    <div>
      <div className="logo" style={{ marginBottom: 32 }}>
        <div className="logo-icon">T</div>
        Toko-<span>KU</span>
      </div>
      <div className="nav-links">
        <button 
          className={`nav-item ${activeTab === 'pembayaran' ? 'active' : ''}`}
          onClick={() => setActiveTab('pembayaran')}
        >
          <span>🛒</span> Pembayaran
        </button>

        {currentUser.role === 'ADMIN' && (
          <>
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span>📊</span> Ringkasan
            </button>
            <button 
              className={`nav-item ${activeTab === 'pengaturan' ? 'active' : ''}`}
              onClick={() => setActiveTab('pengaturan')}
            >
              <span>⚙️</span> Pengaturan
            </button>
            <button 
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span>👥</span> Manajemen User
            </button>
            <button 
              className={`nav-item ${activeTab === 'riwayat' ? 'active' : ''}`}
              onClick={() => setActiveTab('riwayat')}
            >
              <span>📜</span> Riwayat Transaksi
            </button>
          </>
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
);

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('pembayaran');
  
  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && activeTab === 'pembayaran') {
      setActiveTab('dashboard');
    }
  }, [currentUser]);
  
  const [users, setUsers] = useState({});
  const [storeInfo, setStoreInfo] = useState({
    name: "Toko-KU",
    address: "Jl. Merdeka No. 123, Jakarta",
    bankAccount: "BANK BNI - 1234567890",
    footer: "Terima kasih telah belanja di Toko-KU!"
  });
  const [products, setProducts] = useState({});
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

    // 5. Auth Session
    const savedSession = localStorage.getItem('tokoku_current_user');
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
    
    setIsInitialized(true);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tokoku_current_user');
    setActiveTab('pembayaran');
  };

  if (!isInitialized) return null;

  if (!currentUser) {
    return <AuthPage users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} />;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="main-content">
        {activeTab === 'dashboard' && currentUser.role === 'ADMIN' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Ringkasan Dashboard</h1>
              <p className="page-subtitle">Ringkasan performa penjualan Toko-KU</p>
            </header>
            <DashboardTab transactions={transactions} users={Object.values(users || {})} />
          </div>
        )}
        
        {activeTab === 'pembayaran' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Pembayaran</h1>
              <p className="page-subtitle">Pilih layanan dan lakukan transaksi</p>
            </header>
            <PaymentTab products={Object.values(products || {})} storeInfo={storeInfo} />
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

        {activeTab === 'riwayat' && currentUser.role === 'ADMIN' && (
          <div className="page fade-in">
            <header className="page-header">
              <h1 className="page-title">Riwayat Transaksi</h1>
              <p className="page-subtitle">Daftar seluruh transaksi yang dilakukan</p>
            </header>
            <TransactionHistoryTab transactions={transactions} />
          </div>
        )}
      </main>
    </div>
  );
}

// --- Specific Tabs Components ---
const ADMIN_FEE = 2500;

const DashboardTab = ({ transactions, users }) => {
  const totalRevenue = transactions.reduce((acc, t) => acc + (t.total || 0), 0);
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

  const handleResetPassword = (id, name) => {
    const newPassword = window.prompt(`Masukkan katasandi baru untuk ${name}:`);
    if (newPassword && newPassword.trim() !== '') {
      update(ref(db, `users/${id}`), { password: newPassword });
      alert(`Katasandi ${name} berhasil diubah!`);
    }
  };

  return (
    <div className="card">
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    
    const ticket = {
      id: "TRX-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerName: formData.name,
      customerPhone: formData.phone,
      customerId: formData.customerId,
      productName: selectedProduct.name,
      price: selectedProduct.price,
      quantity: formData.quantity,
      adminFee: ADMIN_FEE,
      total: (selectedProduct.price * formData.quantity) + ADMIN_FEE,
      date: new Date().toLocaleString('id-ID'),
      timestamp: Date.now(),
      storeInfo: storeInfo
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
    setFormData({ ...formData, productId: id });
    setStep(3);
  };

  if (showReceipt) {
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
                        Biaya Admin: Rp {ADMIN_FEE.toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL PEMBAYARAN</p>
                      <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
                        Rp {((formData.quantity * selectedProduct.price) + ADMIN_FEE).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 16, maxWidth: 120 }}>
                    <label>Jumlah</label>
                    <input 
                      type="number" min="1" value={formData.quantity} 
                      onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>

                <button 
                  onClick={handlePayment}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: 16, fontSize: 16 }}
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
          </select>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={addProduct} className="btn btn-primary" style={{ flex: 1 }}>Tambah Produk</button>
            <button onClick={clearAllProducts} className="btn" style={{ background: '#fee2e2', color: '#991b1b' }}>Hapus Semua</button>
          </div>
        </div>
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
            {products.map(p => (
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
            ))}
          </tbody>
        </table>
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
          <div className="header-left">
            <h2 className="store-name">{ticket.storeInfo.name.toUpperCase()}</h2>
            <p className="store-address">{ticket.storeInfo.address.toUpperCase()}</p>
            <p className="store-telp">TELP. 0331-123456</p>
          </div>
          <div className="header-center">
            <h1 className="kwitansi-title">KWITANSI</h1>
          </div>
          <div className="header-right">
            <table>
              <tbody>
                <tr>
                  <td>Tgl Angsuran</td>
                  <td>: {ticket.date.split(',')[0]}</td>
                </tr>
                <tr>
                  <td>Faktur No</td>
                  <td>: {ticket.id}</td>
                </tr>
                <tr>
                  <td>No Pelanggan</td>
                  <td>: {ticket.customerId || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="divider-line"></div>

        {/* Content Section 1 */}
        <div className="kwitansi-content-top">
          <div className="content-row">
            <span className="label">Telah terima dari</span>
            <span className="separator">:</span>
            <span className="value">{ticket.customerName.toUpperCase()}</span>
          </div>
          <div className="content-row" style={{ marginTop: 8 }}>
            <span className="label">Sejumlah uang</span>
            <span className="separator">:</span>
            <span className="value">{formattedTotal}</span>
            <div className="terbilang-box">
              {terbilangText.charAt(0).toUpperCase() + terbilangText.slice(1)}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="kwitansi-table-container">
          <table className="kwitansi-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>NO</th>
                <th>KETERANGAN</th>
                <th style={{ textAlign: 'right' }}>JUMLAH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center' }}>1</td>
                <td>{ticket.productName} x {ticket.quantity}</td>
                <td style={{ textAlign: 'right' }}>{(ticket.price * ticket.quantity).toLocaleString('id-ID')}</td>
              </tr>
              {ticket.adminFee > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>2</td>
                  <td>Biaya Admin</td>
                  <td style={{ textAlign: 'right' }}>{ticket.adminFee.toLocaleString('id-ID')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divider-line double" style={{ marginTop: 40 }}></div>
        <div className="total-row">
          <span className="total-label">T O T A L :</span>
          <span className="total-value">{formattedTotal}</span>
        </div>

        {/* Footer Section */}
        <div className="kwitansi-footer">
          <div className="footer-left">
            <div className="footer-stats">
              <div className="stats-row">
                <span className="label">Total Hutang</span>
                <span className="separator">:</span>
                <span className="value">{(ticket.total + 2031250).toLocaleString('id-ID')}</span>
              </div>
              <div className="stats-row">
                <span className="label">Total Angsuran</span>
                <span className="separator">:</span>
                <span className="value">{formattedTotal}</span>
              </div>
              <div className="stats-row">
                <span className="label">Sisa Hutang</span>
                <span className="separator">:</span>
                <span className="value">2.031.250</span>
              </div>
              <div className="stats-row" style={{ marginTop: 12 }}>
                <span className="label">Status</span>
                <span className="separator">:</span>
                <span className="value">Belum Lunas</span>
              </div>
              <div className="stats-row">
                <span className="label">Jatuh Tempo</span>
                <span className="separator">:</span>
                <span className="value">12/3/2011</span>
              </div>
            </div>
          </div>
          
          <div className="footer-center">
            <p className="perhatian-label">Perhatian :</p>
            <div className="perhatian-box"></div>
          </div>

          <div className="footer-right">
            <p className="kwitansi-date">{ticket.date.split(',')[0]} {new Date().getFullYear()}</p>
            <p className="footer-signature">gsoft</p>
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

const TransactionHistoryTab = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const deleteTransaction = (fbKey) => {
    if (!fbKey) {
      alert("Gagal menghapus: Key tidak ditemukan");
      return;
    }
    if (window.confirm('Hapus riwayat transaksi ini?')) {
      remove(ref(db, `transactions/${fbKey}`));
    }
  };

  // Sort by timestamp (descending)
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
      <table className="data-table">
        <thead>
          <tr>
            <th>ID Trx</th>
            <th>Tanggal</th>
            <th>Pelanggan</th>
            <th>Layanan</th>
            <th>Total</th>
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
                  <button onClick={() => deleteTransaction(t.fbKey)} style={{ color: '#ef4444', background: 'none', fontWeight: 600, fontSize: 13 }}>Hapus</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default App;
