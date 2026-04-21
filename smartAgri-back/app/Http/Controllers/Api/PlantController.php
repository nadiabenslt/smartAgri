<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Plant\StepLocationRequest;
use App\Http\Requests\Plant\StepSoilRequest;
use App\Http\Requests\Plant\StepSizeRequest;
use App\Http\Requests\Plant\StepPlantRequest;
use App\Models\Planting;
use App\Services\GroqService;

class PlantController extends Controller
{
    protected GroqService $groq;

    public function __construct(GroqService $groq)
    {
        $this->groq = $groq;
    }

    // Step 1: Ask for location
    public function stepLocation(StepLocationRequest $request)
    {
        return response()->json([
            'step'    => 1,
            'message' => 'Location received. Now provide soil type.',
            'data'    => ['location' => $request->location],
            'next'    => [
                'step'    => 2,
                'url'     => '/api/plants/step/soil',
                'fields'  => ['soil_type' => 'sandy | clay | loamy | silty | peaty | chalky'],
            ],
        ]);
    }

    // Step 2: Ask for soil type
    public function stepSoil(StepSoilRequest $request)
    {
        return response()->json([
            'step'    => 2,
            'message' => 'Soil type received. Now provide plant size.',
            'data'    => [
                'soilType' => $request->soilType,
            ],
            'next'    => [
                'step'   => 3,
                'url'    => '/api/plants/step/size',
                'fields' => ['surface' => 'small | medium | large'],
            ],
        ]);
    }

    // Step 3: Ask for size
    public function stepSize(StepSizeRequest $request)
    {
        return response()->json([
            'step'    => 3,
            'message' => 'Size received. Now provide the plant name.',
            'data'    => [
                'location'  => $request->location,
                'soilType' => $request->soilType,
                'surface'      => $request->surface,
            ],
            'next'    => [
                'step'   => 4,
                'url'    => '/api/plants/step/plant',
                'fields' => ['plante' => 'string'],
            ],
        ]);
    }

    // Step 4: Final step — save plant
    public function stepPlant(StepPlantRequest $request)
    {
        $plant = Planting::create([
            'user_id'    => $request->user()->id,
            'location'   => $request->location,
            'soilType'   => $request->soilType,
            'surface'    => $request->surface,
            'plante'     => $request->plante,
        ]);

        // Ask Groq for plant care tips in JSON format
        $tips = null;
        try {
            $raw  = $this->groq->ask(
                prompt: "Give me exactly 3 care tips for a {$request->plante} plant. 
                         It is {$request->surface} size, in {$request->soilType} soil, located in {$request->location}.
                         Respond ONLY with a valid JSON array, no extra text. Format:
                         [{\"tip\": \"...\", \"category\": \"watering|fertilizing|sunlight|pruning|soil\"}, ...]",
                systemPrompt: "You are a plant care expert. You ONLY respond with raw JSON arrays, no markdown, no explanation."
            );
            $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', trim($raw));
            $tips  = json_decode($clean, true) ?? $raw;
        } catch (\Exception $e) {
            \Log::error('Groq care_tips failed: ' . $e->getMessage());
        }

        // Ask Groq for a 7-day watering & fertilizing program
        $program = null;
        try {
            $rawProgram = $this->groq->ask(
                prompt: "Create a 7-day watering and fertilizing program for a {$request->plante} plant.
                         It is {$request->surface} size, in {$request->soilType} soil, located in {$request->location}.
                         Respond ONLY with a valid JSON array of 7 objects, one per day. No extra text. Format:
                         [{\"day\": \"Monday\", \"watering\": {\"required\": true|false, \"amount\": \"e.g. 200ml\", \"time\": \"morning|evening\"}, \"fertilizing\": {\"required\": true|false, \"type\": \"e.g. liquid NPK\", \"note\": \"...\"}}, ...]",
                systemPrompt: "You are a plant care expert. You ONLY respond with raw JSON arrays, no markdown, no explanation."
            );
            $cleanProgram = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', trim($rawProgram));
            $program      = json_decode($cleanProgram, true) ?? $rawProgram;
        } catch (\Exception $e) {
            \Log::error('Groq program failed: ' . $e->getMessage());
        }

        return response()->json([
            'step'             => 4,
            'message'          => 'Plant added successfully!',
            'plant'            => $plant,
            'care_tips'        => $tips,
            'weekly_program'   => $program,
        ], 201);
    }

    // Get all plants for authenticated user
    public function index()
    {
        $plants = Planting::where('user_id', auth()->id())->get();

        return response()->json([
            'plants' => $plants,
        ]);
    }
}
