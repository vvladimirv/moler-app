// Wait for Firebase SDK to load, then initialize
function initApp() {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    alert('Greška: Firebase se nije učitao. Provjerite internet vezu.');
    return;
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
    alert('Greška pri inicijalizaciji Firebase: ' + error.message);
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
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
    document.querySelector('.login-tab[data-tab="' + tab + '"]').classList.add('active');
    document.getElementById(tab + '-form').classList.add('active');
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
  function loadUserData() {
    db.ref('users/' + currentUser.uid).on('value', (snapshot) => {
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
    });
  }

  function saveUserData() {
    if (!currentUser) return;
    db.ref('users/' + currentUser.uid).set(userData);
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
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.getElementById('theme-btn').textContent = currentTheme === 'light' ? '🌙' : '☀️';
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
      
      return '<tr><td>' + p.datum + '</td><td>' + klijent.ime + '</td><td>' + (p.adresa || '') + '</td><td>' + (p.m2 || '') + ' m²</td><td>' + (parseFloat(p.cijena) || 0).toFixed(2) + ' KM</td><td><span class="' + statusClass + '" style="cursor: pointer; padding: 4px 8px; border-radius: 4px;" onclick="toggleStatus(' + idx + ')" title="Klikni za promjenu">' + statusText + '</span></td><td><button class="btn-small" onclick="togglePaid(' + idx + ')" title="Označi kao plaćeno/neplaćeno" style="font-size: 1.1em; background: ' + (p.placeno ? '#22c55e' : 'transparent') + '; border: 1px solid ' + (p.placeno ? '#22c55e' : '#666') + '; border-radius: 4px; padding: 4px 8px; cursor: pointer;">' + (p.placeno ? '💰' : '❌') + '</button></td><td><button class="btn-small" onclick="editProjekt(' + idx + ')">✏️</button> <button class="btn-small" onclick="deleteProjekt(' + idx + ')">🗑️</button></td></tr>';
    }).join('');
  }

  function openProjektModal(projektIndex = null) {
    const projekt = projektIndex !== null ? userData.projekti[projektIndex] : null;
    const klijentiOpts = userData.klijenti.length > 0 
      ? userData.klijenti.map(k => '<option value="' + k.id + '" ' + (projekt && projekt.klijentId === k.id ? 'selected' : '') + '>' + k.ime + '</option>').join('')
      : '<option value="">Nema klijenata</option>';
    const today = new Date().toISOString().split('T')[0];
    const postavke = userData.postavke || {};
    
    const defaultTip = projekt ? projekt.tipPosla : 'molerski';
    const defaultCijena = projekt ? projekt.cijenaPoM2 : (postavke.cijenaMolerski || 12);
    const defaultPlafon = projekt ? projekt.plafon : (postavke.autoPlafon || false);
    const defaultOtvori = projekt ? projekt.otvoriOdbiti : (postavke.autoOtvori ? (postavke.otvoriDefault || 20) : '');
    
    // Vrste posla - multiple checkbox
    const vrstePosla = projekt ? (projekt.vrstePosla || []) : [];
    
    let html = '<h3 style="margin: 0 0 10px 0; font-size: 1em;">' + (projekt ? '✏️ Uredi posao' : '➕ Novi posao') + '</h3>';
    html += '<form onsubmit="saveProjekt(event, ' + projektIndex + ')">';
    
    // RED 1: KLIJENT
    html += '<div style="margin-bottom: 8px;">';
    html += '<select name="klijentId" id="klijent-select" onchange="toggleNewKlijent()" style="width: 100%; padding: 6px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.85em;"><option value="">👤 Izaberite klijenta...</option>' + klijentiOpts + '<option value="new">+ Novi klijent</option></select>';
    html += '</div>';
    
    // NOVI KLIJENT (hidden)
    html += '<div id="new-klijent-fields" style="display: none; margin-bottom: 8px; padding: 8px; background: var(--bg3); border-radius: 4px;">';
    html += '<input type="text" id="new-klijent-ime" placeholder="Ime i prezime" style="width: 100%; padding: 5px; margin-bottom: 4px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; font-size: 0.8em;">';
    html += '<div style="display: flex; gap: 6px;">';
    html += '<input type="tel" id="new-klijent-telefon" placeholder="Telefon" style="flex: 1; padding: 5px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; font-size: 0.8em;">';
    html += '<input type="text" id="new-klijent-adresa" placeholder="Adresa" style="flex: 1; padding: 5px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; font-size: 0.8em;">';
    html += '</div></div>';
    
    // RED 2: DATUM | ADRESA | STATUS
    html += '<div style="display: flex; gap: 6px; margin-bottom: 8px;">';
    html += '<input type="date" name="datum" value="' + (projekt ? projekt.datum : today) + '" required style="flex: 1; padding: 6px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.8em;">';
    html += '<input type="text" name="adresa" value="' + (projekt ? projekt.adresa || '' : '') + '" placeholder="📍 Adresa" style="flex: 2; padding: 6px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.8em;">';
    html += '<select name="status" style="flex: 1; padding: 6px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.8em;">';
    html += '<option value="dogovoren" ' + (projekt && projekt.status === 'dogovoren' ? 'selected' : '') + '>Dogovoren</option>';
    html += '<option value="u_tijeku" ' + (projekt && projekt.status === 'u_tijeku' ? 'selected' : '') + '>U tijeku</option>';
    html += '<option value="zavrsen" ' + (projekt && projekt.status === 'zavrsen' ? 'selected' : '') + '>Završen</option>';
    html += '</select>';
    html += '</div>';
    
    // RED 3: VRSTE POSLA - 4 u redu
    const vp = projekt ? (projekt.vrstePosla || []) : [];
    html += '<div style="margin-bottom: 8px;">';
    html += '<div style="font-size: 10px; color: var(--text2); margin-bottom: 3px;">Vrste posla:</div>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px;">';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('krecenje') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('krecenje') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_krecenje" ' + (vp.includes('krecenje')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Krečenje</label>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('gletovanje') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('gletovanje') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_gletovanje" ' + (vp.includes('gletovanje')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Gletovanje</label>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('lajsne') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('lajsne') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_lajsne" ' + (vp.includes('lajsne')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Lajsne</label>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('kitovanje') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('kitovanje') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_kitovanje" ' + (vp.includes('kitovanje')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Kitovanje</label>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('brusenje') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('brusenje') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_brusenje" ' + (vp.includes('brusenje')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Brušenje</label>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('grunt') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('grunt') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_grunt" ' + (vp.includes('grunt')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Grunt</label>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('fasada') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('fasada') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_fasada" ' + (vp.includes('fasada')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Fasada</label>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; background: ' + (vp.includes('gips') ? 'var(--accent)' : 'var(--bg2)') + '; color: ' + (vp.includes('gips') ? 'white' : 'var(--text)') + '; padding: 4px 6px; border-radius: 3px;"><input type="checkbox" name="vp_gips" ' + (vp.includes('gips')?'checked':'') + ' onchange="izracunajCijenuPoVrstama()"> Gips</label>';
    html += '</div></div>';
    
    // RED 4: POVRŠINA | CIJENA | TROŠKOVI | UKUPNO
    html += '<div style="display: flex; gap: 6px; margin-bottom: 8px; align-items: flex-end;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: 10px; color: var(--text2); margin-bottom: 2px;">m²:</div>';
    html += '<input type="number" name="m2" value="' + (projekt ? projekt.m2 : '') + '" placeholder="45" step="0.1" style="width: 100%; padding: 5px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.8em;">';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: 10px; color: var(--text2); margin-bottom: 2px;">Plafon:</div>';
    html += '<label style="display: flex; align-items: center; gap: 3px; font-size: 0.8em; cursor: pointer; height: 28px;"><input type="checkbox" name="plafon" ' + (defaultPlafon ? 'checked' : '') + '> Da</label>';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: 10px; color: var(--text2); margin-bottom: 2px;">Cijena/m²:</div>';
    html += '<input type="number" name="cijenaPoM2" id="cijena-po-m2" value="' + (projekt ? projekt.cijenaPoM2 : '12') + '" step="0.01" oninput="izracunajUkupno()" style="width: 100%; padding: 5px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.8em;">';
    html += '</div>';
    html += '<div style="flex: 1;">';
    html += '<div style="font-size: 10px; color: var(--text2); margin-bottom: 2px;">Troškovi:</div>';
    html += '<input type="number" name="troskoviMaterijali" value="' + (projekt ? projekt.troskoviMaterijali : 0) + '" step="0.01" oninput="izracunajUkupno()" style="width: 100%; padding: 5px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.8em;">';
    html += '</div>';
    html += '<div style="flex: 1; background: var(--accent); padding: 5px; border-radius: 4px; color: white; text-align: center;">';
    html += '<div style="font-size: 9px; opacity: 0.9;">UKUPNO</div>';
    html += '<div style="font-size: 1em; font-weight: 600;"><span id="cijena-total">0</span> KM</div>';
    html += '</div>';
    html += '</div>';
    
    // RED 5: NAPOMENA
    html += '<div style="margin-bottom: 10px;">';
    html += '<input type="text" name="napomena" value="' + (projekt ? projekt.napomena || '' : '') + '" placeholder="📝 Napomena..." style="width: 100%; padding: 6px; background: var(--bg2); border: 1px solid #555; border-radius: 4px; color: var(--text); font-size: 0.85em;">';
    html += '</div>';
    
    // RED 6: DUGMADI
    html += '<div style="display: flex; gap: 8px; justify-content: flex-end;">';
    html += '<button type="button" onclick="closeModal()" style="padding: 6px 14px; background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; font-size: 0.85em;">Otkaži</button>';
    html += '<button type="submit" style="padding: 6px 14px; background: var(--accent); border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 0.85em;">' + (projekt ? 'Sačuvaj' : 'Kreiraj') + '</button>';
    html += '</div></form>';
    
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
    
    if (projekt) {
      setTimeout(() => izracunajUkupno(), 50);
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
    let klijentId = f.klijentId.value;
    
    // Ako je odabran novi klijent, kreiraj ga prvo
    if (klijentId === 'new') {
      const ime = document.getElementById('new-klijent-ime').value.trim();
      const telefon = document.getElementById('new-klijent-telefon').value.trim();
      const adresa = document.getElementById('new-klijent-adresa').value.trim();
      
      if (!ime) {
        alert('Unesite ime novog klijenta!');
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
    
    const projekt = {
      klijentId: klijentId,
      datum: f.datum.value,
      vrstePosla: vrstePosla,
      kvadraturaStana: parseFloat(f.kvadraturaStana?.value) || 0,
      plafon: f.plafon?.checked || false,
      otvoriOdbiti: parseFloat(f.otvoriOdbiti?.value) || 0,
      m2: parseFloat(f.m2.value) || 0,
      cijenaPoM2: parseFloat(f.cijenaPoM2.value) || 0,
      cijena: (parseFloat(f.m2.value) || 0) * (parseFloat(f.cijenaPoM2.value) || 0),
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
    
    if (select.value === 'new') {
      newFields.style.display = 'block';
      document.getElementById('new-klijent-ime').required = true;
    } else {
      newFields.style.display = 'none';
      document.getElementById('new-klijent-ime').required = false;
    }
  }

  function editProjekt(index) { openProjektModal(index); }
  function deleteProjekt(index) { if (confirm('Obrisi projekt?')) { userData.projekti.splice(index, 1); saveUserData(); renderProjekti(); } }
  function togglePaid(index) { userData.projekti[index].placeno = !userData.projekti[index].placeno; saveUserData(); renderProjekti(); }
  function toggleStatus(index) { 
    userData.projekti[index].status = userData.projekti[index].status === 'zavrsen' ? 'u_tijeku' : 'zavrsen'; 
    saveUserData(); 
    renderProjekti(); 
  }

  function izracunajPovrsine() {
    const kvadratura = parseFloat(document.querySelector('input[name="kvadraturaStana"]')?.value) || 0;
    const plafon = document.querySelector('input[name="plafon"]')?.checked || false;
    const otvori = parseFloat(document.querySelector('input[name="otvoriOdbiti"]')?.value) || 0;
    
    if (kvadratura > 0) {
      // Zidovi = kvadratura × 4, sa plafonom = kvadratura × 5
      const faktor = plafon ? 5 : 4;
      const ukupno = (kvadratura * faktor) - otvori;
      
      const m2Input = document.querySelector('input[name="m2"]');
      if (m2Input) {
        m2Input.value = Math.max(0, ukupno).toFixed(2);
      }
      
      // Pozovi izračun cijene
      izracunajUkupno();
    }
  }

  function izracunajMaterijale() {
    const m2poda = parseFloat(document.querySelector('input[name="m2"]')?.value) || 0;
    const m2zidovi = parseFloat(document.querySelector('input[name="m2zidovi"]')?.value) || 0;
    const plafon = document.querySelector('input[name="plafon"]')?.checked || false;
    const tipPosla = document.querySelector('select[name="tipPosla"]')?.value || 'molerski';
    
    const container = document.getElementById('materijali-detailed');
    if (!container) return;
    
    if (m2poda <= 0 || m2zidovi <= 0) {
      container.innerHTML = '<div style="color: var(--text2);">Unesite dimenzije prostorije za izračun materijala</div>';
      return;
    }
    
    // Ukupna površina za krečenje (zidovi + plafon ako je odabrano)
    const ukupnaPovrsina = m2zidovi + (plafon ? m2poda : 0);
    
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
          materijali.unshift({ naziv: '⭐ Plafon se također kreči', kolicina: m2poda.toFixed(1), jedinica: 'm²', cijena: '' });
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
        Zidovi: ${m2zidovi.toFixed(1)} m² ${plafon ? '+ Plafon: ' + m2poda.toFixed(1) + ' m²' : ''}<br>
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
    const m2 = parseFloat(document.querySelector('input[name="m2"]')?.value) || 0;
    const cijenaPoM2 = parseFloat(document.querySelector('input[name="cijenaPoM2"]')?.value) || 0;
    const troskoviMaterijali = parseFloat(document.querySelector('input[name="troskoviMaterijali"]')?.value) || 0;
    const troskoviPrevoz = parseFloat(document.querySelector('input[name="troskoviPrevoz"]')?.value) || 0;
    const troskoviAlat = parseFloat(document.querySelector('input[name="troskoviAlat"]')?.value) || 0;
    
    const ukupnaCijena = m2 * cijenaPoM2;
    const ukupniTroskovi = troskoviMaterijali + troskoviPrevoz + troskoviAlat;
    const profit = ukupnaCijena - ukupniTroskovi;
    
    const cijenaEl = document.getElementById('cijena-total');
    const profitEl = document.getElementById('profit-total');
    
    if (cijenaEl) cijenaEl.textContent = ukupnaCijena.toFixed(2);
    if (profitEl) profitEl.textContent = profit.toFixed(2);
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
      return '<tr><td>' + k.ime + '</td><td>' + (k.telefon || '') + '</td><td>' + (k.adresa || '') + '</td><td>' + projCount + '</td><td><button class="btn-small" onclick="editKlijent(' + i + ')">✏️</button> <button class="btn-small" onclick="deleteKlijent(' + i + ')">🗑️</button></td></tr>';
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
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">Standardno odbijanje (m²)</label><input type="number" id="otvori-default" value="' + (postavke.otvoriDefault || 20) + '" step="0.1" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">Po vratima (m²)</label><input type="number" id="otvori-vrata" value="' + (postavke.otvoriVrata || 2) + '" step="0.1" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '<div><label style="font-size: 0.8em; display: block; margin-bottom: 4px;">Po prozoru (m²)</label><input type="number" id="otvori-prozor" value="' + (postavke.otvoriProzor || 1.5) + '" step="0.1" style="width: 100%; padding: 8px; background: var(--bg2); border: 1px solid #333; border-radius: 4px; color: var(--text);"></div>';
    html += '</div>';
    html += '<div style="font-size: 0.75em; color: var(--text2); margin-top: 8px;">Ove vrijednosti se automatski prijavljuju prilikom kreiranja novog posla</div>';
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
    userData.postavke.otvoriDefault = parseFloat(document.getElementById('otvori-default')?.value) || 20;
    userData.postavke.otvoriVrata = parseFloat(document.getElementById('otvori-vrata')?.value) || 2;
    userData.postavke.otvoriProzor = parseFloat(document.getElementById('otvori-prozor')?.value) || 1.5;
    
    // Automatske opcije
    userData.postavke.autoPlafon = document.getElementById('auto-plafon')?.checked || false;
    userData.postavke.autoOtvori = document.getElementById('auto-otvori')?.checked || false;
    
    saveUserData();
    alert('Postavke su sačuvane!');
  }

  function closeModal() { document.getElementById('modal').style.display = 'none'; }

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
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        userData = JSON.parse(ev.target.result);
        saveUserData();
        alert('Podaci uvezeni!');
        navigateTo('dashboard');
      } catch (err) { alert('Greska: ' + err.message); }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (confirm('Jeste li sigurni da želite obrisati sve podatke? Ova akcija se ne može poništiti!')) {
      userData = { projekti: [], klijenti: [], rashodi: [], materijal: [], postavke: {} };
      saveUserData();
      alert('Svi podaci su obrisani!');
      navigateTo('dashboard');
    }
  }

  function resetTheme() {
    currentTheme = 'light';
    userData.postavke.theme = currentTheme;
    applyTheme();
    saveUserData();
    alert('Tema je resetovana na svijetlu!');
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
  window.exportData = exportData;
  window.importData = importData;
  window.clearAllData = clearAllData;
  window.resetTheme = resetTheme;
  window.selectYear = selectYear;
  window.renderProjekti = renderProjekti;
  window.renderKlijenti = renderKlijenti;
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
  window.izracunajUkupno = izracunajUkupno;
  window.izracunajPovrsine = izracunajPovrsine;
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
  window.exportData = exportData;
  window.importData = importData;
  window.selectYear = selectYear;
  window.renderProjekti = renderProjekti;
  window.renderKlijenti = renderKlijenti;
}

// Wait for DOM and Firebase to be ready
function startApp() {
  console.log('Starting app...');
  console.log('Firebase available:', typeof firebase !== 'undefined');
  
  if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    console.log('DOM already loaded, initializing app');
    initApp();
  }
}

// Debug function for testing
window.testFirebase = function() {
  console.log('Testing Firebase...');
  console.log('Firebase object:', typeof firebase !== 'undefined' ? firebase : 'undefined');
  if (typeof firebase !== 'undefined') {
    console.log('Firebase apps:', firebase.apps);
    console.log('Firebase auth:', firebase.auth);
    console.log('Firebase database:', firebase.database);
  }
};

if (window.firebase) {
  console.log('Firebase found in window, starting app');
  startApp();
} else {
  console.log('Firebase not yet loaded, waiting for load event');
  window.addEventListener('load', startApp);
}
