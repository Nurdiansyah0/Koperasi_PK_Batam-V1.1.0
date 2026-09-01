<?php
require_once __DIR__ . '/ApiTestCase.php';

class KasirApiTest extends ApiTestCase
{
    public function testGetDashboardKasirFailsWithoutToken()
    {
        $response = $this->makeRequest('getDashboardKasir', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }

    public function testGetDataBarangBelanjaKasirFailsWithoutToken()
    {
        $response = $this->makeRequest('getDataBarangBelanjaKasir', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }

    public function testSimpanTransaksiKasirFailsWithoutToken()
    {
        $response = $this->makeRequest('simpanTransaksiKasir', 'POST', ['total' => 100000]);
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }
}
