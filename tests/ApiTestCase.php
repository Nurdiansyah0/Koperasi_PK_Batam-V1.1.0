<?php
use PHPUnit\Framework\TestCase;

class ApiTestCase extends TestCase
{
    protected $baseUrl = 'http://127.0.0.1:8000/api/api.php';
    
    // Default token (we can mock or assume invalid if no token, just checking the response format)
    protected $token = '';

    protected function makeRequest($action, $method = 'GET', $data = [])
    {
        $options = [
            'http' => [
                'method'  => $method,
                'header'  => "Content-Type: application/json\r\n" . 
                             ($this->token ? "Authorization: Bearer {$this->token}\r\n" : ""),
                'ignore_errors' => true
            ]
        ];

        if ($method === 'POST') {
            $options['http']['content'] = json_encode($data);
        }

        $context  = stream_context_create($options);
        $url = $this->baseUrl . '?action=' . $action;
        
        $response = @file_get_contents($url, false, $context);
        
        if ($response === false) {
            return ['success' => false, 'error' => 'HTTP Request Failed'];
        }

        return json_decode($response, true) ?? ['success' => false, 'error' => 'Invalid JSON', 'raw' => $response];
    }
}
