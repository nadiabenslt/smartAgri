<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Planting\PlantingRequest;
use App\Models\Planting;

class PlantingController extends Controller
{
    // GET /api/plantings
    public function index()
    {
        $plantings = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->with(['surface', 'plante'])
            ->get();

        return response()->json([
            'plantings' => $plantings,
        ]);
    }

    // POST /api/plantings
    public function store(PlantingRequest $request)
    {
        $planting = Planting::create([
            'surface_id' => $request->surface_id,
            'plante_id'  => $request->plante_id,
            'quantity'   => $request->quantity,
            'start_date' => $request->start_date,
            'end_date'   => $request->end_date ?? null,
            'status'     => $request->status ?? 'pending',
        ]);

        return response()->json([
            'message'  => 'Planting created successfully',
            'planting' => $planting->load(['surface', 'plante']),
        ], 201);
    }

    // GET /api/plantings/{id}
    public function show($id)
    {
        $planting = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->with(['surface', 'plante', 'programmes'])
            ->findOrFail($id);

        return response()->json([
            'planting' => $planting,
        ]);
    }

    // PUT /api/plantings/{id}
    public function update(PlantingRequest $request, $id)
    {
        $planting = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->findOrFail($id);

        $planting->update([
            'surface_id' => $request->surface_id,
            'plante_id'  => $request->plante_id,
            'quantity'   => $request->quantity,
            'start_date' => $request->start_date,
            'end_date'   => $request->end_date ?? $planting->end_date,
            'status'     => $request->status ?? $planting->status,
        ]);

        return response()->json([
            'message'  => 'Planting updated successfully',
            'planting' => $planting->load(['surface', 'plante']),
        ]);
    }

    // DELETE /api/plantings/{id}
    public function destroy($id)
    {
        $planting = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->findOrFail($id);

        $planting->delete();

        return response()->json([
            'message' => 'Planting deleted successfully',
        ]);
    }
}
