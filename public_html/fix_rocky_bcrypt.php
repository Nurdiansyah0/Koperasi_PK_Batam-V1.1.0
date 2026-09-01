<?php
// fix_rocky_bcrypt.php
// Letakkan di public_html/

echo "<h2>Reset Password Rocky Pasaribu - BCRYPT</h2>";

// 1. Generate BCRYPT hash
$new_password = "rocky2024";
$bcrypt_hash = password_hash($new_password, PASSWORD_DEFAULT);

echo "<strong>Password:</strong> $new_password<br>";
echo "<strong>BCRYPT Hash:</strong><br>";
echo "<textarea rows='2' cols='80' style='font-family: monospace;' onclick='this.select()'>$bcrypt_hash</textarea>";
echo "<br><br>";

// 2. Database connection (sesuaikan dengan cPanel Anda)
$db_host = "localhost";
$db_user = "dqfqxjrd_koperasi_db";      // Ganti dengan username database cPanel Anda
$db_pass = "Ma2syndicate";      // Ganti dengan password database
$db_name = "	
dqfqxjrd_admin	
";  // Ganti dengan nama database

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die("❌ Koneksi database gagal: " . $conn->connect_error);
}

// 3. Update database
$sql = "UPDATE users SET password_hash = ? WHERE user_id = 24";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $bcrypt_hash);

if ($stmt->execute()) {
    echo "✅ <span style='color:green; font-size:18px;'>Password berhasil direset!</span><br><br>";
    
    // 4. Verifikasi update
    $result = $conn->query("SELECT username, LEFT(password_hash, 30) as hash_preview FROM users WHERE user_id = 24");
    $user = $result->fetch_assoc();
    
    echo "<strong>Status:</strong><br>";
    echo "Username: " . $user['username'] . "<br>";
    echo "Hash baru: " . $user['hash_preview'] . "...<br>";
    echo "Password baru: <span style='color:red; font-weight:bold;'>$new_password</span><br><br>";
    
    // 5. Test verifikasi
    if (password_verify($new_password, $bcrypt_hash)) {
        echo "✅ <span style='color:green;'>VERIFIKASI BERHASIL: Hash cocok dengan password!</span>";
    } else {
        echo "❌ <span style='color:red;'>VERIFIKASI GAGAL</span>";
    }
    
} else {
    echo "❌ Update gagal: " . $conn->error;
}

$stmt->close();
$conn->close();

echo "<hr><h3>Perbedaan Hash:</h3>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><th>Algorithm</th><th>Hash untuk 'rocky2024'</th><th>Digunakan?</th></tr>";
echo "<tr><td>MD5</td><td>c5c2c9ecf0e5633440e09ed132c5cbc2</td><td>❌ TIDAK</td></tr>";
echo "<tr><td>SHA1</td><td>0f616eb37b32c69a8767fbf32d311bf6abda6c56</td><td>❌ TIDAK</td></tr>";
echo "<tr><td>BCRYPT</td><td>" . substr($bcrypt_hash, 0, 30) . "...</td><td>✅ YA</td></tr>";
echo "</table>";

// 6. Hapus file ini setelah digunakan
echo "<hr><p style='color:orange;'><strong>⚠️ PERINGATAN:</strong> Hapus file ini setelah digunakan untuk keamanan!</p>";
?>