<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PlantController;
use App\Http\Controllers\Api\SurfaceController;
use App\Http\Controllers\Api\PlantingController;

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

    Route::prefix('plants')->group(function () {
        Route::get('/',               [PlantController::class, 'index']);
        Route::post('/step/location', [PlantController::class, 'stepLocation']);
        Route::post('/step/soil',     [PlantController::class, 'stepSoil']);
        Route::post('/step/size',     [PlantController::class, 'stepSize']);
        Route::post('/step/plant',    [PlantController::class, 'stepPlant']);
    });
});
