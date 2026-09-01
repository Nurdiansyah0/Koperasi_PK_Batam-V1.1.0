<?php
require_once __DIR__ . '/ApiTestCase.php';

class AdminApiTest extends ApiTestCase
{
    public function testGetLaporanTransaksiFailsWithoutToken()
    {
        $response = $this->makeRequest('getLaporanTransaksi', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
        // Usually should say "Token tidak valid" or something
    }

    public function testGetDataAnggotaFailsWithoutToken()
    {
        $response = $this->makeRequest('getDataAnggota', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }

    public function testGetDataKasirFailsWithoutToken()
    {
        $response = $this->makeRequest('getDataKasir', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }

    public function testGetShuDistribusiFailsWithoutToken()
    {
        $response = $this->makeRequest('getShuDistribusi', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }
}
