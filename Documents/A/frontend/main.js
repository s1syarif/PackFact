// Menangani klik tombol upload
document.getElementById('upload-button').addEventListener('click', function () {
  const fileInput = document.getElementById('image-upload');
  const file = fileInput.files[0];

  // Periksa jika file dipilih
  if (file) {
    const formData = new FormData();
    formData.append('file', file);  // Kirimkan file dengan nama "file"

    // Kirimkan ke backend menggunakan fetch (pastikan endpoint sesuai)
    fetch('http://127.0.0.1:8000/upload/', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json()) // Mendapatkan respons dari backend
      .then((data) => {
        console.log('Sukses:', data);
        alert('Gambar berhasil diunggah!');

        // Tampilkan gambar setelah diupload
        const imageUrl = `http://127.0.0.1:8000/images/${data.id}`;
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.width = 300; // Atur ukuran gambar
        document.getElementById('image-preview').innerHTML = ''; // Hapus gambar sebelumnya
        document.getElementById('image-preview').appendChild(imgElement); // Tampilkan gambar baru
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat mengunggah gambar.');
      });
  } else {
    alert('Silakan pilih gambar terlebih dahulu.');
  }
});
