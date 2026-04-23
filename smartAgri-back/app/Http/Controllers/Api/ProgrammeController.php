<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Programme;
use Illuminate\Http\Request;

class ProgrammeController extends Controller
{
    /**
     * PATCH /api/programmes/{id}/status
     * Body: { "status": "done" | "skipped" | "pending" }
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,done,skipped',
        ]);

        // Ensure the programme belongs to a planting owned by the authenticated user
        $programme = Programme::whereHas('programmable.surface', function ($q) {
            $q->where('user_id', auth()->id());
        })->findOrFail($id);

        $programme->update(['status' => $request->status]);

        return response()->json([
            'message'   => 'Programme status updated successfully',
            'programme' => $programme,
        ]);
    }
}
