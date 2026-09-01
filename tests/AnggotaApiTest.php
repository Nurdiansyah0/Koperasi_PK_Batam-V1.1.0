<?php
require_once __DIR__ . '/ApiTestCase.php';

class AnggotaApiTest extends ApiTestCase
{
    public function testGetDashboardAnggotaFailsWithoutToken()
    {
        // Actually api action is getDashboardKasir or getProfil
        $response = $this->makeRequest('getProfil', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }

    public function testBayarHutangFailsWithoutToken()
    {
        $response = $this->makeRequest('bayarHutang', 'POST', ['nominal' => 50000]);
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }

    public function testGetHistoriBayarHutangFailsWithoutToken()
    {
        $response = $this->makeRequest('getHistoriBayarHutang', 'GET');
        
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
    }
}
