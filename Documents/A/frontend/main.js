document.addEventListener('DOMContentLoaded', function() {
  // Pastikan overlay loading hanya satu dan tidak duplikat
  let oldOverlay = document.querySelectorAll('#loading-overlay');
  if (oldOverlay.length > 1) {
    // Hapus semua kecuali satu
    for (let i = 1; i < oldOverlay.length; i++) {
      oldOverlay[i].remove();
    }
  }

  // Ambil overlay loading dari DOM (bukan buat baru)
  let loadingOverlay = document.getElementById('loading-overlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <div class="loading-text">Memproses gambar...</div>
      </div>
    `;
    loadingOverlay.style.display = 'none'; // Pastikan overlay hidden secara default
    document.body.appendChild(loadingOverlay);
  } else {
    loadingOverlay.style.display = 'none'; // Jika sudah ada, pastikan tetap hidden
  }

  function showLoading() {
    loadingOverlay.classList.add('show');
    loadingOverlay.style.display = '';
  }
  function hideLoading() {
    loadingOverlay.classList.remove('show');
    loadingOverlay.style.display = '';
  }

  document.getElementById('upload-button').addEventListener('click', function (e) {
    console.log('DEBUG: upload-button clicked');
    e.preventDefault(); // <-- Tambahkan ini agar form tidak reload
    const fileInput = document.getElementById('image-upload');
    const file = fileInput.files[0];
    const token = localStorage.getItem('token');

    if (!token) {
      showError('Anda harus login terlebih dahulu.');
      return;
    }

    // Periksa jika file dipilih
    if (file) {
      const formData = new FormData();
      formData.append('file', file);  // Kirimkan file dengan nama "file"

      // Tampilkan loading
      showLoading(); // Tampilkan loading overlay

      // Kirimkan ke backend menggunakan fetch
      fetch('http://127.0.0.1:8000/upload/', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
        .then((response) => {
          // Sembunyikan loading setelah respons diterima
          hideLoading(); // Sembunyikan loading overlay
          console.log("Status respons dari backend:", response.status);
          if (response.ok) {
            return response.json();
          } else {
            // Cek error 401 dari backend
            if (response.status === 401) {
              handle401();
              throw new Error('401');
            }
            return response.json().then(data => {
              showError(data.detail || 'Gagal mengunggah gambar');
              throw new Error(data.detail || 'Failed to upload image');
            });
          }
        })
        .then((data) => {
          console.log("Data yang diterima dari backend:", data);

          if (data.error) {
            console.error('Error:', data.error);
            showError('Terjadi kesalahan saat mengunggah gambar.');
            return;
          }

          console.log('Sukses:', data);
          showError('');

          // Tampilkan gambar setelah diupload
          const imageUrl = `http://127.0.0.1:8000/images/${data.filename}`;
          const imgElement = document.createElement('img');
          imgElement.src = imageUrl;
          imgElement.width = 300;
          document.getElementById('image-preview').innerHTML = '';
          document.getElementById('image-preview').appendChild(imgElement);

          // Tampilkan kandungan gizi dan perbandingan kebutuhan harian
          const kandungan = data.kandungan_gizi || {};
          const kebutuhan = data.kebutuhan_harian || {};
          const perbandingan = data.perbandingan || [];
          let kandunganHtml = `<h3>Kandungan Gizi</h3><div class="nutrition-table"><table><tbody>`;
          for (const key in kandungan) {
            let label = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            kandunganHtml += `<tr><td>${label}</td><td>${kandungan[key] !== null && kandungan[key] !== undefined ? kandungan[key] : 0}</td></tr>`;
          }
          kandunganHtml += '</tbody></table></div>';
          let kebutuhanHtml = '';
          let notificationHtml = '';
          if (perbandingan.length > 0) {
            kebutuhanHtml = `<h3>Perbandingan Kebutuhan Harian</h3><div class="nutrition-table"><table><thead><tr><th>Gizi</th><th>Hasil OCR</th><th>Kebutuhan</th><th>Status</th></tr></thead><tbody>`;
            perbandingan.forEach(row => {
              kebutuhanHtml += `<tr><td>${row.label}</td><td>${row.hasil_ocr}</td><td>${row.kebutuhan_harian}</td><td style="color:${row.status==='Melebihi'?'#b30000':'#1a7f37'};font-weight:600;">${row.status}</td></tr>`;
            });
            kebutuhanHtml += '</tbody></table></div>';
            // Tambahkan notifikasi jika ada yang melebihi
            const adaMelebihi = perbandingan.some(row => row.status === 'Melebihi');
            if (adaMelebihi) {
              notificationHtml = `<div id="nutrition-alert" class="alert alert-warning" style="margin-top:16px;display:block;">\u26A0\uFE0F Peringatan: Ada kandungan gizi yang <b>melebihi kebutuhan harian</b>!</div>`;
            } else {
              notificationHtml = '';
            }
          }
          document.getElementById('ocr-result').innerHTML = kandunganHtml + kebutuhanHtml + notificationHtml;
        })
        .catch((error) => {
          hideLoading(); // Sembunyikan loading jika error
          if (error && error.message && error.message.toLowerCase().includes('401')) {
            // Jika error 401, hapus token dan paksa user login ulang
            handle401();
          } else {
            console.error('Error:', error);
            showError('Terjadi kesalahan saat mengunggah gambar.');
          }
        });
    } else {
      showError('Silakan pilih gambar terlebih dahulu.');  // Menampilkan error jika gambar belum dipilih
    }
    return false;
  });

  // Fungsi untuk menampilkan pesan error di halaman
  function showError(message) {
    const errorMessageDiv = document.getElementById('message');
    errorMessageDiv.textContent = message;
    if (message) {
      errorMessageDiv.classList.add('alert');  // Pastikan class untuk styling error
    } else {
      errorMessageDiv.classList.remove('alert');
    }
  }

  // Tambahkan form register
  const container = document.querySelector('.container');
  const registerForm = document.createElement('form');
  registerForm.id = 'register-form';
  registerForm.innerHTML = `
    <h2>Register</h2>
    <div class="form-group"><input type="text" id="reg-nama" class="form-input" placeholder="Nama" required></div>
    <div class="form-group"><input type="email" id="reg-email" class="form-input" placeholder="Email" required></div>
    <div class="form-group"><input type="password" id="reg-password" class="form-input" placeholder="Password" required></div>
    <div class="form-group"><input type="number" id="reg-bb" class="form-input" placeholder="Berat Badan (kg)" required></div>
    <div class="form-group"><input type="number" id="reg-tinggi" class="form-input" placeholder="Tinggi (cm)" required></div>
    <div class="form-group">
      <label style="margin-bottom:4px;">Jenis Kelamin:</label>
      <label style="margin-right:12px;"><input type="radio" name="reg-gender" id="reg-gender-male" value="Laki-laki" checked> Laki-laki</label>
      <label><input type="radio" name="reg-gender" id="reg-gender-female" value="Perempuan"> Perempuan</label>
    </div>
    <div class="form-group">
      <label for="reg-umur" style="margin-bottom:4px;">Umur:</label>
      <input type="number" id="reg-umur" class="form-input" placeholder="Umur" required style="width:60%;display:inline-block;"> 
      <select id="reg-umur-satuan" class="form-input" style="width:38%;display:inline-block;margin-left:2%;">
        <option value="tahun" selected>Tahun</option>
        <option value="bulan">Bulan</option>
      </select>
    </div>
    <div class="form-group">
      <label><input type="checkbox" id="reg-hamil"> Ibu Hamil</label>
      <label style="margin-left:16px;"><input type="checkbox" id="reg-menyusui"> Ibu Menyusui</label>
    </div>
    <div class="form-group" id="reg-hamil-detail" style="display:none;">
      <label for="reg-usia-kandungan">Usia Kandungan (bulan):</label>
      <input type="number" id="reg-usia-kandungan" class="form-input" min="1" max="12" placeholder="Usia kandungan dalam bulan">
    </div>
    <div class="form-group" id="reg-menyusui-detail" style="display:none;">
      <label for="reg-umur-anak">Umur Anak (bulan):</label>
      <input type="number" id="reg-umur-anak" class="form-input" min="0" max="60" placeholder="Umur anak dalam bulan">
    </div>
    <button type="submit" class="form-btn">Daftar</button>
    <div id="register-message" class="alert"></div>
    <p>Sudah punya akun? <a href="#" id="show-login">Login</a></p>
  `;

  // Tampilkan/hidden input usia kandungan jika checkbox hamil dicentang
  registerForm.querySelector('#reg-hamil').addEventListener('change', function() {
    const hamil = this;
    const menyusui = registerForm.querySelector('#reg-menyusui');
    const detail = document.getElementById('reg-hamil-detail');
    if (hamil.checked) {
      detail.style.display = 'block';
      // Uncheck menyusui jika hamil dicentang
      menyusui.checked = false;
      document.getElementById('reg-menyusui-detail').style.display = 'none';
      document.getElementById('reg-umur-anak').value = '';
    } else {
      detail.style.display = 'none';
      document.getElementById('reg-usia-kandungan').value = '';
    }
  });
  // Tampilkan/hidden input umur anak jika checkbox menyusui dicentang
  registerForm.querySelector('#reg-menyusui').addEventListener('change', function() {
    const menyusui = this;
    const hamil = registerForm.querySelector('#reg-hamil');
    const detail = document.getElementById('reg-menyusui-detail');
    if (menyusui.checked) {
      detail.style.display = 'block';
      // Uncheck hamil jika menyusui dicentang
      hamil.checked = false;
      document.getElementById('reg-hamil-detail').style.display = 'none';
      document.getElementById('reg-usia-kandungan').value = '';
    } else {
      detail.style.display = 'none';
      document.getElementById('reg-umur-anak').value = '';
    }
  });

  // Tambahkan form login
  const loginForm = document.createElement('form');
  loginForm.id = 'login-form';
  loginForm.innerHTML = `
    <h2>Login</h2>
    <input type="email" id="login-email" placeholder="Email" required><br>
    <input type="password" id="login-password" placeholder="Password" required><br>
    <button type="submit">Login</button>
    <div id="login-message" class="alert"></div>
    <p>Belum punya akun? <a href="#" id="show-register">Register</a></p>
  `;

  // Fungsi untuk menampilkan form
  function showForm(form) {
    document.getElementById('image-upload').style.display = 'none';
    document.getElementById('upload-button').style.display = 'none';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('ocr-result').style.display = 'none';
    document.getElementById('message').style.display = 'none';
    if (!container.contains(form)) {
      container.appendChild(form);
    }
    registerForm.style.display = 'none';
    loginForm.style.display = 'none';
    form.style.display = 'block';
  }

  // Tampilkan form login di awal
  showForm(loginForm);

  // Hapus overlay loading yang mungkin ada di dalam .container (jika ada), baik sebelum maupun setelah overlay utama dibuat
  document.querySelectorAll('.container #loading-overlay').forEach(el => el.remove());

  // Tambahkan tombol navigasi utama
  const navDiv = document.createElement('div');
  navDiv.id = 'main-nav';
  navDiv.innerHTML = `
    <button id="nav-login">Login</button>
    <button id="nav-register">Register</button>
    <button id="nav-upload">Upload Gambar</button>
  `;
  container.insertBefore(navDiv, container.firstChild);

  // Event tombol navigasi
  const navLogin = document.getElementById('nav-login');
  const navRegister = document.getElementById('nav-register');
  const navUpload = document.getElementById('nav-upload');

  navLogin.onclick = function() {
    showForm(loginForm);
  };
  navRegister.onclick = function() {
    showForm(registerForm);
  };
  navUpload.onclick = function() {
    // Hanya tampilkan upload jika sudah login
    if (localStorage.getItem('token')) {
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      document.getElementById('image-upload').style.display = 'block';
      document.getElementById('upload-button').style.display = 'block';
      document.getElementById('image-preview').style.display = 'block';
      document.getElementById('ocr-result').style.display = 'block';
      document.getElementById('message').style.display = 'block';
    } else {
      showForm(loginForm);
      showError('Silakan login terlebih dahulu untuk upload gambar.');
    }
  };

  // Event submit register
  registerForm.onsubmit = function(e) {
    e.preventDefault();
    const nama = document.getElementById('reg-nama').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const bb = document.getElementById('reg-bb').value;
    const tinggi = document.getElementById('reg-tinggi').value;
    const gender = document.getElementById('reg-gender-female').checked ? 'Perempuan' : 'Laki-laki';
    const umur = document.getElementById('reg-umur').value;
    const umur_satuan = document.getElementById('reg-umur-satuan').value;
    const isHamil = document.getElementById('reg-hamil').checked;
    const usiaKandungan = isHamil ? document.getElementById('reg-usia-kandungan').value : null;
    const isMenyusui = document.getElementById('reg-menyusui').checked;
    const umurAnak = isMenyusui ? document.getElementById('reg-umur-anak').value : null;
    fetch('http://127.0.0.1:8000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, email, password, bb: Number(bb), tinggi: Number(tinggi), gender, umur: Number(umur), umur_satuan, hamil: isHamil, usia_kandungan: usiaKandungan ? Number(usiaKandungan) : null, menyusui: isMenyusui, umur_anak: umurAnak ? Number(umurAnak) : null })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        const msg = document.getElementById('register-message');
        if (status === 200) {
          msg.textContent = 'Registrasi berhasil! Login otomatis...';
          msg.className = 'alert alert-success';
          msg.style.display = 'block';
          // Otomatis login setelah register
          fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })
            .then(res => res.json().then(data => ({ status: res.status, data })))
            .then(({ status, data }) => {
              if (status === 200 && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('name', data.name);
                showForm(loginForm); // Sembunyikan form register
                setNavState(true);
                // Tampilkan upload
                loginForm.style.display = 'none';
                document.getElementById('image-upload').style.display = 'block';
                document.getElementById('upload-button').style.display = 'block';
                document.getElementById('image-preview').style.display = 'block';
                document.getElementById('ocr-result').style.display = 'block';
                document.getElementById('message').style.display = 'block';
                showDailyNutritionButton();
              } else {
                msg.textContent = 'Registrasi berhasil, tapi gagal login otomatis.';
                msg.className = 'alert';
                msg.style.display = 'block';
              }
            });
        } else {
          msg.textContent = data.detail || 'Registrasi gagal';
          msg.className = 'alert';
          msg.style.display = 'block';
        }
      })
      .catch(() => {
        const msg = document.getElementById('register-message');
        msg.textContent = 'Terjadi kesalahan saat registrasi.';
        msg.className = 'alert';
        msg.style.display = 'block';
      });
  };

  // Pastikan tombol upload tidak berada di dalam form
  // Jika tombol upload berada di dalam <form>, event click akan tetap trigger submit form (dan reload)
  // Solusi: Pindahkan tombol upload di luar form, atau tambahkan event listener pada form upload jika ada

  // Jika ada form yang membungkus upload, tambahkan:
  // document.getElementById('upload-form').onsubmit = function(e) { e.preventDefault(); };
  // Namun, lebih baik tombol upload di luar form.

  // Tambahkan tombol logout
  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'nav-logout';
  logoutBtn.textContent = 'Keluar';
  logoutBtn.style.display = 'none';
  container.querySelector('#main-nav').appendChild(logoutBtn);

  function setNavState(loggedIn) {
    navLogin.style.display = loggedIn ? 'none' : 'inline-block';
    navRegister.style.display = loggedIn ? 'none' : 'inline-block';
    navUpload.style.display = loggedIn ? 'inline-block' : 'none';
    logoutBtn.style.display = loggedIn ? 'inline-block' : 'none';
  }

  logoutBtn.onclick = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('name');
    setNavState(false);
    showForm(loginForm);
    showError('Anda telah keluar.');
  };

  // Cek status login saat load
  if (localStorage.getItem('token')) {
    setNavState(true);
    // Tampilkan upload jika sudah login
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    document.getElementById('image-upload').style.display = 'block';
    document.getElementById('upload-button').style.display = 'block';
    document.getElementById('image-preview').style.display = 'block';
    document.getElementById('ocr-result').style.display = 'block';
    document.getElementById('message').style.display = 'block';
    showDailyNutritionButton();
  } else {
    setNavState(false);
  }

  // Update nav state on login
  loginForm.onsubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    fetch('http://127.0.0.1:8000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        const msg = document.getElementById('login-message');
        if (status === 200 && data.token) {
          msg.textContent = 'Login berhasil!';
          msg.className = 'alert alert-success';
          msg.style.display = 'block';
          // Simpan token ke localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('name', data.name);
          // Sembunyikan form login dan tampilkan fitur upload
          loginForm.style.display = 'none';
          document.getElementById('image-upload').style.display = 'block';
          document.getElementById('upload-button').style.display = 'block';
          document.getElementById('image-preview').style.display = 'block';
          document.getElementById('ocr-result').style.display = 'block';
          document.getElementById('message').style.display = 'block';
          setNavState(true);
          showDailyNutritionButton();
        } else {
          msg.textContent = data.detail || 'Login gagal';
          msg.className = 'alert';
          msg.style.display = 'block';
        }
      })
      .catch(() => {
        const msg = document.getElementById('login-message');
        msg.textContent = 'Terjadi kesalahan saat login.';
        msg.className = 'alert';
        msg.style.display = 'block';
      });
  };

  // Fungsi untuk fetch kebutuhan harian user
  async function fetchDailyNutrition() {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Panggil endpoint upload dengan file kosong (atau buat endpoint khusus kebutuhan harian jika ingin lebih baik)
    // Di sini kita gunakan endpoint upload dengan file dummy agar backend tetap proses kebutuhan harian
    // Lebih baik: buat endpoint /daily-nutrition di backend, tapi untuk sekarang gunakan solusi ini
  }

  // Tampilkan button setelah login
  function showDailyNutritionButton() {
    document.getElementById('daily-nutrition-section').style.display = 'block';
  }

  // Event listener button
  const showBtn = document.getElementById('show-daily-nutrition');
  if (showBtn) {
    showBtn.addEventListener('click', async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Panggil endpoint khusus kebutuhan harian
      const res = await fetch('http://localhost:8000/daily-nutrition', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      let html = '<h3>Kebutuhan Gizi Harian</h3><table style="width:100%;border-collapse:collapse;">';
      html += '<tr><th>Gizi</th><th>Kebutuhan</th></tr>';
      if (data.kebutuhan_harian && Object.keys(data.kebutuhan_harian).length > 0) {
        for (const key in data.kebutuhan_harian) {
          let label = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          html += `<tr><td>${label}</td><td>${data.kebutuhan_harian[key]}</td></tr>`;
        }
      } else {
        html += '<tr><td colspan="2">Tidak ada data kebutuhan harian.</td></tr>';
      }
      html += '</table>';
      document.getElementById('daily-nutrition-modal').innerHTML = html;
      document.getElementById('daily-nutrition-modal').style.display = 'block';
    });
  }

  // Panggil showDailyNutritionButton setelah login sukses
  function handleLoginSuccess() {
    // ...existing code...
    showDailyNutritionButton();
    // ...existing code...
  }

  // Update nav state on logout (juga pada error 401 upload)
  function handle401() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('name');
    setNavState(false);
    showForm(loginForm);
    showError('Sesi login Anda sudah habis, silakan login ulang.');
  }

  // Tambahkan tombol Riwayat Scan di nav
  const historyBtn = document.createElement('button');
  historyBtn.id = 'nav-history';
  historyBtn.textContent = 'Riwayat Scan';
  historyBtn.style.display = 'inline-block';
  container.querySelector('#main-nav').appendChild(historyBtn);

  // Modal untuk riwayat scan
  let historyModal = document.getElementById('scan-history-modal');
  if (!historyModal) {
    historyModal = document.createElement('div');
    historyModal.id = 'scan-history-modal';
    historyModal.style.display = 'none';
    historyModal.style.position = 'fixed';
    historyModal.style.left = '0';
    historyModal.style.top = '0';
    historyModal.style.width = '100vw';
    historyModal.style.height = '100vh';
    historyModal.style.background = 'rgba(0,0,0,0.4)';
    historyModal.style.zIndex = '1000';
    historyModal.innerHTML = '<div id="scan-history-content" style="background:#fff;margin:5% auto;padding:24px;max-width:500px;border-radius:8px;position:relative;"></div>';
    document.body.appendChild(historyModal);
  }

  // Fungsi untuk fetch dan tampilkan riwayat scan
  async function showScanHistory() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch('http://127.0.0.1:8000/scan-history', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    let html = '<h3>Riwayat Scan</h3>';
    if (data.history && data.history.length > 0) {
      html += '<table style="width:100%;border-collapse:collapse;"><tr><th>Nama File</th><th>Tanggal Upload</th><th>Nilai Gizi OCR</th><th></th><th></th></tr>';
      data.history.forEach(item => {
        // Format nilai gizi utama
        let giziStr = '';
        if (item.kandungan_gizi && Object.keys(item.kandungan_gizi).length > 0) {
          const giziUtama = ['energi','protein','lemak total','karbohidrat','serat','gula','garam'];
          giziStr = giziUtama.map(k => `${k.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}: <b>${item.kandungan_gizi[k] ?? 0}</b>`).join('<br>');
        } else {
          giziStr = '<i>-</i>';
        }
        html += `<tr><td>${item.filename}</td><td>${item.uploaded_at}</td><td style='font-size:13px;'>${giziStr}</td><td><button class='see-image-btn' data-filename='${item.filename}'>Lihat Gambar</button></td><td><button class='delete-image-btn' data-filename='${item.filename}' style='color:#b30000;'>Hapus</button></td></tr>`;
      });
      html += '</table>';
    } else {
      html += '<p>Tidak ada riwayat scan.</p>';
    }
    html += '<button id="close-history-modal" style="margin-top:16px;">Tutup</button>';
    document.getElementById('scan-history-content').innerHTML = html;
    historyModal.style.display = 'block';
    document.getElementById('close-history-modal').onclick = function() {
      historyModal.style.display = 'none';
    };
    // Event listener untuk tombol lihat gambar
    document.querySelectorAll('.see-image-btn').forEach(btn => {
      btn.onclick = function() {
        const filename = this.getAttribute('data-filename');
        const imgUrl = `http://127.0.0.1:8000/images/${filename}`;
        // Modal gambar
        let imgModal = document.getElementById('img-modal');
        if (!imgModal) {
          imgModal = document.createElement('div');
          imgModal.id = 'img-modal';
          imgModal.style.position = 'fixed';
          imgModal.style.left = '0';
          imgModal.style.top = '0';
          imgModal.style.width = '100vw';
          imgModal.style.height = '100vh';
          imgModal.style.background = 'rgba(0,0,0,0.5)';
          imgModal.style.zIndex = '2000';
          imgModal.innerHTML = '<div id="img-modal-content" style="background:#fff;margin:5% auto;padding:24px;max-width:600px;border-radius:8px;position:relative;text-align:center;"></div>';
          document.body.appendChild(imgModal);
        }
        document.getElementById('img-modal-content').innerHTML = `<img src='${imgUrl}' style='max-width:100%;max-height:70vh;border-radius:8px;'><br><button id='close-img-modal' style='margin-top:16px;'>Tutup</button>`;
        imgModal.style.display = 'block';
        document.getElementById('close-img-modal').onclick = function() {
          imgModal.style.display = 'none';
        };
      };
    });
    // Event listener untuk tombol hapus gambar
    document.querySelectorAll('.delete-image-btn').forEach(btn => {
      btn.onclick = async function() {
        const filename = this.getAttribute('data-filename');
        if (!confirm('Yakin ingin menghapus gambar ini?')) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/delete/${filename}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          alert('Gambar berhasil dihapus!');
          showScanHistory(); // refresh
        } else {
          alert('Gagal menghapus gambar.');
        }
      };
    });
  }

  historyBtn.onclick = function() {
    showScanHistory();
  };
});