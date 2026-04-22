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
        Schema::create('surfaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('location');
            $table->decimal('width', 8, 2);
            $table->decimal('length', 8, 2);
            $table->enum('soil_type', ['clay', 'sandy', 'loamy', 'silty', 'peaty', 'chalky', 'other']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surfaces');
    }
};
