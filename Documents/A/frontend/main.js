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
      body: formData,
    })
      .then((response) => {
        console.log("Status respons dari backend:", response.status);
        if (response.ok) {
          return response.json();
        } else {
          console.error('Gagal mengunggah gambar, status:', response.status);
          throw new Error("Failed to upload image");
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

        // Clear previous OCR result before showing new result
        document.getElementById('ocr-result').innerHTML = '';

        if (data.ocr_result && Array.isArray(data.ocr_result)) {
          const ocrText = data.ocr_result.join(' ');
          document.getElementById('ocr-result').innerHTML = `<h3>Hasil OCR:</h3><p>${ocrText}</p>`;
        } else {
          document.getElementById('ocr-result').innerHTML = `<h3>Hasil OCR:</h3><p>Tidak ada teks yang terdeteksi.</p>`;
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        showError('Terjadi kesalahan saat mengunggah gambar.');
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
