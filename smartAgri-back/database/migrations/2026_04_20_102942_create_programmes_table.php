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
        Schema::create('programmes', function (Blueprint $table) {
        $table->id();
        $table->morphs('programmable'); // adds programmable_id + programmable_type
        $table->integer('day_number');
        $table->date('date');
        $table->json('recommendations');
        $table->enum('status', ['pending', 'done', 'skipped'])->default('pending');
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('programmes');
    }
};
