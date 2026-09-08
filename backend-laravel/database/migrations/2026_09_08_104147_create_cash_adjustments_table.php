<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cash_adjustments')) {
            Schema::create('cash_adjustments', function (Blueprint $table) {
                $table->id('adjustment_id');
                $table->date('adjustment_date');
                $table->string('type'); // e.g. HISTORICAL_INVENTORY_PURCHASE, CASH_RECONCILIATION
                $table->decimal('amount', 15, 2);
                $table->string('direction', 50); // IN, OUT
                $table->string('source')->default('CASH'); // CASH, BANK
                $table->text('reason');
                $table->string('reference')->nullable();
                $table->string('status', 50)->default('APPROVED'); // DRAFT, APPROVED, REJECTED
                $table->integer('created_by')->index();
                $table->integer('approved_by')->nullable()->index();
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();

                $table->index('adjustment_date');
                $table->index('type');
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_adjustments');
    }
};
