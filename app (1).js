
// Wait for Firebase SDK to load, then initialize
function initApp() {
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
  firebase.initializeApp(firebaseConfig);
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
    const passEl = document.getElementById('login-pass');
    if (!emailEl || !passEl) return;
    const email = emailEl.value;
    const pass = passEl.value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => alert('Greska: ' + err.message));
  }

  function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    if (pass.length < 6) { alert('Lozinka mora imati najmanje 6 znakova'); return; }
    auth.createUserWithEmailAndPassword(email, pass).catch(err => alert('Greska: ' + err.message));
  }

  function handleLogout() { auth.signOut(); }

  function onAuthStateChanged(user) {
    currentUser = user;
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    if (!authScreen || !appScreen) return;
    if (user) {
      loadUserData();
      authScreen.style.display = 'none';
      appScreen.style.display = 'block';
    } else {
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

  // Navigation
  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => { if(p) p.style.display = 'none'; });
    const targetPage = document.getElementById('pg-' + page);
    if (targetPage) targetPage.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => { if(n) n.classList.remove('active'); });
    const navBtn = document.querySelector('.nav-item[onclick="navigateTo('" + page + "')"]');
    if (navBtn) navBtn.classList.add('active');
    if (page === 'dashboard') renderDashboard();
    if (page === 'projekti') renderProjekti();
    if (page === 'klijenti') renderKlijenti();
    if (page === 'rashodi') renderRashodi();
    if (page === 'materijal') renderMaterijal();
  }

  // Year tabs
  function renderYearTabs() {
    const years = [...new Set([currentYear, ...userData.projekti.map(p => new Date(p.datum).getFullYear())])].sort((a,b) => b-a);
    document.getElementById('year-tabs').innerHTML = years.map(y => 
      '<button class="year-tab ' + (y === currentYear ? 'active' : '') + '" onclick="selectYear(' + y + ')">' + y + '</button>'
    ).join('');
  }

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
    document.getElementById('dash-prihodi').textContent = ukupnoPrihodi.toFixed(2) + ' KM';
    document.getElementById('dash-rashodi').textContent = ukupnoRashodi.toFixed(2) + ' KM';
    document.getElementById('dash-profit').textContent = profit.toFixed(2) + ' KM';
    document.getElementById('dash-placeno').textContent = placeno.toFixed(2) + ' KM';
    document.getElementById('dash-neplaceno').textContent = neplaceno.toFixed(2) + ' KM';
    document.getElementById('dash-projekata').textContent = yearProjekti.length;
    document.getElementById('dash-zavrseni').textContent = zavrseni;
    document.getElementById('dash-utijeku').textContent = uTijeku;
    renderChart(yearProjekti, yearRashodi);
  }

  function renderChart(projekti, rashodi) {
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const prihodi = months.map((_, i) => projekti.filter(p => new Date(p.datum).getMonth() === i).reduce((s, p) => s + (parseFloat(p.cijena) || 0), 0));
    const rash = months.map((_, i) => rashodi.filter(r => new Date(r.datum).getMonth() === i).reduce((s, r) => s + (parseFloat(r.iznos) || 0), 0));
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: months, datasets: [{ label: 'Prihodi', data: prihodi, backgroundColor: '#2ecc71' }, { label: 'Rashodi', data: rash, backgroundColor: '#e74c3c' }] },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
  }

  // Projekti
  function renderProjekti() {
    const search = document.getElementById('proj-search').value.toLowerCase();
    const yearProjekti = userData.projekti.filter(p => new Date(p.datum).getFullYear() === currentYear);
    const filtered = yearProjekti.filter(p => !search || (p.klijent && p.klijent.toLowerCase().includes(search)) || (p.adresa && p.adresa.toLowerCase().includes(search))).sort((a, b) => new Date(b.datum) - new Date(a.datum));
    document.getElementById('tbl-projekti').innerHTML = filtered.map((p, i) => {
      const klijent = userData.klijenti.find(k => k.id === p.klijentId) || { ime: p.klijent || 'Nepoznato' };
      const idx = userData.projekti.indexOf(p);
      return '<tr><td>' + p.datum + '</td><td>' + klijent.ime + '</td><td>' + (p.adresa || '') + '</td><td>' + (p.m2 || '') + '</td><td>' + (parseFloat(p.cijena) || 0).toFixed(2) + ' KM</td><td><span class="status-' + p.status + '">' + (p.status === 'zavrsen' ? 'Zavrsen' : 'U tijeku') + '</span></td><td><input type="checkbox" ' + (p.placeno ? 'checked' : '') + ' onclick="togglePaid(' + idx + ')"></td><td><button class="btn-small" onclick="editProjekt(' + idx + ')">✏️</button> <button class="btn-small" onclick="deleteProjekt(' + idx + ')">🗑️</button></td></tr>';
    }).join('');
  }

  function openProjektModal(projektIndex = null) {
    const projekt = projektIndex !== null ? userData.projekti[projektIndex] : null;
    const klijentiOpts = userData.klijenti.map(k => '<option value="' + k.id + '" ' + (projekt && projekt.klijentId === k.id ? 'selected' : '') + '>' + k.ime + '</option>').join('');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('modal-content').innerHTML = 
      '<h3>' + (projekt ? 'Uredi projekt' : 'Novi projekt') + '</h3>' +
      '<form onsubmit="saveProjekt(event, ' + projektIndex + ')">' +
      '<label>Klijent</label><select name="klijentId" required>' + klijentiOpts + '</select>' +
      '<label>Datum</label><input type="date" name="datum" value="' + (projekt ? projekt.datum : today) + '" required>' +
      '<label>Adresa</label><input type="text" name="adresa" value="' + (projekt ? projekt.adresa || '' : '') + '">' +
      '<label>m2</label><input type="number" name="m2" value="' + (projekt ? projekt.m2 || '' : '') + '">' +
      '<label>Cijena (KM)</label><input type="number" name="cijena" step="0.01" value="' + (projekt ? projekt.cijena || '' : '') + '" required>' +
      '<label>Status</label><select name="status"><option value="u_tijeku" ' + (projekt && projekt.status === 'u_tijeku' ? 'selected' : '') + '>U tijeku</option><option value="zavrsen" ' + (projekt && projekt.status === 'zavrsen' ? 'selected' : '') + '>Zavrsen</option></select>' +
      '<label>Napomena</label><textarea name="napomena">' + (projekt ? projekt.napomena || '' : '') + '</textarea>' +
      '<button type="submit" class="btn btn-accent">Spremi</button></form>';
    document.getElementById('modal').style.display = 'flex';
  }

  function saveProjekt(e, index) {
    e.preventDefault();
    const f = e.target;
    const projekt = { klijentId: f.klijentId.value, datum: f.datum.value, adresa: f.adresa.value, m2: f.m2.value, cijena: parseFloat(f.cijena.value), status: f.status.value, napomena: f.napomena.value, placeno: index !== null ? userData.projekti[index].placeno : false };
    if (index !== null) userData.projekti[index] = projekt;
    else userData.projekti.push(projekt);
    saveUserData();
    closeModal();
    renderProjekti();
  }

  function editProjekt(index) { openProjektModal(index); }
  function deleteProjekt(index) { if (confirm('Obrisi projekt?')) { userData.projekti.splice(index, 1); saveUserData(); renderProjekti(); } }
  function togglePaid(index) { userData.projekti[index].placeno = !userData.projekti[index].placeno; saveUserData(); renderProjekti(); }

  // Klijenti
  function renderKlijenti() {
    const search = document.getElementById('klijent-search').value.toLowerCase();
    const filtered = userData.klijenti.filter(k => !search || k.ime.toLowerCase().includes(search));
    document.getElementById('tbl-klijenti').innerHTML = filtered.map((k, i) => {
      const projCount = userData.projekti.filter(p => p.klijentId === k.id).length;
      return '<tr><td>' + k.ime + '</td><td>' + (k.telefon || '') + '</td><td>' + (k.adresa || '') + '</td><td>' + projCount + '</td><td><button class="btn-small" onclick="editKlijent(' + i + ')">✏️</button> <button class="btn-small" onclick="deleteKlijent(' + i + ')">🗑️</button></td></tr>';
    }).join('');
  }

  function openKlijentModal(index = null) {
    const k = index !== null ? userData.klijenti[index] : null;
    document.getElementById('modal-content').innerHTML = 
      '<h3>' + (k ? 'Uredi klijenta' : 'Novi klijent') + '</h3>' +
      '<form onsubmit="saveKlijent(event, ' + index + ')">' +
      '<label>Ime</label><input type="text" name="ime" value="' + (k ? k.ime : '') + '" required>' +
      '<label>Telefon</label><input type="tel" name="telefon" value="' + (k ? k.telefon || '' : '') + '">' +
      '<label>Adresa</label><input type="text" name="adresa" value="' + (k ? k.adresa || '' : '') + '">' +
      '<button type="submit" class="btn btn-accent">Spremi</button></form>';
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
    const yearRashodi = userData.rashodi.filter(r => new Date(r.datum).getFullYear() === currentYear);
    document.getElementById('tbl-rashodi').innerHTML = yearRashodi.map((r, i) => 
      '<tr><td>' + r.datum + '</td><td>' + r.kategorija + '</td><td>' + (r.opis || '') + '</td><td>' + (parseFloat(r.iznos) || 0).toFixed(2) + ' KM</td><td><button class="btn-small" onclick="editRashod(' + i + ')">✏️</button> <button class="btn-small" onclick="deleteRashod(' + i + ')">🗑️</button></td></tr>'
    ).join('');
  }

  function openRashodModal(index = null) {
    const r = index !== null ? userData.rashodi[index] : null;
    document.getElementById('modal-content').innerHTML = 
      '<h3>' + (r ? 'Uredi rashod' : 'Novi rashod') + '</h3>' +
      '<form onsubmit="saveRashod(event, ' + index + ')">' +
      '<label>Datum</label><input type="date" name="datum" value="' + (r ? r.datum : new Date().toISOString().split('T')[0]) + '" required>' +
      '<label>Kategorije</label><select name="kategorija"><option ' + (r && r.kategorija === 'Materijal' ? 'selected' : '') + '>Materijal</option><option ' + (r && r.kategorija === 'Alat' ? 'selected' : '') + '>Alat</option><option ' + (r && r.kategorija === 'Prijevoz' ? 'selected' : '') + '>Prijevoz</option><option ' + (r && r.kategorija === 'Ostalo' ? 'selected' : '') + '>Ostalo</option></select>' +
      '<label>Opis</label><input type="text" name="opis" value="' + (r ? r.opis || '' : '') + '">' +
      '<label>Iznos (KM)</label><input type="number" name="iznos" step="0.01" value="' + (r ? r.iznos || '' : '') + '" required>' +
      '<button type="submit" class="btn btn-accent">Spremi</button></form>';
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
    document.getElementById('tbl-materijal').innerHTML = userData.materijal.map((m, i) => 
      '<tr><td>' + m.naziv + '</td><td>' + m.kategorija + '</td><td>' + m.kolicina + '</td><td>' + m.min + '</td><td>' + (parseFloat(m.kolicina) <= parseFloat(m.min) ? '<span class="status-u_tijeku">Nisko</span>' : '<span class="status-zavrsen">OK</span>') + '</td><td><button class="btn-small" onclick="editMaterijal(' + i + ')">✏️</button> <button class="btn-small" onclick="deleteMaterijal(' + i + ')">🗑️</button></td></tr>'
    ).join('');
  }

  function openMaterijalModal(index = null) {
    const m = index !== null ? userData.materijal[index] : null;
    document.getElementById('modal-content').innerHTML = 
      '<h3>' + (m ? 'Uredi materijal' : 'Novi materijal') + '</h3>' +
      '<form onsubmit="saveMaterijal(event, ' + index + ')">' +
      '<label>Naziv</label><input type="text" name="naziv" value="' + (m ? m.naziv : '') + '" required>' +
      '<label>Kategorije</label><select name="kategorija"><option ' + (m && m.kategorija === 'Boja' ? 'selected' : '') + '>Boja</option><option ' + (m && m.kategorija === 'Gips' ? 'selected' : '') + '>Gips</option><option ' + (m && m.kategorija === 'Alat' ? 'selected' : '') + '>Alat</option><option ' + (m && m.kategorija === 'Ostalo' ? 'selected' : '') + '>Ostalo</option></select>' +
      '<label>Kolicina</label><input type="number" name="kolicina" value="' + (m ? m.kolicina : 0) + '">' +
      '<label>Min. zaliha</label><input type="number" name="min" value="' + (m ? m.min : 5) + '">' +
      '<button type="submit" class="btn btn-accent">Spremi</button></form>';
    document.getElementById('modal').style.display = 'flex';
  }

  function saveMaterijal(e, index) {
    e.preventDefault();
    const f = e.target;
    const mat = { naziv: f.naziv.value, kategorija: f.kategorija.value, kolicina: f.kolicina.value, min: f.min.value };
    if (index !== null) userData.materijal[index] = mat;
    else userData.materijal.push(mat);
    saveUserData();
    closeModal();
    renderMaterijal();
  }
  function editMaterijal(i) { openMaterijalModal(i); }
  function deleteMaterijal(i) { if (confirm('Obrisi materijal?')) { userData.materijal.splice(i, 1); saveUserData(); renderMaterijal(); } }

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

  // Start app
  auth.onAuthStateChanged(onAuthStateChanged);
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
