<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plante_maladies', function (Blueprint $table) {
            $table->string('plant_name')->nullable()->after('name');
            $table->text('symptoms')->nullable()->after('description');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('low')->after('symptoms');
            $table->integer('confidence')->default(0)->after('severity');
            $table->json('treatments')->nullable()->after('confidence');
            $table->json('prevention')->nullable()->after('treatments');
            $table->enum('analysis_status', ['active', 'follow_up', 'resolved'])->default('active')->after('treated');
            $table->date('follow_up_date')->nullable()->after('analysis_status');
        });
    }

    public function down(): void
    {
        Schema::table('plante_maladies', function (Blueprint $table) {
            $table->dropColumn([
                'plant_name', 'symptoms', 'severity', 'confidence',
                'treatments', 'prevention', 'analysis_status', 'follow_up_date',
            ]);
        });
    }
};
