// Wait for Firebase SDK to load, then initialize
function initApp() {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    showToast('Greška: Firebase se nije učitao. Provjerite internet vezu.', 'error');
    return;
  }

  // Helper: Toast notifikacije umjesto alert()
  function showToast(message, type = 'info') {
    // Kreiraj toast element ako ne postoji
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      min-width: 250px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: all 0.3s ease;
      opacity: 0;
    `;
    
    // Postavi boju prema tipu
    switch(type) {
      case 'success':
        toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        break;
      case 'error':
        toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        break;
      case 'warning':
        toast.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        break;
      default:
        toast.style.background = 'linear-gradient(135deg, #4f46e5, #4338ca)';
    }
    
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Animacija prikaza
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 100);
    
    // Automatsko uklanjanje
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // Helper: Sanitizacija HTML-a da spriječimo XSS
  function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Debounce funkcija za pretragu
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Helper: Generisanje sigurnog ID-a
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // Firebase config - molerpro project with Realtime Database
  const firebaseConfig = {
    apiKey: "AIzaSyB3pm09C2J_kH5-XvNh2imKiwxh_OTrEEc",
    authDomain: "molerpro.firebaseapp.com",
    databaseURL: "https://molerpro-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "molerpro",
    storageBucket: "molerpro.firebasestorage.app",
    messagingSenderId: "997184398110",
    appId: "1:997184398110:web:1fd7260e71ba388dc45f0f"
  };

  // Initialize Firebase
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
    } else {
      console.log('Firebase already initialized');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    showToast('Greška pri inicijalizaciji Firebase: ' + error.message, 'error');
    return;
  }
  
  const auth = firebase.auth();
  const db = firebase.database();

  // App state
  let currentUser = null;
  let userData = { projekti: [], klijenti: [], rashodi: [], materijal: [], postavke: {} };
  let currentYear = new Date().getFullYear();
  let currentTheme = 'light';
  let currentPage = 'dashboard';

  // Auth functions
  function handleLogin(e) {
    e.preventDefault();
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    
    if (!emailEl || !passEl) {
      console.error('Login elements not found');
      return;
    }
    
    const email = emailEl.value;
    const pass = passEl.value;
    
    console.log('Attempting login with:', email);
    
    auth.signInWithEmailAndPassword(email, pass)
      .then((userCredential) => {
        console.log('Login successful:', userCredential.user);
        if (errorEl) errorEl.style.display = 'none';
      })
      .catch((err) => {
        console.error('Login error:', err);
        let errorMessage = 'Greska pri prijavi';
        
        switch(err.code) {
          case 'auth/user-not-found':
            errorMessage = 'Korisnik nije pronađen';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Pogrešna lozinka';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Neispravan email';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Korisnički nalog je onemogućen';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Previše pokušaja, pokušajte kasnije';
            break;
          default:
            errorMessage = 'Greska: ' + err.message;
        }
        
        if (errorEl) {
          errorEl.textContent = errorMessage;
          errorEl.style.display = 'block';
        } else {
          alert(errorMessage);
        }
      });
  }

  function handleRegister(e) {
    e.preventDefault();
    const emailEl = document.getElementById('reg-email');
    const passEl = document.getElementById('reg-password');
    const pass2El = document.getElementById('reg-password2');
    const errorEl = document.getElementById('reg-error');
    
    if (!emailEl || !passEl || !pass2El) {
      console.error('Register elements not found');
      return;
    }
    
    const email = emailEl.value;
    const pass = passEl.value;
    const pass2 = pass2El.value;
    
    if (pass.length < 6) {
      const msg = 'Lozinka mora imati najmanje 6 znakova';
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      } else {
        alert(msg);
      }
      return;
    }
    
    if (pass !== pass2) {
      const msg = 'Lozinke se ne poklapaju';
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      } else {
        alert(msg);
      }
      return;
    }
    
    console.log('Attempting registration with:', email);
    
    auth.createUserWithEmailAndPassword(email, pass)
      .then((userCredential) => {
        console.log('Registration successful:', userCredential.user);
        if (errorEl) errorEl.style.display = 'none';
      })
      .catch((err) => {
        console.error('Registration error:', err);
        let errorMessage = 'Greska pri registraciji';
        
        switch(err.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email je već u upotrebi';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Neispravan email';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Registracija nije dozvoljena';
            break;
          case 'auth/weak-password':
            errorMessage = 'Lozinka je preslaba';
            break;
          default:
            errorMessage = 'Greska: ' + err.message;
        }
        
        if (errorEl) {
          errorEl.textContent = errorMessage;
          errorEl.style.display = 'block';
        } else {
          alert(errorMessage);
        }
      });
  }

  function handleLogout() { auth.signOut(); }

  function showLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => { if(t) t.classList.remove('active'); });
    document.querySelectorAll('.login-form').forEach(f => { if(f) f.classList.remove('active'); });
    const tabEl = document.querySelector('.login-tab[data-tab="' + tab + '"]');
    const formEl = document.getElementById(tab + '-form');
    if (tabEl) tabEl.classList.add('active');
    if (formEl) formEl.classList.add('active');
  }

  function onAuthStateChanged(user) {
    currentUser = user;
    const authScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('main-app');
    const userDisplay = document.getElementById('user-display');
    if (!authScreen || !appScreen) return;
    if (user) {
      if (userDisplay) userDisplay.textContent = user.email;
      loadUserData();
      authScreen.style.display = 'none';
      appScreen.style.display = 'block';
    } else {
      if (userDisplay) userDisplay.textContent = '';
      authScreen.style.display = 'flex';
      appScreen.style.display = 'none';
    }
  }

  // Data functions - Realtime Database
  let userDataListener = null;
  
  function loadUserData() {
    // Očisti prethodni listener ako postoji
    if (userDataListener && currentUser) {
      db.ref('users/' + currentUser.uid).off('value', userDataListener);
    }
    
    userDataListener = db.ref('users/' + currentUser.uid).on('value', (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          userData = { projekti: data.projekti || [], klijenti: data.klijenti || [], rashodi: data.rashodi || [], materijal: data.materijal || [], postavke: data.postavke || {} };
          currentTheme = userData.postavke.theme || 'light';
          applyTheme();
          renderYearTabs();
          navigateTo(currentPage);
        } else {
          userData = { projekti: [], klijenti: [], rashodi: [], materijal: [], postavke: {} };
          renderYearTabs();
          navigateTo(currentPage);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    }, (err) => {
      console.error('Firebase error loading data:', err);
      alert('Greška pri učitavanju podataka. Provjerite internet vezu.', 'error');
    });
  }

  function saveUserData() {
    if (!currentUser) return;
    db.ref('users/' + currentUser.uid).set(userData)
      .catch((err) => {
        console.error('Error saving user data:', err);
        showToast('Greška pri čuvanju podataka. Pokušajte ponovo.', 'error');
      });
  }

  // Navigation - FIXED: use data-page attribute
  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => { if(p) p.style.display = 'none'; });
    const targetPage = document.getElementById('pg-' + page);
    if (targetPage) targetPage.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => { if(n) n.classList.remove('active'); });
    const navBtn = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (navBtn) navBtn.classList.add('active');
    if (page === 'dashboard') renderDashboard();
    if (page === 'projekti') renderProjekti();
    if (page === 'klijenti') renderKlijenti();
    if (page === 'rashodi') renderRashodi();
    if (page === 'materijal') renderMaterijal();
    if (page === 'postavke') renderPostavke();
  }

  // Year tabs
  function renderYearTabs() {
    const years = [currentYear];
    if (userData.projekti && userData.projekti.length > 0) {
      const projektYears = userData.projekti.map(p => new Date(p.datum).getFullYear());
      years.push(...projektYears);
    }
    const uniqueYears = [...new Set(years)].sort((a,b) => b-a);
    const yearTabsEl = document.getElementById('year-tabs');
    if (yearTabsEl) {
      yearTabsEl.innerHTML = uniqueYears.map(y => 
        '<button class="year-tab ' + (y === currentYear ? 'active' : '') + '" onclick="selectYear(' + y + ')">' + y + '</button>'
      ).join('');
    }
  }

  // showPage is alias for navigateTo
  function showPage(page) { navigateTo(page); }

  function selectYear(year) {
    currentYear = year;
    renderYearTabs();
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'projekti') renderProjekti();
  }

  // Theme
  function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    userData.postavke.theme = currentTheme;
    applyTheme();
    saveUserData();
  }

  function applyTheme() {
    if (currentTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    }
  }

  // Dashboard
  function renderDashboard() {
    const yearProjekti = userData.projekti.filter(p => new Date(p.datum).getFullYear() === currentYear);
    const yearRashodi = userData.rashodi.filter(r => new Date(r.datum).getFullYear() === currentYear);
    const ukupnoPrihodi = yearProjekti.reduce((s, p) => s + (parseFloat(p.cijena) || 0), 0);
    const ukupnoRashodi = yearRashodi.reduce((s, r) => s + (parseFloat(r.iznos) || 0), 0);
    const profit = ukupnoPrihodi - ukupnoRashodi;
    const placeno = yearProjekti.filter(p => p.placeno).reduce((s, p) => s + (parseFloat(p.cijena) || 0), 0);
    const neplaceno = ukupnoPrihodi - placeno;
    const zavrseni = yearProjekti.filter(p => p.status === 'zavrsen').length;
    const uTijeku = yearProjekti.filter(p => p.status === 'u_tijeku').length;
    
    const elements = {
      'dash-prihodi': ukupnoPrihodi.toFixed(2) + ' KM',
      'dash-rashodi': ukupnoRashodi.toFixed(2) + ' KM',
      'dash-profit': profit.toFixed(2) + ' KM',
      'dash-placeno': placeno.toFixed(2) + ' KM',
      'dash-neplaceno': neplaceno.toFixed(2) + ' KM',
      'dash-projekata': yearProjekti.length,
      'dash-zavrseni': zavrseni,
      'dash-utijeku': uTijeku
    };
    
    Object.keys(elements).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = elements[id];
    });
    
    // Prikaz najnovijih projekata
    renderRecentProjects();
    
    // Prikaz upozorenja
    renderWarnings();
  }

  function renderRecentProjects() {
    const container = document.getElementById('recent-projects');
    if (!container) return;
    
    const recentProjekti = userData.projekti
      .sort((a, b) => new Date(b.datum) - new Date(a.datum))
      .slice(0, 5);
    
    if (recentProjekti.length === 0) {
      container.innerHTML = '<p style="color: var(--text2); text-align: center; padding: 20px;">Nema projekata</p>';
      return;
    }
    
    const projectsHtml = recentProjekti.map(p => {
      const klijent = userData.klijenti.find(k => k.id === p.klijentId) || { ime: 'Nepoznato' };
      const statusClass = p.status === 'zavrsen' ? 'status-zavrsen' : 'status-u_tijeku';
      const statusText = p.status === 'zavrsen' ? 'Završen' : 'U tijeku';
      
      return `
        <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: between; align-items: center; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--text);">${klijent.ime}</div>
            <div style="font-size: 0.85em; color: var(--text2);">${p.datum} • ${p.adresa || 'Bez adrese'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; color: var(--accent);">${(parseFloat(p.cijena) || 0).toFixed(2)} KM</div>
            <div class="${statusClass}" style="font-size: 0.75em; padding: 2px 6px; border-radius: 4px; margin-top: 4px;">${statusText}</div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = projectsHtml;
  }

  function renderWarnings() {
    const container = document.getElementById('warnings');
    if (!container) return;
    
    const warnings = [];
    
    // Neplaćeni projekti
    const neplaceniProjekti = userData.projekti.filter(p => !p.placeno && p.status === 'zavrsen');
    if (neplaceniProjekti.length > 0) {
      warnings.push({
        type: 'danger',
        text: `${neplaceniProjekti.length} završenih projekata nije plaćeno`
      });
    }
    
    // Niske zalihe SAMO alata (ne materijala)
    const alat = userData.materijal.filter(m => m.kategorija === 'Alat');
    const niskeZaliheAlata = alat.filter(m => parseFloat(m.kolicina) <= parseFloat(m.min));
    if (niskeZaliheAlata.length > 0) {
      warnings.push({
        type: 'warning',
        text: `${niskeZaliheAlata.length} alata/opreme ima niske zalihe`
      });
    }
    
    // Projekti u tijeku duže od 30 dana
    const stariProjekti = userData.projekti.filter(p => {
      if (p.status !== 'u_tijeku') return false;
      const daysDiff = (new Date() - new Date(p.datum)) / (1000 * 60 * 60 * 24);
      return daysDiff > 30;
    });
    if (stariProjekti.length > 0) {
      warnings.push({
        type: 'info',
        text: `${stariProjekti.length} projekata je u tijeku duže od 30 dana`
      });
    }
    
    if (warnings.length === 0) {
      container.innerHTML = '<p style="color: var(--text2); text-align: center; padding: 20px;">Nema upozorenja</p>';
      return;
    }
    
    const warningsHtml = warnings.map(w => {
      const bgColor = w.type === 'danger' ? 'var(--red)' : w.type === 'warning' ? 'var(--orange)' : 'var(--accent)';
      return `
        <div style="padding: 12px; background: ${bgColor}20; border-left: 4px solid ${bgColor}; border-radius: 4px; margin-bottom: 8px; color: var(--text);">
          <div style="font-weight: 600; margin-bottom: 4px;">⚠️ Upozorenje</div>
          <div style="font-size: 0.9em;">${w.text}</div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = warningsHtml;
  }

  function renderChart(projekti, rashodi) {
    const canvasEl = document.getElementById('chart-canvas');
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    
    // Mobilna optimizacija - manji chart na telefonu
    const isMobile = window.innerWidth <= 768;
    const chartHeight = isMobile ? 200 : 300;
    canvasEl.height = chartHeight;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const prihodi = months.map((_, i) => projekti.filter(p => new Date(p.datum).getMonth() === i).reduce((s, p) => s + (parseFloat(p.cijena) || 0), 0));
    const rash = months.map((_, i) => rashodi.filter(r => new Date(r.datum).getMonth() === i).reduce((s, r) => s + (parseFloat(r.iznos) || 0), 0));
    
    if (window.myChart) window.myChart.destroy();
    
    window.myChart = new Chart(ctx, {
      type: isMobile ? 'line' : 'bar', // Line chart za mobilni, bar za desktop
      data: { 
        labels: months, 
        datasets: [
          { 
            label: 'Prihodi', 
            data: prihodi, 
            backgroundColor: isMobile ? 'rgba(79, 70, 229, 0.2)' : '#4f46e5',
            borderColor: '#4f46e5',
            borderWidth: 2,
            tension: 0.4,
            fill: isMobile
          }, 
          { 
            label: 'Rashodi', 
            data: rash, 
            backgroundColor: isMobile ? 'rgba(239, 68, 68, 0.2)' : '#ef4444',
            borderColor: '#ef4444',
            borderWidth: 2,
            tension: 0.4,
            fill: isMobile
          }
        ] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            position: isMobile ? 'bottom' : 'top',
            labels: {
              boxWidth: 12,
              padding: isMobile ? 10 : 20,
              font: {
                size: isMobile ? 11 : 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' KM';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + ' KM';
              },
              font: {
                size: isMobile ? 10 : 11
              }
            },
            grid: {
              display: !isMobile
            }
          },
          x: {
            ticks: {
              font: {
                size: isMobile ? 10 : 11
              }
            },
            grid: {
              display: !isMobile
            }
          }
        }
      }
    });
  }

  // Projekti
  function renderProjekti() {
    const searchEl = document.getElementById('proj-search');
    const tblEl = document.getElementById('tbl-projekti');
    if (!searchEl || !tblEl) return;
    
    const search = searchEl.value.toLowerCase();
    const yearProjekti = userData.projekti.filter(p => new Date(p.datum).getFullYear() === currentYear);
    const filtered = yearProjekti.filter(p => !search || (p.klijent && p.klijent.toLowerCase().includes(search)) || (p.adresa && p.adresa.toLowerCase().includes(search))).sort((a, b) => new Date(b.datum) - new Date(a.datum));
    tblEl.innerHTML = filtered.map((p, i) => {
      const klijent = userData.klijenti.find(k => k.id === p.klijentId) || { ime: p.klijent || 'Nepoznato' };
      const idx = userData.projekti.indexOf(p);
      let statusClass, statusText;
      
      switch(p.status) {
        case 'dogovoren':
          statusClass = 'status-u_tijeku';
          statusText = 'Dogovoren';
          break;
        case 'u_tijeku':
          statusClass = 'status-u_tijeku';
          statusText = 'U tijeku';
          break;
        case 'zavrsen':
          statusClass = 'status-zavrsen';
          statusText = 'Završen';
          break;
        default:
          statusClass = 'status-u_tijeku';
          statusText = 'Nepoznato';
      }
      
      // Sanitizacija korisničkog inputa da spriječimo XSS
      const safeIme = sanitizeHTML(klijent.ime);
      const safeAdresa = sanitizeHTML(p.adresa || '');
      const safeDatum = sanitizeHTML(p.datum);
      
      return '<tr><td>' + safeDatum + '</td><td>' + safeIme + '</td><td>' + safeAdresa + '</td><td>' + (p.m2 || '') + ' m²</td><td>' + (parseFloat(p.cijena) || 0).toFixed(2) + ' KM</td><td><span class="' + statusClass + '" style="cursor: pointer; padding: 4px 8px; border-radius: 4px;" onclick="toggleStatus(' + idx + ')" title="Klikni za promjenu">' + statusText + '</span></td><td><button class="btn-small" onclick="togglePaid(' + idx + ')" title="Označi kao plaćeno/neplaćeno" style="font-size: 1.1em; background: ' + (p.placeno ? '#22c55e' : 'transparent') + '; border: 1px solid ' + (p.placeno ? '#22c55e' : '#666') + '; border-radius: 4px; padding: 4px 8px; cursor: pointer;">' + (p.placeno ? '💰' : '❌') + '</button></td><td><button class="btn-small" onclick="editProjekt(' + idx + ')">✏️</button> <button class="btn-small" onclick="deleteProjekt(' + idx + ')">🗑️</button></td></tr>';
    }).join('');
  }

  function openProjektModal(index = null) {
    const projekt = index !== null ? userData.projekti[index] : null;
    const klijenti = userData.klijenti || [];
    
    // Detalji klijenta
    let klijentOptions = '';
    if (klijenti.length > 0) {
      klijentOptions = klijenti.map(k => 
        `<option value="${k.id}">${sanitizeHTML(k.ime)}</option>`
      ).join('');
    } else {
      klijentOptions = '<option value="">Nema klijenata</option>';
    }
    
    // Podaci za formu
    const vrstePosla = projekt ? projekt.vrstePosla : [];
    const defaultPlafon = projekt ? projekt.plafon : (userData.postavke?.autoPlafon || false);
    
    // RED 1: NASLOV I KLIJENT - NAJVAŽNIJE
    let html = '<h3 style="font-size: var(--primary-font); margin-bottom: 20px; color: var(--accent); font-weight: 700;">' + (projekt ? '✏️ Uredi projekt' : '➕ Novi projekt') + '</h3>';
    html += '<form onsubmit="saveProjekt(event, ' + index + ')" class="form-grid">';
    
    // SEKCIJA 1: KLJENT I DATUM - PRIORITET 1
    html += '<div style="background: var(--bg3); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">';
    html += '<div style="display: flex; gap: 12px; margin-bottom: 12px;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 6px; font-weight: 600;">👤 Klijent:</div>';
    html += '<select name="klijentId" id="klijent-select" onchange="toggleNewKlijent()" style="width: 100%; padding: 12px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--primary-font);"><option value="">Izaberite klijenta...</option><option value="new">+ Novi klijent</option>' + klijentOptions + '</select>';
    html += '</div>';
    html += '<div style="flex: 0 0 120px;">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 6px; font-weight: 600;">📅 Datum:</div>';
    html += '<input type="date" name="datum" value="' + (projekt ? projekt.datum : new Date().toISOString().split('T')[0]) + '" required style="width: 100%; padding: 12px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--primary-font);">';
    html += '</div>';
    html += '</div>';
    
    // POLJA ZA NOVOG KLIJENTA - PRIORITET 1
    html += '<div id="new-klijent-fields" style="display: none; background: var(--bg3); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">';
    html += '<div style="display: flex; gap: 12px; margin-bottom: 12px;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 6px; font-weight: 600;">👤 Ime klijenta:</div>';
    html += '<input type="text" id="new-klijent-ime" placeholder="Unesite ime klijenta..." style="width: 100%; padding: 12px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--primary-font);">';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 6px; font-weight: 600;">📞 Telefon:</div>';
    html += '<input type="text" id="new-klijent-telefon" placeholder="Unesite telefon..." style="width: 100%; padding: 12px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--primary-font);">';
    html += '</div>';
    html += '</div>';
    html += '<div style="display: flex; gap: 12px;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 6px; font-weight: 600;">🏠 Adresa:</div>';
    html += '<input type="text" id="new-klijent-adresa" placeholder="Unesite adresu..." style="width: 100%; padding: 12px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--primary-font);">';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // SEKCIJA 2: VRSTE POSLA - PRIORITET 1
    html += '<div style="background: var(--bg3); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 12px; font-weight: 600;">🔧 Vrste posla:</div>';
    html += '<div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">';
    const vrste = ['krecenje', 'gletovanje', 'lajsne', 'kitovanje', 'brusenje', 'grunt', 'fasada', 'gips'];
    const labels = {krecenje: '🎨 Krečenje', gletovanje: '🔧 Gletovanje', lajsne: '📐 Lajsne', kitovanje: '🪣 Kitovanje', brusenje: '⚡ Brušenje', grunt: '🧱 Grunt', fasada: '🏠 Fasada', gips: '📋 Gips'};
    vrste.forEach(vrsta => {
      const checked = vrstePosla.includes(vrsta) ? 'checked' : '';
      html += '<label style="display: flex; align-items: center; gap: 6px; font-size: var(--secondary-font); cursor: pointer; background: ' + (vrstePosla.includes(vrsta) ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vrstePosla.includes(vrsta) ? 'white' : 'var(--text)') + '; padding: 8px 12px; border-radius: 8px; border: 2px solid ' + (vrstePosla.includes(vrsta) ? 'var(--accent)' : 'var(--border)') + '; transition: all 0.3s ease;"><input type="checkbox" name="vp_' + vrsta + '" ' + checked + ' onchange="izracunajCijenuPoVrstama()" style="margin-right: 4px;"> ' + labels[vrsta] + '</label>';
    });
    html += '</div></div>';
    
    // SEKCIJA 3: LOKACIJA I TIP - SAMO ZA NOVOG KLIJENTA
    // Provjeri da li je odabran novi klijent
    const isNewKlijent = klijentOptions === '' || projekt?.klijentId === 'new';
    
    if (isNewKlijent) {
      html += '<div style="display: flex; gap: 16px; margin-bottom: 16px;">';
      html += '<div style="flex: 2;">';
      html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 6px; font-weight: 600;">📍 Adresa:</div>';
      html += '<input type="text" name="adresa" value="' + (projekt ? projekt.adresa || '' : '') + '" placeholder="Ulica i broj, grad..." style="width: 100%; padding: 12px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--primary-font);">';
      html += '</div>';
      html += '<div style="flex: 1;">';
      html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 6px; font-weight: 600;">🏷️ Tip posla:</div>';
      html += '<select name="tipPosla" onchange="updateCijenaPoTipu()" style="width: 100%; padding: 12px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--primary-font);"><option value="molerski" ' + ((projekt?.tipPosla || 'molerski') === 'molerski' ? 'selected' : '') + '>🎨 Molerski</option><option value="fasaderski" ' + ((projekt?.tipPosla || 'molerski') === 'fasaderski' ? 'selected' : '') + '>🏠 Fasaderski</option></select>';
      html += '</div>';
      html += '</div>';
    }
    
    // SEKCIJA 4: DIMENZIJE - PRIORITET 2
    html += '<div style="background: var(--bg3); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 12px; font-weight: 600;">📐 Dimenzije prostorije:</div>';
    html += '<div style="display: flex; gap: 12px; margin-bottom: 8px;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Dužina (m):</div>';
    html += '<input type="number" name="duzina" value="' + (projekt ? projekt.duzina || '' : '') + '" placeholder="7.0" step="0.1" oninput="izracunajPovrsine()" style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Širina (m):</div>';
    html += '<input type="number" name="sirina" value="' + (projekt ? projekt.sirina || '' : '') + '" placeholder="7.0" step="0.1" oninput="izracunajPovrsine()" style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Kvadratura poda:</div>';
    html += '<input type="number" name="kvadraturaStana" value="' + (projekt ? projekt.kvadraturaStana || projekt.m2 : '') + '" placeholder="49" step="0.1" oninput="izracunajPovrsine()" style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    html += '</div></div>';
    
    // SEKCIJA 5: POVRSINE - PRIORITET 2
    html += '<div style="background: var(--bg3); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 12px; font-weight: 600;">📏 Površine za rad:</div>';
    html += '<div style="display: flex; gap: 12px; margin-bottom: 8px;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Površina zidova:</div>';
    html += '<input type="number" name="m2zidovi" value="' + (projekt ? projekt.m2zidovi || '' : '') + '" placeholder="72.8" step="0.1" oninput="izracunajUkupno()" style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Plafon:</div>';
    html += '<input type="checkbox" name="plafon" id="plafon-checkbox" ' + (defaultPlafon ? 'checked' : '') + ' onchange="izracunajUkupno()" style="margin-right: 8px;">';
    html += '<label for="plafon-checkbox" style="font-size: var(--secondary-font); color: var(--text); cursor: pointer;">+ Plafon</label>';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Otvori (m²):</div>';
    html += '<input type="number" name="otvoriOdbiti" value="' + (projekt ? projekt.otvoriOdbiti || 0 : 0) + '" placeholder="0" step="0.1" oninput="izracunajPovrsine()" style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    html += '</div></div>';
    
    // SEKCIJA 6: CIJENA I TROŠKOVI - PRIORITET 1
    html += '<div style="background: var(--bg3); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">';
    html += '<div style="font-size: var(--primary-font); color: var(--text); margin-bottom: 12px; font-weight: 600;">💰 Cijena i troškovi:</div>';
    html += '<div style="display: flex; gap: 12px; margin-bottom: 8px; align-items: flex-end;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Cijena/m²:</div>';
    html += '<input type="number" name="cijenaPoM2" id="cijena-po-m2" value="' + (projekt ? projekt.cijenaPoM2 : '12') + '" step="0.01" oninput="izracunajUkupno()" style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 4px;">Troškovi:</div>';
    html += '<input type="number" name="troskoviMaterijali" value="' + (projekt ? projekt.troskoviMaterijali : 0) + '" step="0.01" oninput="izracunajUkupno()" style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    html += '<div style="flex: 1; background: var(--accent); padding: 12px; border-radius: 8px; color: white; text-align: center; border: 2px solid var(--accent);">';
    html += '<div style="font-size: var(--secondary-font); opacity: 0.9; margin-bottom: 4px;">UKUPNO</div>';
    html += '<div style="font-size: var(--primary-font); font-weight: 600;"><span id="cijena-total">0</span> KM</div>';
    html += '<div style="font-size: var(--meta-font); opacity: 0.8;" id="povrsina-total">0 m²</div>';
    html += '</div>';
    html += '</div></div>';
    
    // SEKCIJA 7: NAPOMENA - NAJMANJI PRIORITET
    html += '<div style="background: var(--bg3); padding: 12px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">';
    html += '<div style="font-size: var(--secondary-font); color: var(--text2); margin-bottom: 6px; font-weight: 500;">📝 Napomena:</div>';
    html += '<input type="text" name="napomena" value="' + (projekt ? projekt.napomena || '' : '') + '" placeholder="Dodatne informacije o projektu..." style="width: 100%; padding: 10px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: var(--secondary-font);">';
    html += '</div>';
    
    // SEKCIJA 8: DUGMADI - PRIORITET 1
    html += '<div style="display: flex; gap: 12px; justify-content: flex-end;">';
    html += '<button type="button" onclick="closeModal()" style="padding: 12px 24px; background: var(--bg2); border: 2px solid var(--border); border-radius: 8px; color: var(--text); cursor: pointer; font-size: var(--secondary-font); font-weight: 500; transition: all 0.3s ease;">❌ Otkaži</button>';
    html += '<button type="submit" style="padding: 12px 24px; background: var(--accent); border: none; border-radius: 8px; color: white; cursor: pointer; font-size: var(--primary-font); font-weight: 600; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); transition: all 0.3s ease;">✅ ' + (projekt ? 'Sačuvaj' : 'Kreiraj') + '</button>';
    html += '</div></form>';
    
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
    
    // Dodaj event listener za plafon checkbox
    const plafonCheckbox = document.querySelector('input[name="plafon"]');
    const plafonLabel = document.getElementById('plafon-label');
    
    if (plafonCheckbox && plafonLabel) {
      plafonCheckbox.addEventListener('change', function() {
        if (this.checked) {
          plafonLabel.style.background = 'var(--accent)';
          plafonLabel.style.color = 'white';
          plafonLabel.style.borderColor = 'var(--accent)';
        } else {
          plafonLabel.style.background = 'var(--bg2)';
          plafonLabel.style.color = 'var(--text)';
          plafonLabel.style.borderColor = 'var(--border)';
        }
      });
    }
    
    if (projekt) {
      setTimeout(() => izracunajUkupno(), 50);
    } else {
      // Za nove projekte, izračunaj površine odmah
      setTimeout(() => izracunajPovrsine(), 50);
    }
  }

  // Funkcija za računanje cijene na osnovu odabranih vrsta posla iz postavki
  function izracunajCijenuPoVrstama() {
    const postavke = userData.postavke || {};
    
    // Čitaj checkbox-ove i ažuriraj boje labela
    const vrsteMap = {
      'vp_krecenje': 'krecenje',
      'vp_gletovanje': 'gletovanje',
      'vp_lajsne': 'lajsne',
      'vp_kitovanje': 'kitovanje',
      'vp_brusenje': 'brusenje',
      'vp_grunt': 'grunt',
      'vp_fasada': 'fasada',
      'vp_gips': 'gips'
    };
    
    let ukupnaCijena = 0;
    let brojVrsta = 0;
    
    for (const [checkboxName, vrsta] of Object.entries(vrsteMap)) {
      const checkbox = document.querySelector(`input[name="${checkboxName}"]`);
      const label = checkbox?.closest('label');
      
      if (checkbox && checkbox.checked) {
        brojVrsta++;
        // Promijeni boju na označeno (accent)
        if (label) {
          label.style.background = 'var(--accent)';
          label.style.color = 'white';
          label.style.border = '1px solid var(--accent)';
        }
        // Dodaj cijenu za ovu vrstu iz postavki
        switch(vrsta) {
          case 'krecenje': ukupnaCijena += postavke.cijenaKrecenje || 12; break;
          case 'gletovanje': ukupnaCijena += postavke.cijenaGletovanje || 14; break;
          case 'lajsne': ukupnaCijena += postavke.cijenaLajsne || 8; break;
          case 'kitovanje': ukupnaCijena += postavke.cijenaKitovanje || 10; break;
          case 'brusenje': ukupnaCijena += postavke.cijenaBrusenje || 11; break;
          case 'grunt': ukupnaCijena += postavke.cijenaGrunt || 9; break;
          case 'fasada': ukupnaCijena += postavke.cijenaFasada || 16; break;
          case 'gips': ukupnaCijena += postavke.cijenaGips || 18; break;
        }
      } else {
        // Vrati boju na normalu kada nije označeno
        if (label) {
          label.style.background = 'var(--bg2)';
          label.style.color = 'var(--text)';
          label.style.border = '1px solid transparent';
        }
      }
    }
    
    // Ako nije odabrana nijedna vrsta, koristi default cijenu za krečenje
    const finalCijena = brojVrsta > 0 ? ukupnaCijena : (postavke.cijenaKrecenje || 12);
    
    // Imena vrsta za prikaz
    const imenaVrsta = {
      'krecenje': '🎨 Krečenje',
      'gletovanje': '🔧 Gletovanje',
      'lajsne': '📐 Lajsne',
      'kitovanje': '🪣 Kitovanje',
      'brusenje': '⚡ Brušenje',
      'grunt': '🧱 Grunt',
      'fasada': '🏠 Fasada',
      'gips': '📋 Gips'
    };
    
    // Sakupi imena odabranih vrsta
    const odabraneVrste = [];
    for (const [checkboxName, vrsta] of Object.entries(vrsteMap)) {
      const checkbox = document.querySelector(`input[name="${checkboxName}"]`);
      if (checkbox && checkbox.checked) {
        odabraneVrste.push(imenaVrsta[vrsta]);
      }
    }
    
    // Prikazi odabrane vrste
    const odabraneEl = document.getElementById('odabrane-vrste');
    if (odabraneEl) {
      odabraneEl.textContent = odabraneVrste.length > 0 
        ? 'Odabrano: ' + odabraneVrste.join(' + ')
        : 'Nijedna vrsta posla nije odabrana';
    }
    
    const cijenaInput = document.getElementById('cijena-po-m2');
    if (cijenaInput) {
      cijenaInput.value = finalCijena.toFixed(2);
      izracunajUkupno();
    }
  }

  // Funkcija za ažuriranje cijene kada se promijeni tip posla (zastarjela, ali zadržana za kompatibilnost)
  function updateCijenaPoTipu() {
    izracunajCijenuPoVrstama();
  }

  // Funkcija za toggle vrste posla (vizualni button-i)
  function toggleVrstaPosla(button, vrstaKey) {
    const checkbox = document.querySelector(`input[name="vp_${vrstaKey}"]`);
    console.log('Toggle vrsta:', vrstaKey, 'Checkbox found:', !!checkbox);
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      console.log('Checkbox checked:', checkbox.checked);
      
      // Ažuriraj izgled button-a
      const odabrano = checkbox.checked;
      button.style.background = odabrano ? 'var(--accent)' : 'var(--bg2)';
      button.style.color = odabrano ? 'white' : 'var(--text)';
      button.style.borderColor = odabrano ? 'var(--accent)' : '#333';
      
      // Pozovi izračun cijene
      izracunajCijenuPoVrstama();
    }
  }

  function saveProjekt(e, index) {
    e.preventDefault();
    const f = e.target;
    
    // Ako je odabran novi klijent, kreiraj ga prvo
    if (f.klijentId.value === 'new') {
      const ime = document.getElementById('new-klijent-ime').value.trim();
      const telefon = document.getElementById('new-klijent-telefon').value.trim();
      const adresa = document.getElementById('new-klijent-adresa').value.trim();
      
      if (!ime) {
        showToast('Unesite ime novog klijenta!', 'error');
        return;
      }
      
      const noviKlijent = {
        id: Date.now().toString(),
        ime: ime,
        telefon: telefon,
        adresa: adresa
      };
      
      userData.klijenti.push(noviKlijent);
      klijentId = noviKlijent.id;
    }
    
    // Sakrij polja za novog klijenta
    const newFields = document.getElementById('new-klijent-fields');
    if (newFields) {
      newFields.style.display = 'none';
      document.getElementById('new-klijent-ime').required = false;
    }
    
    // Sakupi sve označene vrste posla iz checkbox-ova
    const vrstePosla = [];
    const vrsteMap = {
      'vp_krecenje': 'krecenje',
      'vp_gletovanje': 'gletovanje',
      'vp_lajsne': 'lajsne',
      'vp_kitovanje': 'kitovanje',
      'vp_brusenje': 'brusenje',
      'vp_grunt': 'grunt',
      'vp_fasada': 'fasada',
      'vp_gips': 'gips'
    };
    
    for (const [checkboxName, vrsta] of Object.entries(vrsteMap)) {
      const checkbox = f[checkboxName];
      if (checkbox && checkbox.checked) {
        vrstePosla.push(vrsta);
      }
    }
    
    // Rukovanje novog klijenta
    if (klijentId === 'new') {
      const ime = document.getElementById('new-klijent-ime')?.value?.trim() || '';
      const telefon = document.getElementById('new-klijent-telefon')?.value?.trim() || '';
      const adresa = document.getElementById('new-klijent-adresa')?.value?.trim() || '';
      
      if (!ime) {
        showToast('Unesite ime novog klijenta!', 'error');
        return;
      }
      
      // Kreiraj novog klijenta
      const noviKlijent = {
        id: Date.now().toString(),
        ime: ime,
        telefon: telefon,
        adresa: adresa
      };
      
      userData.klijenti.push(noviKlijent);
      klijentId = noviKlijent.id;
      
      // Očisti polja za novog klijenta
      document.getElementById('new-klijent-ime').value = '';
      document.getElementById('new-klijent-telefon').value = '';
      document.getElementById('new-klijent-adresa').value = '';
      document.getElementById('new-klijent-fields').style.display = 'none';
      
      // Ažuriraj dropdown sa novim klijentom
      const select = document.getElementById('klijent-select');
      if (select) {
        // Ukloni postojeće opcije osim "+ Novi klijent"
        while (select.options.length > 1) {
          select.remove(1);
        }
        
        // Dodaj novog klijenta kao prvu opciju nakon "+ Novi klijent"
        const novaOpcija = new Option(sanitizeHTML(noviKlijent.ime), noviKlijent.id);
        select.add(novaOpcija, 1);
        select.value = noviKlijent.id;
        
        // Sakrij polja za novog klijenta
        document.getElementById('new-klijent-fields').style.display = 'none';
      }
      
      showToast('Novi klijent kreiran!', 'success');
    }
    
    const projekt = {
      klijentId: klijentId,
      datum: f.datum.value,
      vrstePosla: vrstePosla,
      duzina: parseFloat(f.duzina?.value) || 0,
      sirina: parseFloat(f.sirina?.value) || 0,
      kvadraturaStana: parseFloat(f.kvadraturaStana?.value) || 0,
      m2zidovi: parseFloat(f.m2zidovi?.value) || 0,
      plafon: f.plafon?.checked || false,
      otvoriOdbiti: parseFloat(f.otvoriOdbiti?.value) || 0,
      m2: (parseFloat(f.m2zidovi?.value) || 0) + (f.plafon?.checked ? (parseFloat(f.kvadraturaStana?.value) || 0) : 0),
      cijenaPoM2: parseFloat(f.cijenaPoM2.value) || 0,
      cijena: ((parseFloat(f.m2zidovi?.value) || 0) + (f.plafon?.checked ? (parseFloat(f.kvadraturaStana?.value) || 0) : 0)) * (parseFloat(f.cijenaPoM2.value) || 0),
      troskoviMaterijali: parseFloat(f.troskoviMaterijali?.value) || 0,
      troskoviPrevoz: parseFloat(f.troskoviPrevoz?.value) || 0,
      troskoviAlat: parseFloat(f.troskoviAlat?.value) || 0,
      adresa: f.adresa?.value || '',
      status: f.status?.value || 'dogovoren',
      placeno: f.placeno?.checked || false,
      napomena: f.napomena?.value || ''
    };
    
    if (index !== null) {
      userData.projekti[index] = projekt;
    } else {
      userData.projekti.push(projekt);
    }
    
    saveUserData();
    closeModal();
    renderProjekti();
    renderKlijenti();
  }

  function toggleNewKlijent() {
    const select = document.getElementById('klijent-select');
    const newFields = document.getElementById('new-klijent-fields');
    const imeInput = document.getElementById('new-klijent-ime');
    
    if (!select || !newFields || !imeInput) return;
    
    if (select.value === 'new') {
      newFields.style.display = 'block';
      imeInput.required = true;
    } else {
      newFields.style.display = 'none';
      imeInput.required = false;
    }
  }

  function editProjekt(index) { 
    if (index >= 0 && index < userData.projekti.length) {
      openProjektModal(index); 
    }
  }
  function deleteProjekt(index) { 
    if (index >= 0 && index < userData.projekti.length && confirm('Obrisi projekt?')) { 
      userData.projekti.splice(index, 1); 
      saveUserData(); 
      renderProjekti(); 
    } 
  }
  function toggleNewKlijent() {
    const select = document.getElementById('klijent-select');
    const newFields = document.getElementById('new-klijent-fields');
    const imeInput = document.getElementById('new-klijent-ime');
    
    if (select && newFields) {
      if (select.value === 'new') {
        newFields.style.display = 'block';
        if (imeInput) imeInput.focus();
      } else {
        newFields.style.display = 'none';
      }
    }
  }

  function togglePaid(index) { 
    if (index >= 0 && index < userData.projekti.length) {
      userData.projekti[index].placeno = !userData.projekti[index].placeno; 
      saveUserData(); 
      renderProjekti(); 
    }
  }
  function toggleStatus(index) { 
    if (index >= 0 && index < userData.projekti.length) {
      userData.projekti[index].status = userData.projekti[index].status === 'zavrsen' ? 'u_tijeku' : 'zavrsen'; 
      saveUserData(); 
      renderProjekti(); 
    }
  }

  function izracunajPovrsine() {
    const duzina = parseFloat(document.querySelector('input[name="duzina"]')?.value) || 0;
    const sirina = parseFloat(document.querySelector('input[name="sirina"]')?.value) || 0;
    const kvadratura = parseFloat(document.querySelector('input[name="kvadraturaStana"]')?.value) || 0;
    const visinaZidova = userData.postavke?.visinaZidova || 2.6;
    const otvori = parseFloat(document.querySelector('input[name="otvoriOdbiti"]')?.value) || 0;
    
    // Automatski izračunaj kvadraturu ako imamo dužinu i širinu
    if (duzina > 0 && sirina > 0) {
      const izracunataKvadratura = duzina * sirina;
      const kvadraturaInput = document.querySelector('input[name="kvadraturaStana"]');
      if (kvadraturaInput && (!kvadraturaInput.value || kvadraturaInput.value == 0)) {
        kvadraturaInput.value = izracunataKvadratura.toFixed(1);
      }
    }
    
    // Izračunaj površinu zidova: obim × visina - otvori
    if ((duzina > 0 && sirina > 0) || kvadratura > 0) {
      const m2zidoviInput = document.querySelector('input[name="m2zidovi"]');
      if (m2zidoviInput) {
        let obim;
        if (duzina > 0 && sirina > 0) {
          // Precizan obim ako imamo dimenzije
          obim = 2 * (duzina + sirina);
        } else {
          // Procijenjeni obim iz kvadrature (za kvadratnu sobu)
          const procijenjenaStrana = Math.sqrt(kvadratura);
          obim = 4 * procijenjenaStrana;
        }
        
        const ukupnaPovrsinaZidova = obim * visinaZidova;
        m2zidoviInput.value = Math.max(0, ukupnaPovrsinaZidova - otvori).toFixed(1);
        
        // Pozovi izračun cijene
        izracunajUkupno();
      }
    }
  }

  function izracunajMaterijale() {
    const kvadraturaStana = parseFloat(document.querySelector('input[name="kvadraturaStana"]')?.value) || 0;
    const m2zidovi = parseFloat(document.querySelector('input[name="m2zidovi"]')?.value) || 0;
    const plafon = document.querySelector('input[name="plafon"]')?.checked || false;
    const tipPosla = document.querySelector('select[name="tipPosla"]')?.value || 'molerski';
    
    const container = document.getElementById('materijali-detailed');
    if (!container) return;
    
    if (kvadraturaStana <= 0 || m2zidovi <= 0) {
      container.innerHTML = '<div style="color: var(--text2);">Unesite kvadraturu poda i površinu zidova za izračun materijala</div>';
      return;
    }
    
    // Ukupna površina za krečenje (zidovi + plafon ako je odabrano)
    const ukupnaPovrsina = m2zidovi + (plafon ? kvadraturaStana : 0);
    
    let materijali = [];
    let ukupnaKolicinaBoje = 0;
    
    switch(tipPosla) {
      case 'molerski':
        // Boja: ~0.12L po m² (2 sloja)
        const bojaLitara = ukupnaPovrsina * 0.12;
        ukupnaKolicinaBoje = bojaLitara;
        
        // Obim prostorije (za traku)
        const duzina = parseFloat(document.querySelector('input[name="duzina"]')?.value) || 0;
        const sirina = parseFloat(document.querySelector('input[name="sirina"]')?.value) || 0;
        const obim = 2 * (duzina + sirina);
        
        materijali = [
          { naziv: '🎨 Boja za zidove', kolicina: bojaLitara.toFixed(1), jedinica: 'litara', cijena: (bojaLitara * 15).toFixed(0) + ' KM' },
          { naziv: '🧴 Temeljna boja (podloga)', kolicina: (ukupnaPovrsina * 0.08).toFixed(1), jedinica: 'litara', cijena: (ukupnaPovrsina * 0.08 * 8).toFixed(0) + ' KM' },
          { naziv: '🪣 Kit za zatiranje', kolicina: (ukupnaPovrsina * 0.3).toFixed(1), jedinica: 'kg', cijena: (ukupnaPovrsina * 0.3 * 3).toFixed(0) + ' KM' },
          { naziv: '🧽 Traka za zaštitu', kolicina: Math.ceil(obim / 50), jedinica: 'kom (50m)', cijena: (Math.ceil(obim / 50) * 8).toFixed(0) + ' KM' }
        ];
        
        if (plafon) {
          materijali.unshift({ naziv: '⭐ Plafon se također kreči', kolicina: kvadraturaStana.toFixed(1), jedinica: 'm²', cijena: '' });
        }
        break;
        
      case 'fasaderski':
        const fasadaM2 = ukupnaPovrsina;
        materijali = [
          { naziv: '🏠 Fasaderska boja', kolicina: (fasadaM2 * 0.25).toFixed(1), jedinica: 'litara', cijena: (fasadaM2 * 0.25 * 12).toFixed(0) + ' KM' },
          { naziv: '🔧 Fasadni lepak', kolicina: (fasadaM2 * 0.4).toFixed(1), jedinica: 'kg', cijena: (fasadaM2 * 0.4 * 1.5).toFixed(0) + ' KM' },
          { naziv: '🕸️ Armirna mreža', kolicina: (fasadaM2 * 1.2).toFixed(1), jedinica: 'm²', cijena: (fasadaM2 * 1.2 * 3).toFixed(0) + ' KM' }
        ];
        break;
        
      case 'gipsarski':
        const gipsM2 = ukupnaPovrsina;
        materijali = [
          { naziv: '📋 Gips karton ploče', kolicina: (gipsM2 * 1.05).toFixed(1), jedinica: 'm²', cijena: (gipsM2 * 1.05 * 6).toFixed(0) + ' KM' },
          { naziv: '🧪 Gipsni lepak', kolicina: (gipsM2 * 0.8).toFixed(1), jedinica: 'kg', cijena: (gipsM2 * 0.8 * 2).toFixed(0) + ' KM' },
          { naziv: '⬜ Lajmni', kolicina: (gipsM2 * 0.5).toFixed(1), jedinica: 'kg', cijena: (gipsM2 * 0.5 * 3).toFixed(0) + ' KM' },
          { naziv: '🔩 Vijci za GK', kolicina: (gipsM2 * 2.5).toFixed(0), jedinica: 'kom', cijena: (gipsM2 * 2.5 * 0.1).toFixed(0) + ' KM' }
        ];
        break;
        
      case 'kombinovano':
        materijali = [
          { naziv: '🎨 Boja za zidove', kolicina: (m2zidovi * 0.15).toFixed(1), jedinica: 'litara', cijena: (m2zidovi * 0.15 * 15).toFixed(0) + ' KM' },
          { naziv: '📋 GK ploče (ako treba)', kolicina: (m2zidovi * 0.2).toFixed(1), jedinica: 'm²', cijena: (m2zidovi * 0.2 * 6).toFixed(0) + ' KM' },
          { naziv: '🧪 Kitovi i lepkovi', kolicina: (m2zidovi * 0.4).toFixed(1), jedinica: 'kg', cijena: (m2zidovi * 0.4 * 3).toFixed(0) + ' KM' }
        ];
        break;
    }
    
    // Ukupna procijenjena cijena materijala
    const ukupnaCijenaMaterijala = materijali.reduce((sum, m) => {
      const cijenaStr = m.cijena.replace(' KM', '');
      return sum + (parseFloat(cijenaStr) || 0);
    }, 0);
    
    const materijaliHtml = `
      <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
        <strong>📊 Površine:</strong><br>
        Zidovi: ${m2zidovi.toFixed(1)} m² ${plafon ? '+ Plafon: ' + kvadraturaStana.toFixed(1) + ' m²' : ''}<br>
        <strong>Ukupno za krečenje: ${ukupnaPovrsina.toFixed(1)} m²</strong>
      </div>
      <div style="font-weight: 600; margin-bottom: 8px; color: var(--accent);">📦 Potrebni materijali:</div>
      ${materijali.map(m => `
        <div style="padding: 6px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <span>${m.naziv}</span>
          <span style="font-weight: 500;">${m.kolicina} ${m.jedinica} ${m.cijena ? '• ' + m.cijena : ''}</span>
        </div>
      `).join('')}
      <div style="margin-top: 8px; padding-top: 8px; border-top: 2px solid var(--accent); font-weight: 600; color: var(--accent); text-align: right;">
        💰 Procijenjena vrijednost materijala: ${ukupnaCijenaMaterijala.toFixed(0)} KM
      </div>
    `;
    
    container.innerHTML = materijaliHtml;
    
    // Automatski popuni troškove materijala ako su 0
    const troskoviInput = document.querySelector('input[name="troskoviMaterijali"]');
    if (troskoviInput && (!troskoviInput.value || troskoviInput.value == 0)) {
      troskoviInput.value = ukupnaCijenaMaterijala.toFixed(2);
      izracunajUkupno();
    }
  }

  function izracunajUkupno() {
    const m2zidovi = parseFloat(document.querySelector('input[name="m2zidovi"]')?.value) || 0;
    const kvadraturaStana = parseFloat(document.querySelector('input[name="kvadraturaStana"]')?.value) || 0;
    const plafon = document.querySelector('input[name="plafon"]')?.checked || false;
    const cijenaPoM2 = parseFloat(document.querySelector('input[name="cijenaPoM2"]')?.value) || 0;
    const troskoviMaterijali = parseFloat(document.querySelector('input[name="troskoviMaterijali"]')?.value) || 0;
    const troskoviPrevoz = parseFloat(document.querySelector('input[name="troskoviPrevoz"]')?.value) || 0;
    const troskoviAlat = parseFloat(document.querySelector('input[name="troskoviAlat"]')?.value) || 0;
    
    // Ukupna površina = zidovi + plafon (ako je odabrano)
    const ukupnaPovrsina = m2zidovi + (plafon ? kvadraturaStana : 0);
    const ukupnaCijena = ukupnaPovrsina * cijenaPoM2;
    const ukupniTroskovi = troskoviMaterijali + troskoviPrevoz + troskoviAlat;
    const profit = ukupnaCijena - ukupniTroskovi;
    
    const cijenaEl = document.getElementById('cijena-total');
    const profitEl = document.getElementById('profit-total');
    
    if (cijenaEl) cijenaEl.textContent = ukupnaCijena.toFixed(2);
    if (profitEl) profitEl.textContent = profit.toFixed(2);
    
    // Prikazi i ukupnu površinu za informaciju
    const povrsinaEl = document.getElementById('povrsina-total');
    if (povrsinaEl) {
      povrsinaEl.textContent = ukupnaPovrsina.toFixed(1) + ' m²';
    }
  }

  // Klijenti
  function renderKlijenti() {
    const searchEl = document.getElementById('klijent-search');
    const tblEl = document.getElementById('tbl-klijenti');
    if (!searchEl || !tblEl) return;
    
    const search = searchEl.value.toLowerCase();
    const filtered = userData.klijenti.filter(k => !search || k.ime.toLowerCase().includes(search));
    tblEl.innerHTML = filtered.map((k, i) => {
      const projCount = userData.projekti.filter(p => p.klijentId === k.id).length;
      // Sanitizacija korisničkog inputa da spriječimo XSS
      const safeIme = sanitizeHTML(k.ime);
      const safeTelefon = sanitizeHTML(k.telefon || '');
      const safeAdresa = sanitizeHTML(k.adresa || '');
      return '<tr><td>' + safeIme + '</td><td>' + safeTelefon + '</td><td>' + safeAdresa + '</td><td>' + projCount + '</td><td><button class="btn-small" onclick="editKlijent(' + i + ')">✏️</button> <button class="btn-small" onclick="deleteKlijent(' + i + ')">🗑️</button></td></tr>';
    }).join('');
  }

  function openKlijentModal(index = null) {
    const k = index !== null ? userData.klijenti[index] : null;
    document.getElementById('modal-content').innerHTML = 
      '<h3>' + (k ? 'Uredi klijenta' : 'Novi klijent') + '</h3>' +
      '<form onsubmit="saveKlijent(event, ' + index + ')" class="form-grid">' +
      '<div><label>Ime i prezime</label><input type="text" name="ime" value="' + (k ? k.ime : '') + '" required placeholder="npr. Marko Marković"></div>' +
      '<div><label>Telefon</label><input type="tel" name="telefon" value="' + (k ? k.telefon || '' : '') + '" placeholder="npr. 061/123-456"></div>' +
      '<div style="grid-column: 1 / -1;"><label>Adresa</label><input type="text" name="adresa" value="' + (k ? k.adresa || '' : '') + '" placeholder="Ulica i broj, grad"></div>' +
      '<div class="modal-actions" style="grid-column: 1 / -1;"><button type="button" class="btn btn-outline" onclick="closeModal()">Otkaži</button><button type="submit" class="btn btn-accent">' + (k ? 'Sačuvaj izmjene' : 'Dodaj klijenta') + '</button></div></form>';
    document.getElementById('modal').style.display = 'flex';
  }

  function saveKlijent(e, index) {
    e.preventDefault();
    const f = e.target;
    const klijent = { id: Date.now().toString(), ime: f.ime.value, telefon: f.telefon.value, adresa: f.adresa.value };
    if (index !== null) { klijent.id = userData.klijenti[index].id; userData.klijenti[index] = klijent; }
    else userData.klijenti.push(klijent);
    saveUserData();
    closeModal();
    renderKlijenti();
  }
  function editKlijent(i) { openKlijentModal(i); }
  function deleteKlijent(i) { if (confirm('Obrisi klijenta?')) { userData.klijenti.splice(i, 1); saveUserData(); renderKlijenti(); } }

  // Rashodi
  function renderRashodi() {
    const tblEl = document.getElementById('tbl-rashodi');
    if (!tblEl) return;
    
    const yearRashodi = userData.rashodi.filter(r => new Date(r.datum).getFullYear() === currentYear);
    tblEl.innerHTML = yearRashodi.map((r, i) => 
      '<tr><td>' + r.datum + '</td><td>' + r.kategorija + '</td><td>' + (r.opis || '') + '</td><td>' + (parseFloat(r.iznos) || 0).toFixed(2) + ' KM</td><td><button class="btn-small" onclick="editRashod(' + i + ')">✏️</button> <button class="btn-small" onclick="deleteRashod(' + i + ')">🗑️</button></td></tr>'
    ).join('');
  }

  function openRashodModal(index = null) {
    const r = index !== null ? userData.rashodi[index] : null;
    document.getElementById('modal-content').innerHTML = 
      '<h3>' + (r ? 'Uredi rashod' : 'Novi rashod') + '</h3>' +
      '<form onsubmit="saveRashod(event, ' + index + ')" class="form-grid">' +
      '<div><label>Datum</label><input type="date" name="datum" value="' + (r ? r.datum : new Date().toISOString().split('T')[0]) + '" required></div>' +
      '<div><label>Kategorija</label><select name="kategorija"><option ' + (r && r.kategorija === 'Materijal' ? 'selected' : '') + '>Materijal</option><option ' + (r && r.kategorija === 'Alat' ? 'selected' : '') + '>Alat</option><option ' + (r && r.kategorija === 'Prijevoz' ? 'selected' : '') + '>Prijevoz</option><option ' + (r && r.kategorija === 'Ostalo' ? 'selected' : '') + '>Ostalo</option></select></div>' +
      '<div><label>Iznos (KM)</label><input type="number" name="iznos" step="0.01" value="' + (r ? r.iznos || '' : '') + '" required placeholder="npr. 250.00"></div>' +
      '<div style="grid-column: 1 / -1;"><label>Opis</label><input type="text" name="opis" value="' + (r ? r.opis || '' : '') + '" placeholder="Kratak opis rashoda..."></div>' +
      '<div class="modal-actions" style="grid-column: 1 / -1;"><button type="button" class="btn btn-outline" onclick="closeModal()">Otkaži</button><button type="submit" class="btn btn-accent">' + (r ? 'Sačuvaj izmjene' : 'Dodaj rashod') + '</button></div></form>';
    document.getElementById('modal').style.display = 'flex';
  }

  function saveRashod(e, index) {
    e.preventDefault();
    const f = e.target;
    const rashod = { datum: f.datum.value, kategorija: f.kategorija.value, opis: f.opis.value, iznos: parseFloat(f.iznos.value) };
    if (index !== null) userData.rashodi[index] = rashod;
    else userData.rashodi.push(rashod);
    saveUserData();
    closeModal();
    renderRashodi();
  }
  function editRashod(i) { openRashodModal(i); }
  function deleteRashod(i) { if (confirm('Obrisi rashod?')) { userData.rashodi.splice(i, 1); saveUserData(); renderRashodi(); } }

  // Materijal
  function renderMaterijal() {
    const tblEl = document.getElementById('tbl-materijal');
    if (!tblEl) return;
    
    // Prikazujemo samo alat kao inventar
    const alat = userData.materijal.filter(m => m.kategorija === 'Alat');
    
    if (alat.length === 0) {
      tblEl.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text2);">Nema unesenog alata u inventaru</td></tr>';
      return;
    }
    
    tblEl.innerHTML = alat.map((m, i) => {
      const ukupnaVrijednost = (parseFloat(m.cijena) || 0) * parseFloat(m.kolicina || 0);
      const statusClass = parseFloat(m.kolicina) <= parseFloat(m.min) ? 'status-u_tijeku' : 'status-zavrsen';
      const statusText = parseFloat(m.kolicina) <= parseFloat(m.min) ? 'Nisko' : 'OK';
      
      return '<tr><td>' + m.naziv + '</td><td>' + m.kategorija + '</td><td>' + m.kolicina + ' ' + (m.jedinica || 'kom') + '</td><td>' + m.min + '</td><td>' + (parseFloat(m.cijena) || 0).toFixed(2) + ' KM</td><td><strong>' + ukupnaVrijednost.toFixed(2) + ' KM</strong></td><td>' + statusText + '</td><td><button class="btn-small" onclick="editMaterijal(' + i + ')">✏️</button> <button class="btn-small" onclick="deleteMaterijal(' + i + ')">🗑️</button></td></tr>';
    }).join('');
  }

  function openMaterijalModal(index = null) {
    const m = index !== null ? userData.materijal[index] : null;
    document.getElementById('modal-content').innerHTML = 
      '<h3>' + (m ? 'Uredi alat/opremu' : 'Novi alat/oprema') + '</h3>' +
      '<form onsubmit="saveMaterijal(event, ' + index + ')" class="form-grid">' +
      '<div><label>Naziv alata/opreme</label><input type="text" name="naziv" value="' + (m ? m.naziv : '') + '" required placeholder="npr. Brusilica, Škare, Merdevine"></div>' +
      '<div><label>Kategorija</label><select name="kategorija"><option value="Alat" ' + (m && m.kategorija === 'Alat' ? 'selected' : '') + '>Alat</option><option value="Oprema" ' + (m && m.kategorija === 'Oprema' ? 'selected' : '') + '>Oprema</option><option value="Zaštita" ' + (m && m.kategorija === 'Zaštita' ? 'selected' : '') + '>Zaštita na radu</option></select></div>' +
      '<div><label>Količina</label><input type="number" name="kolicina" value="' + (m ? m.kolicina : 1) + '" placeholder="npr. 1"></div>' +
      '<div><label>Jedinica mjere</label><select name="jedinica"><option value="kom" ' + (m && m.jedinica === 'kom' ? 'selected' : '') + '>Komad</option><option value="set" ' + (m && m.jedinica === 'set' ? 'selected' : '') + '>Set</option><option value="par" ' + (m && m.jedinica === 'par' ? 'selected' : '') + '>Par</option></select></div>' +
      '<div><label>Cijena po komadu (KM)</label><input type="number" name="cijena" step="0.01" value="' + (m ? m.cijena || '' : '') + '" placeholder="npr. 150.00"></div>' +
      '<div><label>Minimalna zaliha</label><input type="number" name="min" value="' + (m ? m.min : 1) + '" placeholder="npr. 1"></div>' +
      '<div class="modal-actions" style="grid-column: 1 / -1;"><button type="button" class="btn btn-outline" onclick="closeModal()">Otkaži</button><button type="submit" class="btn btn-accent">' + (m ? 'Sačuvaj izmjene' : 'Dodaj alat') + '</button></div></form>';
    document.getElementById('modal').style.display = 'flex';
  }

  function saveMaterijal(e, index) {
    e.preventDefault();
    const f = e.target;
    const mat = { 
      naziv: f.naziv.value, 
      kategorija: f.kategorija.value, 
      kolicina: f.kolicina.value,
      jedinica: f.jedinica.value,
      cijena: parseFloat(f.cijena.value) || 0,
      min: f.min.value,
      ukupnaVrijednost: (parseFloat(f.cijena.value) || 0) * parseFloat(f.kolicina.value)
    };
    if (index !== null) userData.materijal[index] = mat;
    else userData.materijal.push(mat);
    saveUserData();
    closeModal();
    renderMaterijal();
  }
  function editMaterijal(i) { openMaterijalModal(i); }
  function deleteMaterijal(i) { if (confirm('Obrisi materijal?')) { userData.materijal.splice(i, 1); saveUserData(); renderMaterijal(); } }

  // Postavke - Konfiguracija aplikacije
  function renderPostavke() {
    const container = document.getElementById('pg-postavke');
    if (!container) return;
    
    const postavke = userData.postavke || {};
    
    let html = '<h2 class="page-title">⚙️ Postavke</h2>';
    html += '<div style="display: grid; gap: 15px; max-width: 600px;">';
    
    // CIJENE PO VRSTAMA POSLA - individualno
    html += '<div style="background: var(--bg3); padding: 15px; border-radius: 8px;">';
    html += '<h3 style="margin: 0 0 12px 0; color: var(--accent); font-size: 1.1em;">💰 Cijene po vrsti posla (KM/m²)</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">🎨 Krečenje</label><input type="number" id="cijena-krecenje" value="' + (postavke.cijenaKrecenje || 12) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">🔧 Gletovanje</label><input type="number" id="cijena-gletovanje" value="' + (postavke.cijenaGletovanje || 14) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">📐 Lajsne</label><input type="number" id="cijena-lajsne" value="' + (postavke.cijenaLajsne || 8) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">🪣 Kitovanje</label><input type="number" id="cijena-kitovanje" value="' + (postavke.cijenaKitovanje || 10) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">⚡ Brušenje</label><input type="number" id="cijena-brusenje" value="' + (postavke.cijenaBrusenje || 11) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">🧱 Grunt</label><input type="number" id="cijena-grunt" value="' + (postavke.cijenaGrunt || 9) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">🏠 Fasada</label><input type="number" id="cijena-fasada" value="' + (postavke.cijenaFasada || 16) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">📋 Gips</label><input type="number" id="cijena-gips" value="' + (postavke.cijenaGips || 18) + '" step="0.01" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '</div></div>';
    
    // ODBIJANJE ZA OTVORE
    html += '<div style="background: var(--bg3); padding: 15px; border-radius: 8px;">';
    html += '<h3 style="margin: 0 0 12px 0; color: var(--accent); font-size: 1.1em;">🚪 Odbijanje za otvore</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">Po vratima (m²)</label><input type="number" id="otvori-vrata" value="' + (postavke.otvoriVrata || 0) + '" step="0.1" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">Po prozoru (m²)</label><input type="number" id="otvori-prozor" value="' + (postavke.otvoriProzor || 0) + '" step="0.1" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '</div>';
    html += '<div style="font-size: 0.75em; color: var(--text2); margin-top: 8px;">Unesite vrijednosti po komadu ako želite automatsko odbijanje</div>';
    html += '</div>';
    
    // PODACI O PROSTORIJI
    html += '<div style="background: var(--bg3); padding: 15px; border-radius: 8px;">';
    html += '<h3 style="margin: 0 0 12px 0; color: var(--accent); font-size: 1.1em;">📐 Podaci o prostoriji</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">Prosjječna visina zidova (m)</label><input type="number" id="visina-zidova" value="' + (postavke.visinaZidova || 2.6) + '" step="0.1" min="2" max="4" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">Default broj zidova</label><select id="broj-zidova" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"><option value="1" ' + (postavke.brojZidova == 1 ? 'selected' : '') + '>1 zid</option><option value="2" ' + (postavke.brojZidova == 2 ? 'selected' : '') + '>2 zida</option><option value="3" ' + (postavke.brojZidova == 3 ? 'selected' : '') + '>3 zida</option><option value="4" ' + (postavke.brojZidova == 4 || !postavke.brojZidova ? 'selected' : '') + '>4 zida (cijela soba)</option></select></div>';
    html += '</div>';
    html += '<div style="font-size: 0.75em; color: var(--text2); margin-top: 8px;">Koristi se za automatski izračun površine zidova</div>';
    html += '</div>';
    
    // DODATNE OPCIJE
    html += '<div style="background: var(--bg3); padding: 15px; border-radius: 8px;">';
    html += '<h3 style="margin: 0 0 12px 0; color: var(--accent); font-size: 1.1em;">⚡ Ostale opcije</h3>';
    html += '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">';
    html += '<input type="checkbox" id="auto-plafon" ' + (postavke.autoPlafon ? 'checked' : '') + ' style="width: 18px; height: 18px;">';
    html += '<label for="auto-plafon" style="font-size: 0.9em;">Automatski uključi plafon u novim poslovima</label>';
    html += '</div>';
    html += '<div style="display: flex; align-items: center; gap: 10px;">';
    html += '<input type="checkbox" id="auto-otvori" ' + (postavke.autoOtvori ? 'checked' : '') + ' style="width: 18px; height: 18px;">';
    html += '<label for="auto-otvori" style="font-size: 0.9em;">Automatski odbijaj standardni iznos za otvore</label>';
    html += '</div>';
    html += '</div>';
    
    // DUGME ZA ČUVANJE
    html += '<button onclick="savePostavke()" class="btn btn-accent" style="padding: 12px 24px; font-size: 1em;">💾 Sačuvaj postavke</button>';
    
    html += '</div>';
    
    container.innerHTML = html;
  }

  function savePostavke() {
    userData.postavke = userData.postavke || {};
    
    // Cijene za individualne vrste posla
    userData.postavke.cijenaKrecenje = parseFloat(document.getElementById('cijena-krecenje')?.value) || 12;
    userData.postavke.cijenaGletovanje = parseFloat(document.getElementById('cijena-gletovanje')?.value) || 14;
    userData.postavke.cijenaLajsne = parseFloat(document.getElementById('cijena-lajsne')?.value) || 8;
    userData.postavke.cijenaKitovanje = parseFloat(document.getElementById('cijena-kitovanje')?.value) || 10;
    userData.postavke.cijenaBrusenje = parseFloat(document.getElementById('cijena-brusenje')?.value) || 11;
    userData.postavke.cijenaGrunt = parseFloat(document.getElementById('cijena-grunt')?.value) || 9;
    userData.postavke.cijenaFasada = parseFloat(document.getElementById('cijena-fasada')?.value) || 16;
    userData.postavke.cijenaGips = parseFloat(document.getElementById('cijena-gips')?.value) || 18;
    
    // Odbijanje za otvore
    userData.postavke.otvoriVrata = parseFloat(document.getElementById('otvori-vrata')?.value) || 0;
    userData.postavke.otvoriProzor = parseFloat(document.getElementById('otvori-prozor')?.value) || 0;
    
    // Podaci o prostoriji
    userData.postavke.visinaZidova = parseFloat(document.getElementById('visina-zidova')?.value) || 2.6;
    userData.postavke.brojZidova = parseInt(document.getElementById('broj-zidova')?.value) || 4;
    
    // Automatske opcije
    userData.postavke.autoPlafon = document.getElementById('auto-plafon')?.checked || false;
    userData.postavke.autoOtvori = document.getElementById('auto-otvori')?.checked || false;
    
    saveUserData();
    showToast('Postavke su sačuvane!', 'success');
  }

  function closeModal() { 
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none'; 
  }

  // KALKULATOR - brzi izračun
  function openKalkulator() {
    const html = `
      <h3 style="margin: 0 0 20px 0; color: var(--accent);">🧮 KALKULATOR</h3>
      <div style="background: var(--bg2); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-size: 0.9em; color: var(--text2);">Površina (m²)</label>
            <input type="number" id="kalk-povrsina" placeholder="100" step="0.1" style="width: 100%; padding: 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-size: 0.9em; color: var(--text2);">Cijena (KM/m²)</label>
            <input type="number" id="kalk-cijena" placeholder="12" step="0.01" style="width: 100%; padding: 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-size: 0.9em; color: var(--text2);">Materijali (KM)</label>
            <input type="number" id="kalk-materijali" placeholder="200" step="0.01" style="width: 100%; padding: 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-size: 0.9em; color: var(--text2);">Prevoz (KM)</label>
            <input type="number" id="kalk-prevoz" placeholder="50" step="0.01" style="width: 100%; padding: 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
          </div>
        </div>
        
        <div style="background: var(--bg3); padding: 15px; border-radius: 8px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 1.1em; font-weight: 600;">UKUPNO:</span>
            <span id="kalk-ukupno" style="font-size: 1.3em; font-weight: 700; color: var(--accent);">0.00 KM</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 0.9em; color: var(--text2);">Profit:</span>
            <span id="kalk-profit" style="font-size: 1.1em; font-weight: 600; color: var(--green);">0.00 KM</span>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <button onclick="closeModal()" style="padding: 10px 20px; background: var(--accent); border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">Zatvori</button>
        </div>
      </div>
    `;
    
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
    
    // Dodaj event listenere za automatski izračun
    document.getElementById('kalk-povrsina')?.addEventListener('input', izracunajKalkulator);
    document.getElementById('kalk-cijena')?.addEventListener('input', izracunajKalkulator);
    document.getElementById('kalk-materijali')?.addEventListener('input', izracunajKalkulator);
    document.getElementById('kalk-prevoz')?.addEventListener('input', izracunajKalkulator);
    
    // Inicijalni izračun
    izracunajKalkulator();
  }
  
  function izracunajKalkulator() {
    const povrsina = parseFloat(document.getElementById('kalk-povrsina')?.value) || 0;
    const cijena = parseFloat(document.getElementById('kalk-cijena')?.value) || 0;
    const materijali = parseFloat(document.getElementById('kalk-materijali')?.value) || 0;
    const prevoz = parseFloat(document.getElementById('kalk-prevoz')?.value) || 0;
    
    const ukupno = povrsina * cijena;
    const profit = ukupno - materijali - prevoz;
    
    document.getElementById('kalk-ukupno').textContent = ukupno.toFixed(2) + ' KM';
    document.getElementById('kalk-profit').textContent = profit.toFixed(2) + ' KM';
  }

  function exportData() {
    const data = JSON.stringify(userData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'moler-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validacija tipa fajla
    if (!file.name.endsWith('.json')) {
      showToast('Greška: Fajl mora biti JSON format', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        
        // Validacija strukture podataka
        if (!validateImportData(imported)) {
          showToast('Greška: Neispravna struktura podataka u fajlu', 'error');
          return;
        }
        
        // Potvrda od korisnika
        if (!confirm('Ovo će zamijeniti sve trenutne podatke. Da li ste sigurni?')) {
          return;
        }
        
        userData = imported;
        saveUserData();
        showToast('Podaci uvezeni uspješno!', 'success');
        navigateTo('dashboard');
      } catch (err) { 
        console.error('Import error:', err);
        showToast('Greška pri uvozu: ' + err.message, 'error'); 
      }
    };
    reader.onerror = () => {
      showToast('Greška pri čitanju fajla', 'error');
    };
    reader.readAsText(file);
  }
  
  // Helper funkcija za validaciju importovanih podataka
  function validateImportData(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Provjeri da li su navedeni ključevi nizovi
    const requiredArrays = ['projekti', 'klijenti', 'rashodi', 'materijal'];
    for (const key of requiredArrays) {
      if (!Array.isArray(data[key])) {
        console.error('Missing or invalid array:', key);
        return false;
      }
    }
    
    // Provjeri da li postavke postoje i da li su objekat
    if (!data.postavke || typeof data.postavke !== 'object') {
      console.error('Missing or invalid postavke');
      return false;
    }
    
    return true;
  }

  function clearAllData() {
    if (confirm('Jeste li sigurni da želite obrisati sve podatke? Ova akcija se ne može poništiti!')) {
      userData = { projekti: [], klijenti: [], rashodi: [], materijal: [], postavke: {} };
      saveUserData();
      showToast('Svi podaci su obrisani!', 'success');
      navigateTo('dashboard');
    }
  }

  function resetTheme() {
    currentTheme = 'light';
    userData.postavke.theme = currentTheme;
    applyTheme();
    saveUserData();
    showToast('Tema je resetovana na svijetlu!', 'success');
  }

  // Make functions globally available
  window.showLoginTab = showLoginTab;
  window.handleLogin = handleLogin;
  window.handleRegister = handleRegister;
  window.handleLogout = handleLogout;
  window.showPage = showPage;
  window.toggleTheme = toggleTheme;
  window.openProjektModal = openProjektModal;
  window.saveProjekt = saveProjekt;
  window.editProjekt = editProjekt;
  window.deleteProjekt = deleteProjekt;
  window.togglePaid = togglePaid;
  window.toggleVrstaPosla = toggleVrstaPosla;
  window.openKlijentModal = openKlijentModal;
  window.izracunajMaterijale = izracunajMaterijale;
  window.izracunajPovrsine = izracunajPovrsine;
  window.izracunajUkupno = izracunajUkupno;
  window.izracunajCijenuPoVrstama = izracunajCijenuPoVrstama;
  window.updateCijenaPoTipu = updateCijenaPoTipu;
  window.toggleStatus = toggleStatus;
  window.saveKlijent = saveKlijent;
  window.editKlijent = editKlijent;
  window.deleteKlijent = deleteKlijent;
  window.openRashodModal = openRashodModal;
  window.saveRashod = saveRashod;
  window.editRashod = editRashod;
  window.deleteRashod = deleteRashod;
  window.openMaterijalModal = openMaterijalModal;
  window.saveMaterijal = saveMaterijal;
  window.editMaterijal = editMaterijal;
  window.deleteMaterijal = deleteMaterijal;
  window.closeModal = closeModal;
  window.openKalkulator = openKalkulator;
  window.exportData = exportData;
  window.importData = importData;
  window.clearAllData = clearAllData;
  window.resetTheme = resetTheme;
  window.selectYear = selectYear;
  // Debounced verzije za pretragu (300ms delay)
  const debouncedRenderProjekti = debounce(renderProjekti, 300);
  const debouncedRenderKlijenti = debounce(renderKlijenti, 300);
  
  // Eksportuj debounced funkcije za HTML
  window.renderProjekti = renderProjekti;
  window.renderKlijenti = renderKlijenti;
  window.debouncedRenderProjekti = debouncedRenderProjekti;
  window.debouncedRenderKlijenti = debouncedRenderKlijenti;
  window.renderPostavke = renderPostavke;
  window.savePostavke = savePostavke;
  window.toggleNewKlijent = toggleNewKlijent;

  // Start app
  auth.onAuthStateChanged(onAuthStateChanged);
  
  // Test Firebase connection
  console.log('Testing Firebase connection...');
  db.ref('.info/connected').on('value', (snapshot) => {
    const connected = snapshot.val();
    console.log('Firebase connected:', connected);
    const statusEl = document.getElementById('sync-status');
    if (statusEl) {
      if (connected) {
        statusEl.textContent = 'Online';
        statusEl.className = 'sync-status online';
      } else {
        statusEl.textContent = 'Offline';
        statusEl.className = 'sync-status offline';
      }
    }
  });
}

// Wait for DOM and Firebase to be ready
function startApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
    
  } else {
    initApp();
  }
}
if (window.firebase) {
  startApp();
} else {
  window.addEventListener('load', startApp);
}
