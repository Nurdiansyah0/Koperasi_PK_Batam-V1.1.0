<?php
use PHPUnit\Framework\TestCase;

class ApiLoginTest extends TestCase
{
    private $baseUrl = 'http://127.0.0.1:8000/api/api.php';

    public function testLoginFailedWithInvalidCredentials()
    {
        $data = json_encode([
            'username' => 'wronguser',
            'password' => 'wrongpass'
        ]);

        $options = [
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\n",
                'content' => $data,
                'ignore_errors' => true
            ]
        ];

        $context  = stream_context_create($options);
        $response = file_get_contents($this->baseUrl . '?action=login', false, $context);
        
        $this->assertNotFalse($response);
        $json = json_decode($response, true);
        
        // Output response for debugging if it fails
        if (!$json) {
            echo "\nResponse was: " . $response . "\n";
        }
        
        $this->assertArrayHasKey('success', $json);
        $this->assertFalse($json['success']);
    }
}
