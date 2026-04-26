<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PlantController;
use App\Http\Controllers\Api\SurfaceController;
use App\Http\Controllers\Api\PlantingController;
use App\Http\Controllers\Api\ProgrammeController;
use App\Http\Controllers\Api\DiseaseController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('surfaces', SurfaceController::class);
    Route::apiResource('plantings', PlantingController::class);

    Route::patch('/programmes/{id}/status', [ProgrammeController::class, 'updateStatus']);

    Route::post('/disease/analyze', [DiseaseController::class, 'analyze']);
    Route::get('/diseases', [DiseaseController::class, 'index']);
    Route::get('/diseases/{id}', [DiseaseController::class, 'show']);
    Route::post('/diseases/{id}/follow-up', [DiseaseController::class, 'followUp']);

    Route::prefix('plants')->group(function () {
        Route::get('/',               [PlantController::class, 'index']);
        Route::post('/step/location', [PlantController::class, 'stepLocation']);
        Route::post('/step/soil',     [PlantController::class, 'stepSoil']);
        Route::post('/step/size',     [PlantController::class, 'stepSize']);
        Route::post('/step/plant',    [PlantController::class, 'stepPlant']);
    });

    Route::get('/notifications', [App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
    
    Route::post('/fcm-token', [App\Http\Controllers\Api\DeviceController::class, 'updateFcmToken']);
});
