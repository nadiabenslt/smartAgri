<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('programmes', function (Blueprint $table) {
            // Add weather_summary after date column
            $table->string('weather_summary')->nullable()->after('date');
        });
 
        // Add growth_notes to plantings if not already present
        if (! Schema::hasColumn('plantings', 'growth_notes')) {
            Schema::table('plantings', function (Blueprint $table) {
                $table->text('growth_notes')->nullable()->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('programmes', function (Blueprint $table) {
            $table->dropColumn('weather_summary');
        });
 
        Schema::table('plantings', function (Blueprint $table) {
            $table->dropColumn('growth_notes');
        });
    }
};
