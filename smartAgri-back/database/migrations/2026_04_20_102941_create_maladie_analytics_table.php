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
        Schema::create('maladie_analytics', function (Blueprint $table) {
            $table->id('idAnalytic');
            $table->string('image')->nullable();
            $table->string('maladieDisease');
            $table->double('confidence');
            $table->string('traitement');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->unsignedBigInteger('planting_id');
            $table->foreign('planting_id')->references('idPlanting')->on('plantings')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maladie_analytics');
    }
};
