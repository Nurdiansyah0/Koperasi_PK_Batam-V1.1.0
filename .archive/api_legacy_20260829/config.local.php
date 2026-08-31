<?php
// config.local.php — Local Development Config
// Loaded automatically by config.php when DEV_MODE is set
$servername = "localhost";
$username   = "koperasi_user";
$password   = "koperasi_dev123";
$dbname     = "koperasi_dev";

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

global $conn;

try {
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

} catch (Exception $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    die(json_encode([
        "status"  => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]));
}
?>
