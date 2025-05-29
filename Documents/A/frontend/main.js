document.getElementById('upload-button').addEventListener('click', function () {
  const fileInput = document.getElementById('image-upload');
  const file = fileInput.files[0];

  // Periksa jika file dipilih
  if (file) {
    const formData = new FormData();
    formData.append('file', file);  // Kirimkan file dengan nama "file"

    // Kirimkan ke backend menggunakan fetch
    fetch('http://127.0.0.1:8000/upload/', {
      method: 'POST',
      body: formData,  // FormData yang mengandung file
    })
      .then((response) => {
        console.log("Status respons dari backend:", response.status);  // Log status respons
        if (response.ok) {
          return response.json();  // Mendapatkan respons dari backend dalam format JSON
        } else {
          console.error('Gagal mengunggah gambar, status:', response.status);
          throw new Error("Failed to upload image");
        }
      })
      .then((data) => {
        console.log("Data yang diterima dari backend:", data); // Log data respons

        // Pastikan respons memiliki properti yang benar
        if (data.error) {
          console.error('Error:', data.error);  // Log error jika ada
          showError('Terjadi kesalahan saat mengunggah gambar.'); // Menampilkan error ke halaman
          return; // Jika ada error, hentikan eksekusi lebih lanjut
        }

        console.log('Sukses:', data);
        showError(''); // Clear error jika upload berhasil

        // Tampilkan gambar setelah diupload
        const imageUrl = `http://127.0.0.1:8000/images/${data.id}`;  // Pastikan ID ada
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.width = 300; // Atur ukuran gambar
        document.getElementById('image-preview').innerHTML = ''; // Hapus gambar sebelumnya
        document.getElementById('image-preview').appendChild(imgElement); // Tampilkan gambar baru

        // Clear previous OCR result before showing new result
        document.getElementById('ocr-result').innerHTML = ''; // Clear previous OCR result

        // Menampilkan hasil OCR
        if (data.ocr_result && Array.isArray(data.ocr_result)) {
          const ocrText = data.ocr_result.join(' ');  // Gabungkan semua hasil OCR
          document.getElementById('ocr-result').innerHTML = `<h3>Hasil OCR:</h3><p>${ocrText}</p>`;
        } else {
          document.getElementById('ocr-result').innerHTML = `<h3>Hasil OCR:</h3><p>Tidak ada teks yang terdeteksi.</p>`;
        }
      })
      .catch((error) => {
        console.error('Error:', error);  // Debug: Lihat error dari fetch
        showError('Terjadi kesalahan saat mengunggah gambar.');  // Menampilkan error ke halaman
      });
  } else {
    showError('Silakan pilih gambar terlebih dahulu.');  // Menampilkan error jika gambar belum dipilih
  }
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
