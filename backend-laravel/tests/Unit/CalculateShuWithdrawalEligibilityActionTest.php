<?php

namespace Tests\Unit;

use App\Actions\Members\CalculateShuWithdrawalEligibilityAction;
use App\Models\Anggota;
use Tests\TestCase;

class CalculateShuWithdrawalEligibilityActionTest extends TestCase
{
    protected CalculateShuWithdrawalEligibilityAction $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = new CalculateShuWithdrawalEligibilityAction;
    }

    private function makeAnggota(float $shu, float $hutang): Anggota
    {
        $anggota = new Anggota;
        $anggota->shu = $shu;
        $anggota->hutang = $hutang;

        return $anggota;
    }

    public function test_basic_calculation_with_fractional_shu_and_zero_debt(): void
    {
        $anggota = $this->makeAnggota(55555.0, 0.0);
        $result = $this->action->execute($anggota, 30000.0);

        $this->assertTrue($result['purchase_qualified']);
        $this->assertTrue($result['is_eligible']);
        $this->assertEquals(55555.0, $result['eligible_shu']);
        $this->assertEquals(27777.50, $result['raw_limit']);
        $this->assertEquals(27000.0, $result['final_withdrawal_limit']);
    }

    public function test_exact_purchase_threshold_25000_is_rejected(): void
    {
        $anggota = $this->makeAnggota(500000.0, 0.0);
        $result = $this->action->execute($anggota, 25000.0);

        $this->assertFalse($result['purchase_qualified'], 'Belanja Rp 25.000 must NOT qualify');
        $this->assertFalse($result['is_eligible']);
        $this->assertEquals(100000.0, $result['final_withdrawal_limit']);
        $this->assertStringContainsString('lebih dari Rp 25.000', $result['reason']);
    }

    public function test_just_above_purchase_threshold_25001_is_qualified(): void
    {
        $anggota = $this->makeAnggota(500000.0, 0.0);
        $result = $this->action->execute($anggota, 25001.0);

        $this->assertTrue($result['purchase_qualified'], 'Belanja Rp 25.001 MUST qualify');
        $this->assertTrue($result['is_eligible']);
        $this->assertEquals(100000.0, $result['final_withdrawal_limit']);
    }

    public function test_absolute_ceiling_enforces_100000_cap(): void
    {
        // 50% of 1.000.000 is 500.000, capped at 100.000
        $anggota = $this->makeAnggota(1000000.0, 0.0);
        $result = $this->action->execute($anggota, 50000.0);

        $this->assertTrue($result['is_eligible']);
        $this->assertEquals(1000000.0, $result['eligible_shu']);
        $this->assertEquals(500000.0, $result['raw_limit']);
        $this->assertEquals(100000.0, $result['final_withdrawal_limit']);
    }

    public function test_debt_netting_against_shu(): void
    {
        // SHU 500k, Hutang 300k -> Eligible 200k -> 50% = 100k
        $anggota = $this->makeAnggota(500000.0, 300000.0);
        $result = $this->action->execute($anggota, 30000.0);

        $this->assertTrue($result['is_eligible']);
        $this->assertEquals(200000.0, $result['eligible_shu']);
        $this->assertEquals(100000.0, $result['raw_limit']);
        $this->assertEquals(100000.0, $result['final_withdrawal_limit']);
    }

    public function test_debt_does_not_automatically_reject_member(): void
    {
        // Member has active debt of 100.000, but SHU is 500.000 -> Eligible 400.000
        $anggota = $this->makeAnggota(500000.0, 100000.0);
        $result = $this->action->execute($anggota, 30000.0);

        $this->assertTrue($result['is_eligible'], 'Member with debt must NOT be rejected if SHU > Hutang');
        $this->assertEquals(400000.0, $result['eligible_shu']);
        $this->assertEquals(100000.0, $result['final_withdrawal_limit']);
    }

    public function test_debt_exceeding_or_equal_to_shu_yields_zero_limit(): void
    {
        // SHU 100k, Hutang 150k -> Eligible 0 -> Limit 0
        $anggota = $this->makeAnggota(100000.0, 150000.0);
        $result = $this->action->execute($anggota, 50000.0);

        $this->assertFalse($result['is_eligible']);
        $this->assertEquals(0.0, $result['eligible_shu']);
        $this->assertEquals(0.0, $result['final_withdrawal_limit']);
        $this->assertStringContainsString('habis terbebani oleh tagihan hutang', $result['reason']);

        // Exact equal: SHU 200k, Hutang 200k
        $anggotaEqual = $this->makeAnggota(200000.0, 200000.0);
        $resultEqual = $this->action->execute($anggotaEqual, 50000.0);
        $this->assertFalse($resultEqual['is_eligible']);
        $this->assertEquals(0.0, $resultEqual['final_withdrawal_limit']);
    }

    public function test_zero_shu_yields_zero_limit(): void
    {
        $anggota = $this->makeAnggota(0.0, 0.0);
        $result = $this->action->execute($anggota, 50000.0);

        $this->assertFalse($result['is_eligible']);
        $this->assertEquals(0.0, $result['final_withdrawal_limit']);
        $this->assertStringContainsString('Rp 0', $result['reason']);
    }

    public function test_rounding_cases_demonstrate_floor_to_thousands(): void
    {
        $cases = [
            // [shu, hutang, expected_floor]
            [55555.0, 0.0, 27000.0],   // 27.777,50 -> 27.000
            [199999.0, 0.0, 99000.0],  // 99.999,50 -> 99.000
            [200000.0, 0.0, 100000.0], // 100.000 -> 100.000
            [55998.0, 0.0, 27000.0],   // 27.999 -> 27.000
            [60000.0, 0.0, 30000.0],   // 30.000 -> 30.000
            [1500.0, 0.0, 0.0],        // 750 -> 0 (below 1.000)
            [2000.0, 0.0, 1000.0],     // 1.000 -> 1.000
        ];

        foreach ($cases as [$shu, $hutang, $expectedFloor]) {
            $anggota = $this->makeAnggota($shu, $hutang);
            $res = $this->action->execute($anggota, 30000.0);
            $this->assertEquals($expectedFloor, $res['final_withdrawal_limit'], "Failed rounding case for SHU {$shu}, Hutang {$hutang}");
        }
    }

    public function test_withdrawal_limit_is_not_derived_from_2x_belanja(): void
    {
        // Belanja is 25.001. Under old 2x rule, limit would be 50.002.
        // Under new rule with SHU 500.000, limit is 100.000!
        $anggota = $this->makeAnggota(500000.0, 0.0);
        $result = $this->action->execute($anggota, 25001.0);

        $this->assertEquals(100000.0, $result['final_withdrawal_limit']);
        $this->assertNotEquals(50002.0, $result['final_withdrawal_limit']);
    }
}
