<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Http\Requests\Surface\SurfaceRequest;
use App\Models\Surface;
use Illuminate\Http\Request;

class SurfaceController extends Controller
{
    // GET /api/surfaces
    public function index()
    {
        $surfaces = Surface::where('user_id', auth()->id())->get();

        return response()->json([
            'surfaces' => $surfaces,
        ]);
    }

    // POST /api/surfaces
    public function store(SurfaceRequest $request)
    {
        $surface = Surface::create([
            'user_id'   => auth()->id(),
            'location'  => $request->location,
            'width'     => $request->width,
            'length'    => $request->length,
            'soil_type' => $request->soil_type,
        ]);

        return response()->json([
            'message' => 'Surface created successfully',
            'surface' => $surface,
        ], 201);
    }

    // GET /api/surfaces/{id}
    public function show($id)
    {
        $surface = Surface::where('user_id', auth()->id())
                          ->findOrFail($id);

        return response()->json([
            'surface' => $surface,
        ]);
    }

    // PUT /api/surfaces/{id}
    public function update(SurfaceRequest $request, $id)
    {
        $surface = Surface::where('user_id', auth()->id())
                          ->findOrFail($id);

        $surface->update([
            'location'  => $request->location,
            'width'     => $request->width,
            'length'    => $request->length,
            'soil_type' => $request->soil_type,
        ]);

        return response()->json([
            'message' => 'Surface updated successfully',
            'surface' => $surface,
        ]);
    }

    // DELETE /api/surfaces/{id}
    public function destroy($id)
    {
        $surface = Surface::where('user_id', auth()->id())
                          ->findOrFail($id);

        $surface->delete();

        return response()->json([
            'message' => 'Surface deleted successfully',
        ]);
    }
}