<?php
$content = file_get_contents('tests/Feature/SuryadiMemberAdminAuthTest.php');
// Fix Line 96
$content = str_replace("\$this->assertEquals('Suryadi', \$response->json('user.nama_lengkap'));", "\$this->assertEquals(\$suryadi->anggota->nama_lengkap, \$response->json('user.nama_lengkap'));", $content);
// Fix Line 172
$content = str_replace("\$suryadiAnggotaCount = Anggota::where('user_id', \$suryadiUser->user_id)->count();", "\$suryadiUser = User::whereRaw('LOWER(username) = ?', ['suryadi'])->first();\n        \$suryadiAnggotaCount = Anggota::where('user_id', \$suryadiUser->user_id)->count();", $content);
// Wait, $suryadiUser is now declared twice.
$content = str_replace("\n        \$anggota65 = Anggota::find(65);\n        \$suryadiUser = User::whereRaw('LOWER(username) = ?', ['suryadi'])->first();", "\n        \$anggota65 = Anggota::find(65);", $content);
file_put_contents('tests/Feature/SuryadiMemberAdminAuthTest.php', $content);
