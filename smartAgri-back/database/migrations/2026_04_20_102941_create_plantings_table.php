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
        Schema::create('plantings', function (Blueprint $table) {
            $table->id('idPlanting');
            $table->string('soilType');
            $table->string('surface');
            $table->string('location');
            $table->string('plante')->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->unsignedBigInteger('plante_id')->nullable();
            $table->foreign('plante_id')->references('idPlante')->on('plantes')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plantings');
    }
};
